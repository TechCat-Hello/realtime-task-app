import { useEffect, useState } from "react";
import axios from "axios";
import {
  TextField,
  Button,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Stack,
  Typography
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom"; // 進行中 ⏳
import CheckCircleIcon from "@mui/icons-material/CheckCircle";          // 完了 ✔
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

  // --- 3段階ステータス切替 ---
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
        return <> <RadioButtonUncheckedIcon style={{ marginRight: 4 }} /> To Do </>;
      case "in_progress":
        return <> <HourglassBottomIcon style={{ marginRight: 4 }} /> In Progress </>;
      case "done":
        return <> <CheckCircleIcon style={{ marginRight: 4 }} /> Done </>;
      default:
        return "";
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: 600, margin: "0 auto" }}>
      <Typography variant="h4" gutterBottom>
        Task List
      </Typography>

      {/* 新規タスク追加 */}
      <Stack direction="row" spacing={2} mb={3}>
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

      {/* タスクリスト */}
      <List>
        {tasks.map((task) => (
          <ListItem key={task.id} divider>
            <Checkbox
              checked={task.status === "done"}
              onChange={() => toggleTask(task)}
            />
            <ListItemText
              primary={task.title}
              secondary={getStatusDisplay(task.status)}
            />
            <IconButton
              edge="end"
              color="error"
              onClick={() => deleteTask(task.id)}
            >
              <DeleteIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>
    </div>
  );
}

export default App;





