import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CacheContext = createContext();

export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
};

export const CacheProvider = ({ children, apiClient }) => {
  const [cache, setCache] = useState({});
  const [loadingStates, setLoadingStates] = useState({});

  // Load cache from localStorage on mount
  useEffect(() => {
    try {
      const savedCache = localStorage.getItem('student-app-cache');
      if (savedCache) {
        const parsedCache = JSON.parse(savedCache);
        // Only restore cache if it's less than 10 minutes old
        const now = Date.now();
        const filteredCache = {};
        
        Object.keys(parsedCache).forEach(key => {
          const item = parsedCache[key];
          if (item && item.timestamp && (now - item.timestamp < 600000)) { // 10 minutes
            filteredCache[key] = item;
          }
        });
        
        setCache(filteredCache);
      }
    } catch (error) {
      console.error('Error loading cache from localStorage:', error);
    }
  }, []);

  // Save cache to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('student-app-cache', JSON.stringify(cache));
    } catch (error) {
      console.error('Error saving cache to localStorage:', error);
    }
  }, [cache]);

  const getCachedData = useCallback((key) => {
    const cachedItem = cache[key];
    if (!cachedItem) return null;
    
    // Check if cache is still valid (10 minutes)
    const now = Date.now();
    if (now - cachedItem.timestamp > 600000) {
      // Cache expired, remove it
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[key];
        return newCache;
      });
      return null;
    }
    
    return cachedItem.data;
  }, [cache]);

  const setCachedData = useCallback((key, data) => {
    setCache(prev => ({
      ...prev,
      [key]: {
        data,
        timestamp: Date.now()
      }
    }));
  }, []);

  const isLoading = useCallback((key) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const setLoading = useCallback((key, loading) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: loading
    }));
  }, []);

  const fetchWithCache = useCallback(async (key, fetchFunction, forceRefresh = false) => {
    // Check cache first if not forcing refresh
    if (!forceRefresh) {
      const cachedData = getCachedData(key);
      if (cachedData) {
        return cachedData;
      }
    }

    // If already loading this key, return null to prevent duplicate requests
    if (isLoading(key)) {
      return null;
    }

    try {
      setLoading(key, true);
      const data = await fetchFunction();
      setCachedData(key, data);
      return data;
    } catch (error) {
      console.error(`Error fetching ${key}:`, error);
      throw error;
    } finally {
      setLoading(key, false);
    }
  }, [getCachedData, setCachedData, isLoading, setLoading]);

  // Pre-defined cache functions for common API calls (student-specific)
  const getMyTeacher = useCallback(async (forceRefresh = false) => {
    const UserService = (await import('../services/UserService.js')).default;
    // Get current user from auth to pass student ID
    const { auth } = await import('../config/firebase.js');
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { success: false, teacher: null, error: 'No authenticated user' };
    }
    return fetchWithCache('myTeacher', () => UserService.getMyTeacher(currentUser.uid), forceRefresh);
  }, [fetchWithCache]);

  const getMySchedule = useCallback(async (forceRefresh = false) => {
    return fetchWithCache('mySchedule', () => apiClient.getMySchedule(), forceRefresh);
  }, [fetchWithCache, apiClient]);

  const getMyMessages = useCallback(async (forceRefresh = false) => {
    return fetchWithCache('myMessages', () => apiClient.getMessages(), forceRefresh);
  }, [fetchWithCache, apiClient]);

  const getUsers = useCallback(async (forceRefresh = false) => {
    const UserService = (await import('../services/UserService.js')).default;
    return fetchWithCache('users', () => UserService.getAllUsers(), forceRefresh);
  }, [fetchWithCache]);

  const getMyCalls = useCallback(async (forceRefresh = false) => {
    return fetchWithCache('myCalls', () => apiClient.getMyCalls(), forceRefresh);
  }, [fetchWithCache, apiClient]);

  const getStudentStats = useCallback(async (forceRefresh = false) => {
    return fetchWithCache('studentStats', async () => {
      const response = await fetch(`${apiClient.baseURL}/users/my-stats`, {
        headers: apiClient.getAuthHeaders()
      });
      return await apiClient.handleResponse(response);
    }, forceRefresh);
  }, [fetchWithCache, apiClient]);

  const getRecentActivity = useCallback(async (limit = 10, forceRefresh = false) => {
    return fetchWithCache(`recentActivity_${limit}`, async () => {
      const response = await fetch(`${apiClient.baseURL}/activities/recent?limit=${limit}`, {
        headers: apiClient.getAuthHeaders()
      });
      return await apiClient.handleResponse(response);
    }, forceRefresh);
  }, [fetchWithCache, apiClient]);

  const getUpcomingClasses = useCallback(async (forceRefresh = false) => {
    return fetchWithCache('upcomingClasses', async () => {
      const response = await fetch(`${apiClient.baseURL}/calls/upcoming`, {
        headers: apiClient.getAuthHeaders()
      });
      return await apiClient.handleResponse(response);
    }, forceRefresh);
  }, [fetchWithCache, apiClient]);

  // Invalidate specific cache keys
  const invalidateCache = useCallback((keys) => {
    if (typeof keys === 'string') {
      keys = [keys];
    }
    
    setCache(prev => {
      const newCache = { ...prev };
      keys.forEach(key => {
        // Support wildcard patterns
        if (key.includes('*')) {
          const pattern = key.replace('*', '');
          Object.keys(newCache).forEach(cacheKey => {
            if (cacheKey.startsWith(pattern)) {
              delete newCache[cacheKey];
            }
          });
        } else {
          delete newCache[key];
        }
      });
      return newCache;
    });
  }, []);

  // Clear all cache
  const clearCache = useCallback(() => {
    setCache({});
    localStorage.removeItem('student-app-cache');
  }, []);

  // Refresh dashboard data
  const refreshDashboard = useCallback(async () => {
    const dashboardKeys = ['studentStats', 'myTeacher', 'upcomingClasses', 'recentActivity_10'];
    invalidateCache(dashboardKeys);
    
    try {
      await Promise.all([
        getStudentStats(true),
        getMyTeacher(true),
        getUpcomingClasses(true),
        getRecentActivity(10, true)
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    }
  }, [getStudentStats, getMyTeacher, getUpcomingClasses, getRecentActivity, invalidateCache]);

  // Get cache statistics for debugging
  const getCacheStats = useCallback(() => {
    const keys = Object.keys(cache);
    const now = Date.now();
    
    return {
      totalItems: keys.length,
      validItems: keys.filter(key => now - cache[key].timestamp < 600000).length,
      expiredItems: keys.filter(key => now - cache[key].timestamp >= 600000).length,
      loadingItems: Object.keys(loadingStates).filter(key => loadingStates[key]).length,
      cacheKeys: keys
    };
  }, [cache, loadingStates]);

  const value = {
    // Core cache functions
    getCachedData,
    setCachedData,
    fetchWithCache,
    isLoading,
    
    // Student-specific API cache functions
    getMyTeacher,
    getMySchedule,
    getMyMessages,
    getMyCalls,
    getUsers,
    getStudentStats,
    getRecentActivity,
    getUpcomingClasses,
    
    // Cache management
    invalidateCache,
    clearCache,
    refreshDashboard,
    getCacheStats,
    
    // State
    cache,
    loadingStates
  };

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
};

export default CacheProvider;