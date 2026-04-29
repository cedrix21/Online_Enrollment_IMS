import { useState, useEffect } from 'react';
import API from '../api/api';

const CACHE_KEY = 'current_school_year';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day – school year rarely changes

export const useCurrentSchoolYear = () => {
    const [schoolYear, setSchoolYear] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Check cache first
        const cached = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(`${CACHE_KEY}_time`);
        if (cached && cachedTime && (Date.now() - parseInt(cachedTime) < CACHE_DURATION)) {
            setSchoolYear(cached);
            setLoading(false);
            return;
        }

        // Fetch from backend
        const fetchSchoolYear = async () => {
            try {
                const res = await API.get('/current-school-year');
                const year = res.data.school_year;
                setSchoolYear(year);
                localStorage.setItem(CACHE_KEY, year);
                localStorage.setItem(`${CACHE_KEY}_time`, Date.now().toString());
            } catch (err) {
                console.error('Failed to fetch current school year', err);
                setError(err);
                // Fallback to client-side calculation
                const fallbackYear = getFallbackSchoolYear();
                setSchoolYear(fallbackYear);
            } finally {
                setLoading(false);
            }
        };

        fetchSchoolYear();
    }, []);

    return { schoolYear, loading, error };
};

// Fallback client-side logic (same as backend)
function getFallbackSchoolYear() {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}