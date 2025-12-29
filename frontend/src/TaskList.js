import { useEffect, useState } from "react";
import api from "./api";

import {
  TextField,
  Button,
  Stack,
  Typography,
  Card,
  CardContent,
  IconButton,
  Paper,
  Box,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const TASK_COLORS = {
  todo: "#e3f2fd",
  in_progress: "#fff9c4",
  done: "#e8f5e9",
};

const STATUS_CONFIG = {
  todo: { color: "#2196f3", icon: <RadioButtonUncheckedIcon fontSize="small" /> },
  in_progress: { color: "#f9a825", icon: <HourglassBottomIcon fontSize="small" /> },
  done: { color: "#2e7d32", icon: <CheckCircleIcon fontSize="small" /> },
};

function TaskList({ onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [addError, setAddError] = useState("");

  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const me = localStorage.getItem("username");
  const isAdmin = localStorage.getItem("is_staff") === "true";

  useEffect(() => {
    api
      .get("tasks/")
      .then((res) => setTasks(res.data))
      .catch(() => {
        onLogout();
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      });
  }, [onLogout]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const wsUrl = `wss://realtime-task-app-backend.onrender.com/ws/tasks/?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "task_update") {
        setTasks((prev) =>
          prev.some((t) => t.id === data.task.id)
            ? prev.map((t) => (t.id === data.task.id ? data.task : t))
            : [...prev, data.task]
        );
      }

      if (data.type === "task_delete") {
        setTasks((prev) => prev.filter((t) => t.id !== data.task_id));
      }

      if (data.type === "task_bulk_update") {
        setTasks((prev) => {
          const updatedTaskIds = new Set(data.tasks.map((t) => t.id));
          const unchanged = prev.filter((t) => !updatedTaskIds.has(t.id));
          return [...unchanged, ...data.tasks];
        });
      }
    };

    return () => ws.close();
  }, []);

  const handleAddTask = () => {
    if (!newTask || !newTask.trim()) {
      setAddError("タスク名を入力してください");
      return;
    }

    const order = tasks.filter((t) => t.status === "todo").length;

    api.post("tasks/", {
      title: newTask,
      status: "todo",
      order,
    });

    setNewTask("");
  };

  const deleteTask = (id) => {
    api
      .delete(`tasks/${id}/`)
      .catch((err) => {
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.error ||
          "タスクを削除できません";
        alert(msg);
      });
  };

  const saveTitle = (task) => {
    if (!editingTitle.trim()) {
      setEditingId(null);
      return;
    }

    api
      .put(`tasks/${task.id}/`, {
        ...task,
        title: editingTitle,
      })
      .catch(() => {
        alert("このタスクは編集できません");
      });

    setEditingId(null);
  };

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const taskId = Number(draggableId);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isOwner = task.username === me;

    if (!isOwner && !isAdmin) {
      alert("このタスクは移動できません");
      return;
    }

    if (isAdmin && !isOwner && source.droppableId !== destination.droppableId) {
      alert("管理者は他ユーザーのタスクを別ステータスへ移動できません");
      return;
    }

    setTasks((prev) => {
      const all = [...prev];
      const movedTask = all.find((t) => t.id === taskId);
      if (!movedTask) return prev;

      const sourceTasks = all
        .filter((t) => t.status === source.droppableId && t.id !== taskId)
        .sort((a, b) => a.order - b.order);

      const destinationTasks =
        source.droppableId === destination.droppableId
          ? sourceTasks
          : all
              .filter((t) => t.status === destination.droppableId)
              .sort((a, b) => a.order - b.order);

      destinationTasks.splice(destination.index, 0, {
        ...movedTask,
        status: destination.droppableId,
      });

      destinationTasks.forEach((t, i) => (t.order = i));
      sourceTasks.forEach((t, i) => (t.order = i));

      return all.map((t) => {
        const updated =
          destinationTasks.find((d) => d.id === t.id) ||
          sourceTasks.find((s) => s.id === t.id);
        return updated ? { ...t, ...updated } : t;
      });
    });

    api
      .post("tasks/reorder/", {
        task_id: taskId,
        status: destination.droppableId,
        order: destination.index,
      })
      .catch((err) => {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          "";

        if (msg) {
          alert(msg);
        }
      });
  };

  const columns = [
    { id: "todo", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "done", title: "Done" },
  ];

  // 集計: Statusごとの件数（レンダリングごとに計算）
  const statusCounts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };
  const totalCount = statusCounts.todo + statusCounts.in_progress + statusCounts.done;

  return (
    <div style={{ padding: "8px 12px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" mb={2} spacing={1}>
        <Typography variant="h4" sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>Task Board</Typography>
        <Button color="error" onClick={onLogout} size="small">
          Logout
        </Button>
      </Stack>

      <Card sx={{ mb: 3, p: { xs: 1.5, sm: 2 } }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <TextField
            fullWidth
            label="New Task"
            value={newTask}
            onChange={(e) => {
              setNewTask(e.target.value);
              if (addError) setAddError("");
            }}
            error={Boolean(addError)}
            helperText={addError || ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTask();
              }
            }}
            size="small"
          />
          <Button variant="contained" onClick={handleAddTask} sx={{ width: { xs: "100%", sm: "auto" } }}>
            Add
          </Button>
        </Stack>
      </Card>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="stretch" sx={{ width: '100%' }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flex: '1 1 0', width: '100%' }}>
            {columns.map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided) => (
                <Paper
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    p: { xs: 1, sm: 2 },
                    flex: '1 1 0',
                    minHeight: { xs: 300, sm: 500 },
                    // モバイルではカラム内をスクロール可能にする
                    maxHeight: { xs: '60vh', sm: 'none' },
                    overflowY: { xs: 'auto', sm: 'visible' },
                    WebkitOverflowScrolling: { xs: 'touch', sm: 'auto' },
                  }}
                >
                                  <Typography align="center" sx={{ mb: 2, fontSize: { xs: "0.875rem", sm: "1rem" } }}>
                    {column.title}
                  </Typography>

                  {tasks
                    .filter((t) => t.status === column.id)
                    .sort((a, b) => a.order - b.order)
                    .map((task, index) => {
                      const status = STATUS_CONFIG[task.status];

                      return (
                        <Draggable
                          key={task.id}
                          draggableId={String(task.id)}
                          index={index}
                        >
                          {(provided) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              sx={{
                                mb: 1,
                                backgroundColor: TASK_COLORS[task.status],
                                overflow: "hidden",
                              }}
                            >
                              <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                                <Stack direction="row" alignItems="stretch">
                                  <Box
                                    sx={{
                                      minWidth: { xs: 40, sm: 48 },
                                      width: { xs: 40, sm: 48 },
                                      flexShrink: 0,
                                      backgroundColor: status.color,
                                      color: "#fff",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      alignSelf: "stretch",
                                    }}
                                  >
                                    {status.icon}
                                  </Box>

                                  <Stack sx={{ p: { xs: 1, sm: 2 }, flexGrow: 1 }}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}
                                    >
                                      @{task.username}
                                    </Typography>

                                    {editingId === task.id ? (
                                      <TextField
                                        value={editingTitle}
                                        size="small"
                                        onChange={(e) => setEditingTitle(e.target.value)}
                                        onBlur={() => saveTitle(task)}
                                        autoFocus
                                      />
                                    ) : (
                                      <Typography
                                        fontWeight={500}
                                        onClick={() => {
                                          if (task.username !== me) {
                                            alert("このタスクは編集できません");
                                            return;
                                          }
                                          setEditingId(task.id);
                                          setEditingTitle(task.title);
                                        }}
                                        sx={{
                                          cursor:
                                            task.username === me
                                              ? "pointer"
                                              : "default",
                                          fontSize: { xs: "0.875rem", sm: "1rem" },
                                          wordBreak: "break-word",
                                        }}
                                      >
                                        {task.title}
                                      </Typography>
                                    )}
                                  </Stack>

                                  <IconButton
                                    onClick={() => deleteTask(task.id)}
                                    size="small"
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Stack>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      );
                    })}

                  {provided.placeholder}
                </Paper>
              )}
            </Droppable>
            ))}
          </Stack>

          {/* サイドバー: Status別の棒グラフ */}
          <Paper sx={{ width: { xs: '100%', md: 320 }, p: { xs: 1.5, sm: 2 }, ml: { xs: 0, md: 1 }, order: { xs: -1, md: 0 } }}>
            <Typography variant="h6" align="center" sx={{ mb: 1, fontSize: { xs: '0.95rem', sm: '1rem' } }}>
              Status Overview
            </Typography>

            {Object.keys(STATUS_CONFIG).map((key) => {
              const count = statusCounts[key] || 0;
              const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
              const conf = STATUS_CONFIG[key];
              return (
                <Box key={key} sx={{ mb: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontSize: { xs: '0.75rem', sm: '0.9rem' } }}>{columns.find(c => c.id===key)?.title || key}</Typography>
                    <Typography variant="caption" sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>{count} ({percent}%)</Typography>
                  </Stack>

                  <Box sx={{ height: { xs: 8, sm: 12 }, backgroundColor: '#eee', borderRadius: 1, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${percent}%`, backgroundColor: conf.color }} />
                  </Box>
                </Box>
              );
            })}
          </Paper>
        </Stack>
      </DragDropContext>
    </div>
  );
}

export default TaskList;

