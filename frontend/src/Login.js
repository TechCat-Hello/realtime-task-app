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
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [openSignUp, setOpenSignUp] = useState(false);
  const [signUsername, setSignUsername] = useState("");
  const [signEmail, setSignEmail] = useState("");
  const [signPassword, setSignPassword] = useState("");
  const [signPasswordConfirm, setSignPasswordConfirm] = useState("");
  const [signError, setSignError] = useState("");
  const [signLoading, setSignLoading] = useState(false);

  // Password reset state
  const [openForgot, setOpenForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: enter email, 2: reset password
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotNewPasswordConfirm, setForgotNewPasswordConfirm] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down("sm"));

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
    <Container component="main" maxWidth="xs" sx={{ mt: { xs: 4, sm: 8 } }}>
      <Paper elevation={6} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar sx={{ m: 1, bgcolor: "primary.main", width: { xs: 40, sm: 56 }, height: { xs: 40, sm: 56 } }}>
            <LockOutlinedIcon sx={{ fontSize: { xs: "1.5rem", sm: "2rem" } }} />
          </Avatar>
          <Typography component="h1" variant="h5" sx={{ mt: 1, fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
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
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => {
                    setOpenForgot(true);
                    setForgotStep(1);
                    setForgotError("");
                    setForgotSuccess("");
                  }}
                >
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
      <Dialog open={openSignUp} onClose={() => setOpenSignUp(false)} fullScreen={fullScreenDialog} maxWidth="xs">
        <DialogTitle sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>アカウント作成</DialogTitle>
        <DialogContent>
          {signError && <Alert severity="error">{signError}</Alert>}
          <Box sx={{ mt: 1, width: { xs: "100%", sm: 360 } }}>
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
              id="signup-email"
              label="メールアドレス"
              type="email"
              value={signEmail}
              onChange={(e) => setSignEmail(e.target.value)}
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
              if (!signUsername || !signEmail || !signPassword) {
                setSignError("ユーザー名、メール、パスワードを入力してください");
                return;
              }
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signEmail)) {
                setSignError("有効なメールアドレスを入力してください");
                return;
              }
              if (signPassword !== signPasswordConfirm) {
                setSignError("パスワードが一致しません");
                return;
              }
              setSignLoading(true);
              try {
                await api.post("register/", { username: signUsername, email: signEmail, password: signPassword });
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

      {/* Forgot Password Dialog */}
      <Dialog open={openForgot} onClose={() => setOpenForgot(false)} fullScreen={fullScreenDialog} maxWidth="xs">
        <DialogTitle sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>パスワードをリセット</DialogTitle>
        <DialogContent>
          {forgotError && <Alert severity="error">{forgotError}</Alert>}
          {forgotSuccess && <Alert severity="success">{forgotSuccess}</Alert>}
          <Box sx={{ mt: 1, width: { xs: "100%", sm: 360 } }}>
            {forgotStep === 1 && (
              <TextField
                margin="normal"
                required
                fullWidth
                id="forgot-email"
                label="登録済みのメールアドレス"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
            )}
            {forgotStep === 2 && (
              <>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="forgot-new-password"
                  label="新しいパスワード"
                  type="password"
                  value={forgotNewPassword}
                  onChange={(e) => setForgotNewPassword(e.target.value)}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="forgot-new-password-confirm"
                  label="新しいパスワード（確認）"
                  type="password"
                  value={forgotNewPasswordConfirm}
                  onChange={(e) => setForgotNewPasswordConfirm(e.target.value)}
                />
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForgot(false)} disabled={forgotLoading}>
            キャンセル
          </Button>
          {forgotStep === 1 && (
            <Button
              onClick={async () => {
                setForgotError("");
                if (!forgotEmail) {
                  setForgotError("メールアドレスを入力してください");
                  return;
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
                  setForgotError("有効なメールアドレスを入力してください");
                  return;
                }
                setForgotLoading(true);
                try {
                  // Verify email exists
                  await api.post("forgot-password/", { email: forgotEmail });
                  setForgotStep(2);
                } catch (err) {
                  const msg = err?.response?.data?.error || "エラーが発生しました";
                  setForgotError(msg);
                } finally {
                  setForgotLoading(false);
                }
              }}
              disabled={forgotLoading}
              variant="contained"
            >
              次へ
            </Button>
          )}
          {forgotStep === 2 && (
            <Button
              onClick={async () => {
                setForgotError("");
                if (!forgotNewPassword) {
                  setForgotError("パスワードを入力してください");
                  return;
                }
                if (forgotNewPassword !== forgotNewPasswordConfirm) {
                  setForgotError("パスワードが一致しません");
                  return;
                }
                setForgotLoading(true);
                try {
                  await api.post("reset-password/", {
                    email: forgotEmail,
                    new_password: forgotNewPassword,
                  });
                  setForgotSuccess("パスワードをリセットしました。ログインしてください。");
                  setTimeout(() => {
                    setOpenForgot(false);
                    setForgotStep(1);
                    setForgotEmail("");
                    setForgotNewPassword("");
                    setForgotNewPasswordConfirm("");
                  }, 2000);
                } catch (err) {
                  const msg = err?.response?.data?.error || "パスワードのリセットに失敗しました";
                  setForgotError(msg);
                } finally {
                  setForgotLoading(false);
                }
              }}
              disabled={forgotLoading}
              variant="contained"
            >
              {forgotLoading ? "リセット中..." : "パスワードをリセット"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Login;
