// frontend/src/utils/activityLogger.js
import axios from 'axios';
import { API_BASE_URL } from '../config';

export const logActivity = async (action, metadata = {}) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        await axios.post(`${API_BASE_URL}/api/activity-logs`, {
            action,
            metadata: {
                page: window.location.pathname,
                ...metadata
            }
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
    } catch (error) {
        // Silently fail in production to avoid disrupting the user experience
        if (process.env.NODE_ENV === 'development') {
            console.error('Failed to log activity:', error);
        }
    }
};