// src/config.js
const isDevelopment = window.location.hostname === 'localhost';

export const API_BASE_URL = isDevelopment 
    ? 'http://127.0.0.1:8000'                      // Your local Laravel
    : 'https://onlineenrollmentims-production-8cb8.up.railway.app'; // Your Railway URL

export const STORAGE_URL = `${API_BASE_URL}/storage`;