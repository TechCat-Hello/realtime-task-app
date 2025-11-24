import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  // 初期データ取得
  useEffect(() => {
    axios.get("http://localhost:8000/api/tasks/")
      .then((res) => {
        setTasks(res.data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  // Task追加処理
  const handleAddTask = () => {
    if (!newTask) return;  // 未入力は無視

    axios.post("http://localhost:8000/api/tasks/", {
      title: newTask,
      completed: false,
    })
      .then((res) => {
        setTasks([...tasks, res.data]);  // 既存配列に追加
        setNewTask("");  // 入力欄をリセット
      })
      .catch((err) => console.error(err));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Task List</h1>

      {/* Task追加フォーム */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New Task..."
        />
        <button onClick={handleAddTask}>Add</button>
      </div>

      {/* Task一覧 */}
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            {task.title} - {task.completed ? "✔" : "✖"}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
