// src/config.js

export const API_BASE_URL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:8000'   
    : 'https://onlineenrollmentims-production-8cb8.up.railway.app';