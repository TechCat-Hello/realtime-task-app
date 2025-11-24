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
  Divider
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom"; // 進行中 ⏳
import CheckCircleIcon from "@mui/icons-material/CheckCircle"; // 完了 ✔
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked"; // 未着手 ○

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
          <>
            <RadioButtonUncheckedIcon sx={{ mr: 1 }} /> To Do
          </>
        );
      case "in_progress":
        return (
          <>
            <HourglassBottomIcon sx={{ mr: 1 }} /> In Progress
          </>
        );
      case "done":
        return (
          <>
            <CheckCircleIcon sx={{ mr: 1 }} /> Done
          </>
        );
      default:
        return "";
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: 700, margin: "0 auto" }}>
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

      {/* タスクカード一覧 */}
      <Stack spacing={2}>
        {tasks.map((task) => (
          <Card key={task.id} sx={{ boxShadow: 3 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Checkbox
                    checked={task.status === "done"}
                    onChange={() => toggleTask(task)}
                  />

                  <Box>
                    <Typography variant="h6">{task.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {getStatusDisplay(task.status)}
                    </Typography>
                  </Box>
                </Stack>

                <IconButton color="error" onClick={() => deleteTask(task.id)}>
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </div>
  );
}

export default App;






