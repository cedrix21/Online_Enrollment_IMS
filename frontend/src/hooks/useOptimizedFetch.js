import { useState, useEffect, useCallback, useRef } from 'react';
import API from '../api/api';

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map();
const pendingRequests = new Map();

export function useOptimizedFetch(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const cacheKey = `${url}-${JSON.stringify(options.params || {})}`;

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Cancel previous request if exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh && cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_DURATION) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }

    // Check if request is already pending
    if (pendingRequests.has(cacheKey)) {
      try {
        const result = await pendingRequests.get(cacheKey);
        setData(result);
        setLoading(false);
        return;
      } catch (err) {
        // Handle error
      }
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoading(true);
      
      // Create the request promise
      const requestPromise = API.get(url, {
        ...options,
        signal: abortController.signal
      });

      pendingRequests.set(cacheKey, requestPromise);

      const response = await requestPromise;
      
      // Cache the response
      cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });

      setData(response.data);
      setError(null);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.response?.data?.message || err.message);
      }
    } finally {
      setLoading(false);
      pendingRequests.delete(cacheKey);
      abortControllerRef.current = null;
    }
  }, [url, cacheKey, options]);

  useEffect(() => {
    fetchData();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
}

// Debounce hook for search inputs
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
