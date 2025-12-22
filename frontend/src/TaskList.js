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
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

/* =========================
   status → カード色
========================= */
const TASK_COLORS = {
  todo: "#e3f2fd",
  in_progress: "#fff9c4",
  done: "#e8f5e9",
};

function TaskList({ onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  /* =========================
     初回ロード（JWT付き）
  ========================= */
  useEffect(() => {
    api
      .get("tasks/")
      .then((res) => setTasks(res.data))
      .catch((err) => {
        console.error(err);
        onLogout();
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      });
  }, [onLogout]);

  /* =========================
     WebSocket
  ========================= */
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/tasks/");

    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === "task_update") {
        setTasks((prev) => {
          const exists = prev.find((t) => t.id === data.task.id);
          return exists
            ? prev.map((t) => (t.id === data.task.id ? data.task : t))
            : [...prev, data.task];
        });
      }

      if (data.type === "task_delete") {
        setTasks((prev) => prev.filter((t) => t.id !== data.task_id));
      }

      if (data.type === "task_bulk_update") {
        setTasks(data.tasks);
      }
    };

    return () => ws.close();
  }, []);

  /* =========================
     追加
  ========================= */
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

  /* =========================
     削除
  ========================= */
  const deleteTask = (id) => {
    api.delete(`tasks/${id}/`);
  };

  /* =========================
     並び替え
  ========================= */
  const handleDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    api.post("tasks/reorder/", {
      task_id: Number(draggableId),
      status: destination.droppableId,
      order: destination.index,
    });
  };

  /* =========================
     表示用
  ========================= */
  const getStatusDisplay = (status) => {
    if (status === "todo")
      return (
        <Stack direction="row" spacing={0.5}>
          <RadioButtonUncheckedIcon fontSize="small" />
          <Typography>To Do</Typography>
        </Stack>
      );
    if (status === "in_progress")
      return (
        <Stack direction="row" spacing={0.5}>
          <HourglassBottomIcon fontSize="small" />
          <Typography>In Progress</Typography>
        </Stack>
      );
    if (status === "done")
      return (
        <Stack direction="row" spacing={0.5}>
          <CheckCircleIcon fontSize="small" />
          <Typography>Done</Typography>
        </Stack>
      );
    return null;
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
        <Button
          color="error"
          onClick={() => {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            onLogout();
          }}
        >
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
                    .map((task, index) => (
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
                            }}
                          >
                            <CardContent>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                              >
                                {/* 👇 ユーザー名を表示 */}
                                <Stack spacing={0.5}>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    @{task.username}
                                  </Typography>

                                  <Stack direction="row" spacing={1}>
                                    {getStatusDisplay(task.status)}
                                    <Typography>{task.title}</Typography>
                                  </Stack>
                                </Stack>

                                <IconButton
                                  onClick={() => deleteTask(task.id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Stack>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}

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

