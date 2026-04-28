// frontend/src/utils/activityLogger.js
import axios from 'axios';

export const logActivity = async (action, metadata = {}) => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
        await axios.post('/api/activity-logs', {
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