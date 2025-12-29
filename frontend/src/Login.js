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
        // Silently ignore if fetching user info fails
      }

      onLogin();
    } catch (err) {
      setError("ユーザー名かパスワードが正しくありません");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #a8edf0 0%, #76DAE4 50%, #4ec9d6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4
      }}
    >
      <Container component="main" maxWidth="sm">
        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 3, sm: 5 }, 
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}
        >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Avatar 
            sx={{ 
              m: 1, 
              bgcolor: "primary.main", 
              width: { xs: 56, sm: 72 }, 
              height: { xs: 56, sm: 72 },
              boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)'
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: { xs: "2rem", sm: "2.5rem" } }} />
          </Avatar>
          
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <Typography 
              component="h1" 
              variant="h4" 
              sx={{ 
                mt: 2, 
                mb: 0.5,
                fontSize: { xs: '1.75rem', sm: '2.125rem' },
                fontWeight: 700,
                background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em'
              }}
            >
              TaskSync
            </Typography>
            <Box
              sx={{
                position: 'absolute',
                bottom: 2,
                left: '-5%',
                width: '110%',
                height: '6px',
                background: 'linear-gradient(90deg, transparent 0%, #1976d2 5%, #42a5f5 50%, #1976d2 95%, transparent 100%)',
                borderRadius: '50% 30% 40% 60%',
                opacity: 0.7,
                transform: 'rotate(-1deg)',
                filter: 'blur(0.5px)',
                boxShadow: '0 1px 3px rgba(25, 118, 210, 0.3)'
              }}
            />
          </Box>
          
          <Typography 
            variant="h6" 
            color="text.primary" 
            align="center"
            sx={{ 
              mt: 2,
              mb: 1,
              fontSize: { xs: '1.125rem', sm: '1.25rem' },
              fontWeight: 700,
              lineHeight: 1.6
            }}
          >
            TaskSync（リアルタイムタスク管理アプリ）
          </Typography>
          
          <Typography 
            variant="body2" 
            color="text.secondary" 
            align="center"
            sx={{ 
              mb: 3,
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              maxWidth: '450px',
              lineHeight: 1.8
            }}
          >
            チーム全体でタスクを<Box component="span" sx={{ fontWeight: 700, color: '#1976d2' }}>リアルタイム同期</Box>。<br />
            <Box component="span" sx={{ fontWeight: 700, color: '#1976d2' }}>Slack通知</Box>連携と<Box component="span" sx={{ fontWeight: 700, color: '#1976d2' }}>進捗グラフ</Box>で、<br />
            効率的なプロジェクト管理を実現します。
          </Typography>

          {error && (
            <Alert severity="error" sx={{ width: "100%", mt: 1, mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 1, width: "100%" }}>
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
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
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />

            <FormControlLabel
              control={<Checkbox value="remember" color="primary" />}
              label={<Typography variant="body2">ログイン情報を保存</Typography>}
              sx={{ mt: 1 }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              sx={{ 
                mt: 3, 
                mb: 2,
                py: 1.5,
                borderRadius: 2,
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(25, 118, 210, 0.4)',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(25, 118, 210, 0.5)',
                }
              }}
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
                  sx={{
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    }
                  }}
                >
                  パスワードを忘れた場合
                </Link>
              </Grid>
              {/* 新規登録機能を有効化する場合は、以下のコメントアウトを解除してください */}
              {/* <Grid item>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => setOpenSignUp(true)}
                  sx={{
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    }
                  }}
                >
                  アカウント作成
                </Link>
              </Grid> */}
            </Grid>
          </Box>
        </Box>
      </Paper>
      
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          デモアカウント: admin / demo789! または user1 / password123!
        </Typography>
      </Box>

      {/* Sign Up Dialog - 新規登録機能を有効化する場合は、以下のコメントアウトを解除してください
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
                const tokenRes = await api.post("token/", { username: signUsername, password: signPassword });
                localStorage.setItem("accessToken", tokenRes.data.access);
                localStorage.setItem("refreshToken", tokenRes.data.refresh);
                localStorage.setItem("username", signUsername);
                try {
                  const me = await api.get("me/");
                  localStorage.setItem("is_staff", String(me.data.is_staff));
                } catch (err) {
                  // Silently ignore if fetching user info fails
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
      */}

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
    </Box>
  );
}

export default Login;