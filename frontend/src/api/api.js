import axios from "axios";

const API = axios.create({
 baseURL: 'https://onlineenrollmentims-production-5b49.up.railway.app',
  headers: {
        'Accept': 'application/json', 
        'Content-Type': 'application/json',
    }
});

// Automatically attach Token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle Token expiration (401 errors)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default API;