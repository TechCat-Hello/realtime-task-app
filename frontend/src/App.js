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

import {
  DragDropContext,
  Droppable,
  Draggable
} from "@hello-pangea/dnd";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = () => {
    axios
      .get("http://localhost:8000/api/tasks/")
      .then((res) => setTasks(res.data))
      .catch((err) => console.error(err));
  };

  const handleAddTask = () => {
    if (!newTask) return;
    axios
      .post("http://localhost:8000/api/tasks/", {
        title: newTask,
        status: "todo",
      })
      .then(() => fetchTasks())
      .catch((err) => console.error(err));

    setNewTask("");
  };

  const toggleTask = (task) => {
    const order = ["todo", "in_progress", "done"];
    const nextStatus = order[(order.indexOf(task.status) + 1) % order.length];

    axios
      .patch(`http://localhost:8000/api/tasks/${task.id}/`, {
        status: nextStatus,
      })
      .then(() => fetchTasks())
      .catch((err) => console.error(err));
  };

  const deleteTask = (id) => {
    axios
      .delete(`http://localhost:8000/api/tasks/${id}/`)
      .then(() => fetchTasks())
      .catch((err) => console.error(err));
  };

  const getStatusDisplay = (status) => {
    switch (status) {
      case "todo":
        return (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <RadioButtonUncheckedIcon fontSize="small" />
            <Typography variant="body2">To Do</Typography>
          </Stack>
        );
      case "in_progress":
        return (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <HourglassBottomIcon fontSize="small" />
            <Typography variant="body2">In Progress</Typography>
          </Stack>
        );
      case "done":
        return (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <CheckCircleIcon fontSize="small" />
            <Typography variant="body2">Done</Typography>
          </Stack>
        );
      default:
        return null;
    }
  };

  const getCardColor = (status) => {
    switch (status) {
      case "todo":
        return "#e0e0e0";
      case "in_progress":
        return "#fff59d";
      case "done":
        return "#c8e6c9";
      default:
        return "white";
    }
  };

  // Kanban形式用のhandleDragEnd
  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const taskId = parseInt(draggableId);
    const task = tasks.find((t) => t.id === taskId);

    // 列を移動した場合はstatusを更新
    const newStatus = destination.droppableId;

    if (task.status !== newStatus) {
      axios
        .patch(`http://localhost:8000/api/tasks/${task.id}/`, {
          status: newStatus,
        })
        .then(() => fetchTasks())
        .catch((err) => console.error(err));
    }
  };

  const columns = [
    { id: "todo", title: "To Do" },
    { id: "in_progress", title: "In Progress" },
    { id: "done", title: "Done" },
  ];

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
      <Typography variant="h4" gutterBottom align="center">
        Task Board
      </Typography>

      {/* 新規タスク追加 */}
      <Card sx={{ mb: 3, p: 2 }}>
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            label="New Task"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
          />
          <Button variant="contained" color="primary" onClick={handleAddTask}>
            Add
          </Button>
        </Stack>
      </Card>

      <DragDropContext onDragEnd={handleDragEnd}>
        <Stack direction="row" spacing={2} justifyContent="space-between">
          {columns.map((column) => (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <Paper
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  sx={{
                    p: 2,
                    flex: 1,
                    minHeight: 500,
                    backgroundColor: snapshot.isDraggingOver ? "#e3f2fd" : "#f5f5f5",
                  }}
                >
                  <Typography variant="h6" align="center" sx={{ mb: 2 }}>
                    {column.title}
                  </Typography>

                  {tasks
                    .filter((task) => task.status === column.id)
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
                              backgroundColor: getCardColor(task.status),
                            }}
                          >
                            <CardContent>
                              <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                              >
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Checkbox
                                    checked={task.status === "done"}
                                    onChange={() => toggleTask(task)}
                                  />
                                  <Box>{getStatusDisplay(task.status)}</Box>
                                  <Typography variant="body1">{task.title}</Typography>
                                </Stack>
                                <IconButton color="error" onClick={() => deleteTask(task.id)}>
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










