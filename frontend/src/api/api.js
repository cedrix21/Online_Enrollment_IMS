import axios from "axios";
import { API_BASE_URL } from '../config';
import { logActivity } from '../utils/activityLogger';

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

// Single request interceptor to handle both auth token AND activity logging
API.interceptors.request.use(async (config) => {
  // 1. Add auth token
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 2. Log the request (skip self-logging to avoid infinite loop)
  if (!config.url.includes('/activity-logs')) {
    await logActivity('api_request', {
      url: config.url,
      method: config.method?.toUpperCase()
    });
  }
  
  return config;
}, (error) => Promise.reject(error));

// Response interceptor (keep as is – handles 401)
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const token = localStorage.getItem("token");
      const errorMessage = error.response?.data?.message?.toLowerCase() || '';
      const isAuthError = !token || errorMessage.includes('unauthenticated') || errorMessage.includes('token') || errorMessage.includes('unauthorized');
      if (isAuthError) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        const publicPages = ["/login", "/enroll", "/enrollment-qr", "/"];
        const currentPath = window.location.pathname;
        const isPublicPage = publicPages.some(path => currentPath === path || currentPath.startsWith(path));
        if (!isPublicPage) window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default API;