import { useState } from "react";
import axios from "axios";
import api from "./api";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post(
        "http://localhost:8000/api/token/",
        {
          username,
          password,
        },
        {
          headers: { "Content-Type": "application/json" },
        }
      );

      localStorage.setItem("accessToken", res.data.access);
      localStorage.setItem("refreshToken", res.data.refresh);
      // ★ 追加：ログインしたユーザー名を保存
      localStorage.setItem("username", username);

      // ★ 追加：サーバーから追加ユーザー情報（is_staff 等）を取得して保存
      try {
        const me = await api.get("me/");
        localStorage.setItem("is_staff", String(me.data.is_staff));
      } catch (err) {
        // 失敗してもログイン自体は成功させる
        console.warn("failed to fetch current user info", err);
      }

      onLogin(); // ログイン成功通知
    } catch (err) {
      setError("ログインに失敗しました");
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h2>ログイン</h2>

      <input
        type="text"
        placeholder="ユーザー名"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        placeholder="パスワード"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit">ログイン</button>

      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}

export default Login;
