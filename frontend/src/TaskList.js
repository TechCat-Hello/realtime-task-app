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

  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const me = localStorage.getItem("username");
  const isAdmin = localStorage.getItem("is_staff") === "true";

  // =========================
  // 初回ロード
  // =========================
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

  // =========================
  // WebSocket
  // =========================
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/tasks/");

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

  // =========================
  // 追加
  // =========================
  const handleAddTask = () => {
    if (!newTask) return;

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

  // =========================
  // タイトル保存
  // =========================
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

  // =========================
  // Drag & Drop
  // =========================
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

    // ========== ユーザー権限ロジック ==========
    // オーナー (作成者) は自由に移動可能
    const isOwner = task.username === me;

    // オーナーでなく、かつ管理者でもない場合は移動不可
    if (!isOwner && !isAdmin) {
      alert("このタスクは移動できません");
      return;
    }

    // 管理者が他ユーザーのタスクを別カラムへ移動しようとしている場合は不可
    if (isAdmin && !isOwner && source.droppableId !== destination.droppableId) {
      alert("管理者は他ユーザーのタスクを別ステータスへ移動できません");
      return;
    }

    // ===== ここまで来たら移動OK =====

    // ===== フロント側の並び替え反映 =====
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

    // ===== サーバーへ送信 =====
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

        // サーバーが本当にエラーのときだけ表示
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

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <Stack direction="row" justifyContent="space-between" mb={2}>
        <Typography variant="h4">Task Board</Typography>
        <Button color="error" onClick={onLogout}>
          Logout
        </Button>
      </Stack>

      <Card sx={{ mb: 3, p: 2 }}>
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            label="New Task"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
          />
          <Button variant="contained" onClick={handleAddTask}>
            Add
          </Button>
        </Stack>
      </Card>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Stack direction="row" spacing={2}>
          {columns.map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided) => (
                <Paper
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{ p: 2, flex: 1, minHeight: 500 }}
                >
                  <Typography align="center" sx={{ mb: 2 }}>
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
                                mb: 2,
                                backgroundColor: TASK_COLORS[task.status],
                                overflow: "hidden",
                              }}
                            >
                              <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                                <Stack direction="row" alignItems="stretch">
                                  <Box
                                    sx={{
                                      minWidth: 48,
                                      width: 48,
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

                                  <Stack sx={{ p: 2, flexGrow: 1 }}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
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
                                        style={{
                                          cursor:
                                            task.username === me
                                              ? "pointer"
                                              : "default",
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
      </DragDropContext>
    </div>
  );
}

export default TaskList;






