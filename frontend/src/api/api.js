import axios from "axios";
import { API_BASE_URL } from '../config';

// 1. You MUST use .create() here to make a reusable instance
const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

// 2. Now .interceptors will work because API is an axios instance
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// api.js
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data
      const token = localStorage.getItem("token");
      if (!token) {
        // Token doesn't exist, clear storage and redirect
        localStorage.clear();
        
        // Define your public pages here
        const publicPages = ["/login", "/enroll", "/enrollment-qr"];
        const isPublicPage = publicPages.some(path => window.location.pathname.includes(path));

        // Only redirect if they are trying to access a PROTECTED page
        if (!isPublicPage) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default API;