import axios from "axios";

const api = axios.create({
  baseURL: "https://realtime-task-app-backend.onrender.com/api/",
});

// 毎リクエストで JWT を付与
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
