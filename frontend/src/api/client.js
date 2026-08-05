import axios from "axios";
import { auth } from "../lib/firebase";

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000",
});

client.interceptors.request.use(async (config) => {
  const currentUser = auth?.currentUser;
  if (currentUser) {
    const idToken = await currentUser.getIdToken();
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${idToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      const pathname = window.location.pathname;
      if (pathname !== "/login" && pathname !== "/register") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default client;
