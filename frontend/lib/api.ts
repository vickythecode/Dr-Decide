import axios from "axios";

const baseURL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("dr_decide_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const detail = error.response?.data?.detail;
      const message = error.response?.data?.message;
      const fallback = error.message || "Request failed";
      const resolved =
        (typeof detail === "string" && detail) ||
        (typeof message === "string" && message) ||
        fallback;
      return Promise.reject(new Error(resolved));
    }
    return Promise.reject(error);
  }
);

export function authHeader(token?: string) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}
