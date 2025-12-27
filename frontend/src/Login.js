import { useState } from "react";
import api from "./api";

import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openSignUp, setOpenSignUp] = useState(false);
  const [signUsername, setSignUsername] = useState("");
  const [signPassword, setSignPassword] = useState("");
  const [signPasswordConfirm, setSignPasswordConfirm] = useState("");
  const [signError, setSignError] = useState("");
  const [signLoading, setSignLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("token/", { username, password });

      localStorage.setItem("accessToken", res.data.access);
      localStorage.setItem("refreshToken", res.data.refresh);
      localStorage.setItem("username", username);

      try {
        const me = await api.get("me/");
        localStorage.setItem("is_staff", String(me.data.is_staff));
      } catch (err) {
        console.warn("failed to fetch current user info", err);
      }

      onLogin();
    } catch (err) {
      setError("ユーザー名かパスワードが正しくありません");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
      <Paper elevation={6} sx={{ p: 4, borderRadius: 2 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: "primary.main" }}>
            <LockOutlinedIcon />
          </Avatar>
          <Typography component="h1" variant="h5">
            サインイン
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: "100%", mt: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 2, width: "100%" }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="ユーザー名"
              name="username"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="パスワード"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <FormControlLabel
              control={<Checkbox value="remember" color="primary" />}
              label="ログイン情報を保存"
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ mt: 2, mb: 1 }}
              disabled={loading}
            >
              {loading ? "読み込み中..." : "ログイン"}
            </Button>

            <Grid container justifyContent="space-between">
              <Grid item>
                <Link href="#" variant="body2">
                  パスワードを忘れた場合
                </Link>
              </Grid>
              <Grid item>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => setOpenSignUp(true)}
                >
                  アカウント作成
                </Link>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Paper>

      {/* Sign Up Dialog */}
      <Dialog open={openSignUp} onClose={() => setOpenSignUp(false)}>
        <DialogTitle>アカウント作成</DialogTitle>
        <DialogContent>
          {signError && <Alert severity="error">{signError}</Alert>}
          <Box sx={{ mt: 1, width: 360 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="signup-username"
              label="ユーザー名"
              value={signUsername}
              onChange={(e) => setSignUsername(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="signup-password"
              label="パスワード"
              type="password"
              value={signPassword}
              onChange={(e) => setSignPassword(e.target.value)}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              id="signup-password-confirm"
              label="パスワード（確認）"
              type="password"
              value={signPasswordConfirm}
              onChange={(e) => setSignPasswordConfirm(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSignUp(false)} disabled={signLoading}>
            キャンセル
          </Button>
          <Button
            onClick={async () => {
              setSignError("");
              if (!signUsername || !signPassword) {
                setSignError("ユーザー名とパスワードを入力してください");
                return;
              }
              if (signPassword !== signPasswordConfirm) {
                setSignError("パスワードが一致しません");
                return;
              }
              setSignLoading(true);
              try {
                await api.post("register/", { username: signUsername, password: signPassword });
                // 自動ログイン
                const tokenRes = await api.post("token/", { username: signUsername, password: signPassword });
                localStorage.setItem("accessToken", tokenRes.data.access);
                localStorage.setItem("refreshToken", tokenRes.data.refresh);
                localStorage.setItem("username", signUsername);
                try {
                  const me = await api.get("me/");
                  localStorage.setItem("is_staff", String(me.data.is_staff));
                } catch (err) {
                  console.warn("failed to fetch current user info", err);
                }
                setOpenSignUp(false);
                onLogin();
              } catch (err) {
                const msg = err?.response?.data?.error || "アカウント作成に失敗しました";
                setSignError(msg);
              } finally {
                setSignLoading(false);
              }
            }}
            disabled={signLoading}
          >
            {signLoading ? "作成中..." : "アカウント作成"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Login;
