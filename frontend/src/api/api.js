import axios from "axios";
import { API_BASE_URL } from '../config';

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  }
});

// Request interceptor
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - FIXED
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only handle 401 if it's an authentication error, not a data error
    if (error.response?.status === 401) {
      const token = localStorage.getItem("token");
      const errorMessage = error.response?.data?.message?.toLowerCase() || '';
      
      // Only logout if it's an actual auth error
      const isAuthError = 
        !token || 
        errorMessage.includes('unauthenticated') ||
        errorMessage.includes('token') ||
        errorMessage.includes('unauthorized');

      if (isAuthError) {
        // Clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Define public pages
        const publicPages = ["/login", "/enroll", "/enrollment-qr", "/"];
        const currentPath = window.location.pathname;
        const isPublicPage = publicPages.some(path => currentPath === path || currentPath.startsWith(path));

        // Only redirect if on a protected page
        if (!isPublicPage) {
          console.log('Session expired. Redirecting to login...');
          window.location.href = "/login";
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default API;