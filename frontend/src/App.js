import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:8000/api/tasks/")
      .then((res) => {
        setTasks(res.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Task List</h1>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>{task.title} - {task.completed ? "✔" : "✖"}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;

