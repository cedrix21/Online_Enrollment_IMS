import { useState, useEffect } from 'react';
import API from '../api/api';

const CACHE_KEY = 'current_school_year';
const CACHE_TIME_KEY = 'current_school_year_time';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day

export const useCurrentSchoolYear = () => {
    const [schoolYear, setSchoolYear] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSchoolYear = async () => {
            try {
                const res = await API.get('/current-school-year');
                const year = res.data.school_year;
                setSchoolYear(year);
                // Only store in cache if not in development
                if (process.env.NODE_ENV !== 'development') {
                    localStorage.setItem(CACHE_KEY, year);
                    localStorage.setItem(CACHE_TIME_KEY, Date.now().toString());
                }
            } catch (err) {
                console.error('Failed to fetch current school year', err);
                setError(err);
                const fallbackYear = getFallbackSchoolYear();
                setSchoolYear(fallbackYear);
            } finally {
                setLoading(false);
            }
        };

        // In development, always bypass cache and fetch fresh
        if (process.env.NODE_ENV === 'development') {
            fetchSchoolYear();
            return;
        }

        // In production, check cache first
        const cached = localStorage.getItem(CACHE_KEY);
        const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
        if (cached && cachedTime && (Date.now() - parseInt(cachedTime) < CACHE_DURATION)) {
            setSchoolYear(cached);
            setLoading(false);
            return;
        }

        fetchSchoolYear();
    }, []);

    return { schoolYear, loading, error };
};

function getFallbackSchoolYear() {
    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();
    return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}