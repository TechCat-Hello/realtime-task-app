import { useState, useEffect } from "react";
import Login from "./Login";
import TaskList from "./TaskList";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 🔑 初回表示時に localStorage を確認
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    setIsLoggedIn(!!token);
  }, []);

  // 🔓 ログイン成功時
  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  // 🚪 ログアウト時
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setIsLoggedIn(false);
  };

  return (
    <div>
      {isLoggedIn ? (
        <TaskList onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;

