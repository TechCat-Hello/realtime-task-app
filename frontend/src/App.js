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
    const newStatus = task.status === "done" ? "todo" : "done";

    axios
      .patch(`http://localhost:8000/api/tasks/${task.id}/`, {
        status: newStatus,
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

  const getStatusMark = (status) => {
    switch (status) {
      case "todo":
      case "in_progress":
        return "✖";
      case "done":
        return "✔";
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
          <ListItem
            key={task.id}
            divider
            secondaryAction={
              <IconButton edge="end" color="error" onClick={() => deleteTask(task.id)}>
                <DeleteIcon />
              </IconButton>
            }
          >
            <Checkbox
              checked={task.status === "done"}
              onChange={() => toggleTask(task)}
            />
            <ListItemText
              primary={task.title}
              secondary={getStatusMark(task.status)}
            />
          </ListItem>
        ))}
      </List>
    </div>
  );
}

export default App;




