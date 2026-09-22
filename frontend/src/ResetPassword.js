import { useState } from "react";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import LockResetIcon from "@mui/icons-material/LockReset";
import Typography from "@mui/material/Typography";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Alert from "@mui/material/Alert";
import api from "./api";

function ResetPassword({ uid, token, onDone }) {
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newPassword) {
      setError("パスワードを入力してください");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setError("パスワードが一致しません");
      return;
    }

    setLoading(true);
    try {
      await api.post("reset-password/", { uid, token, new_password: newPassword });
      setSuccess(true);
    } catch (err) {
      setError(err?.response?.data?.error || "パスワードの再設定に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Container component="main" maxWidth="xs">
        <Paper elevation={3} sx={{ p: 4, borderRadius: 4 }}>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Avatar sx={{ m: 1, bgcolor: "primary.main" }}>
              <LockResetIcon />
            </Avatar>
            <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
              パスワードの再設定
            </Typography>

            {success ? (
              <>
                <Alert severity="success" sx={{ width: "100%", mb: 2 }}>
                  パスワードを再設定しました。ログイン画面からログインしてください。
                </Alert>
                <Button fullWidth variant="contained" onClick={onDone}>
                  ログイン画面へ
                </Button>
              </>
            ) : (
              <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="new-password"
                  label="新しいパスワード"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="new-password-confirm"
                  label="新しいパスワード（確認）"
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                />
                <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }} disabled={loading}>
                  {loading ? "送信中..." : "パスワードを再設定"}
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}

export default ResetPassword;
