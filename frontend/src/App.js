import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = () => {
    axios.get("http://localhost:8000/api/tasks/")
      .then((res) => setTasks(res.data))
      .catch((err) => console.error(err));
  };

  const handleAddTask = () => {
    if (!newTask) return;

    axios.post("http://localhost:8000/api/tasks/", {
      title: newTask,
      status: "todo", // <- ここを status で送る
    })
      .then(() => fetchTasks())
      .catch((err) => console.error(err));

    setNewTask("");
  };

  const toggleTask = (task) => {
    // チェックボックスで status を切り替え
    const newStatus = task.completed ? "in_progress" : "done";

    axios.patch(`http://localhost:8000/api/tasks/${task.id}/`, {
      status: newStatus, // <- ここを status で送る
    })
      .then(() => fetchTasks())
      .catch((err) => console.error(err));
  };

  const deleteTask = (id) => {
    axios.delete(`http://localhost:8000/api/tasks/${id}/`)
      .then(() => fetchTasks())
      .catch((err) => console.error(err));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Task List</h1>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          value={newTask}
          placeholder="New task..."
          onChange={(e) => setNewTask(e.target.value)}
        />
        <button onClick={handleAddTask}>Add</button>
      </div>

      <ul>
        {tasks.map((task) => (
          <li key={task.id} style={{ marginBottom: "10px" }}>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => toggleTask(task)}
              style={{ marginRight: "10px" }}
            />
            {task.title}
            <span style={{ marginLeft: "10px", fontWeight: "bold" }}>
              {task.completed ? "✔" : "✖"}
            </span>
            <button
              onClick={() => deleteTask(task.id)}
              style={{ marginLeft: "10px", color: "red" }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;

