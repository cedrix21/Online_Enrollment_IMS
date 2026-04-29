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

// Request interceptor – adds auth token and logs outgoing requests
API.interceptors.request.use(async (config) => {
  // Add auth token
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Log the request (skip self-logging to avoid infinite loop)
  if (!config.url.includes('/activity-logs')) {
    await logActivity('api_request', {
      url: config.url,
      method: config.method?.toUpperCase()
    });
  }
  
  return config;
}, (error) => Promise.reject(error));

// Response interceptor – logs failed requests and handles 401
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log all failed requests (4xx, 5xx, network errors)
    if (error.config && !error.config.url.includes('/activity-logs')) {
      await logActivity('api_error', {
        url: error.config.url,
        method: error.config.method?.toUpperCase(),
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      const token = localStorage.getItem("token");
      const errorMessage = error.response?.data?.message?.toLowerCase() || '';
      
      const isAuthError = 
        !token || 
        errorMessage.includes('unauthenticated') ||
        errorMessage.includes('token') ||
        errorMessage.includes('unauthorized');

      if (isAuthError) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        const publicPages = ["/login", "/enroll", "/enrollment-qr", "/"];
        const currentPath = window.location.pathname;
        const isPublicPage = publicPages.some(path => currentPath === path || currentPath.startsWith(path));

        if (!isPublicPage) {
          window.location.href = "/login";
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default API;