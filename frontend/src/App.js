import { useState, useEffect } from "react";
import Login from "./Login";
import TaskList from "./TaskList";
import ResetPassword from "./ResetPassword";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [resetParams, setResetParams] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    setIsLoggedIn(!!token);

    const params = new URLSearchParams(window.location.search);
    const uid = params.get("reset_uid");
    const resetToken = params.get("reset_token");
    if (uid && resetToken) {
      setResetParams({ uid, token: resetToken });
    }
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setIsLoggedIn(false);
  };

  const handleResetDone = () => {
    setResetParams(null);
    window.history.replaceState({}, "", window.location.pathname);
  };

  if (resetParams) {
    return <ResetPassword uid={resetParams.uid} token={resetParams.token} onDone={handleResetDone} />;
  }

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

