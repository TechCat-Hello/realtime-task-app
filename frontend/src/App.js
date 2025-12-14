import { useEffect, useState } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Checkbox,
  Stack,
  Typography,
  Card,
  CardContent,
  IconButton,
  Box,
  Paper,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  /* =========================
     初回ロード（REST）
  ========================= */
  useEffect(() => {
    axios
      .get("http://localhost:8000/api/tasks/")
      .then((res) => setTasks(res.data))
      .catch(console.error);
  }, []);

  /* =========================
     WebSocket（同期専用）
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
    };

    return () => ws.close();
  }, []);

  /* =========================
     CRUD（Optimistic）
  ========================= */
  const handleAddTask = () => {
    if (!newTask) return;

    axios.post("http://localhost:8000/api/tasks/", {
      title: newTask,
      status: "todo",
    });

    setNewTask("");
  };

  const toggleTask = (task) => {
    const order = ["todo", "in_progress", "done"];
    const nextStatus = order[(order.indexOf(task.status) + 1) % order.length];

    // 即時UI更新
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: nextStatus } : t
      )
    );

    axios.patch(`http://localhost:8000/api/tasks/${task.id}/`, {
      status: nextStatus,
    });
  };

  const deleteTask = (id) => {
    // 即時UI更新
    setTasks((prev) => prev.filter((t) => t.id !== id));
    axios.delete(`http://localhost:8000/api/tasks/${id}/`);
  };

  /* =========================
     表示用
  ========================= */
  const getStatusDisplay = (status) => {
    switch (status) {
      case "todo":
        return (
          <Stack direction="row" spacing={0.5}>
            <RadioButtonUncheckedIcon fontSize="small" />
            <Typography>To Do</Typography>
          </Stack>
        );
      case "in_progress":
        return (
          <Stack direction="row" spacing={0.5}>
            <HourglassBottomIcon fontSize="small" />
            <Typography>In Progress</Typography>
          </Stack>
        );
      case "done":
        return (
          <Stack direction="row" spacing={0.5}>
            <CheckCircleIcon fontSize="small" />
            <Typography>Done</Typography>
          </Stack>
        );
      default:
        return null;
    }
  };

  const getCardColor = (status) => {
    if (status === "todo") return "#e0e0e0";
    if (status === "in_progress") return "#fff59d";
    if (status === "done") return "#c8e6c9";
    return "white";
  };

  /* =========================
     DnD（Optimistic）
  ========================= */
  const handleDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const taskId = parseInt(draggableId);

    // 即時UI更新
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: destination.droppableId }
          : t
      )
    );

    axios.patch(`http://localhost:8000/api/tasks/${taskId}/`, {
      status: destination.droppableId,
    });
  };

  const columns = [
    { id: "todo", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "done", title: "Done" },
  ];

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: "0 auto" }}>
      <Typography variant="h4" align="center" gutterBottom>
        Task Board
      </Typography>

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
                            sx={{ mb: 2, backgroundColor: getCardColor(task.status) }}
                          >
                            <CardContent>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                              >
                                <Stack direction="row" spacing={1}>
                                  <Checkbox
                                    checked={task.status === "done"}
                                    onChange={() => toggleTask(task)}
                                  />
                                  {getStatusDisplay(task.status)}
                                  <Typography>{task.title}</Typography>
                                </Stack>
                                <IconButton onClick={() => deleteTask(task.id)}>
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

export default App;
