// src/services/apiClient.ts
import axios from 'axios';

// Base URL for your backend API
const API_BASE_URL = 'http://localhost:3001/api'; // Ensure port 3001 is correct

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Request Interceptor (with logging) ---
apiClient.interceptors.request.use(
  (config) => {
    // Try to get the token from localStorage
    const token = localStorage.getItem('authToken');

    if (token) {
      // If token exists, add the Authorization header
      config.headers.Authorization = `Bearer ${token}`;
      // Log confirmation that token was found and added
      console.log('[apiClient] Token FOUND in localStorage, adding Authorization header.');
    } else {
      // Log a warning if no token was found
      console.warn('[apiClient] Token NOT FOUND in localStorage.');
    }
    // Always return the config object for the request to proceed
    return config;
  },
  (error) => {
    // Log any error that occurs during request setup
    console.error('[apiClient] Request Interceptor Error:', error);
    // Reject the promise to signal the error
    return Promise.reject(error);
  }
);

// --- Response Interceptor (with logging for 401) ---
apiClient.interceptors.response.use(
  (response) => {
    // If the response is successful (status code 2xx), just return it
    return response;
  },
  (error) => {
    // If an error response is received
    if (error.response && error.response.status === 401) {
      // Specifically log if we receive a 401 Unauthorized status
      console.error("[apiClient] Intercepted 401 Unauthorized Response. Token might be invalid/expired or missing.");
      // Optional: Implement global logout/redirect logic here if needed
      // Example:
      // localStorage.removeItem('authToken');
      // if (!window.location.pathname.includes('/login')) { // Avoid redirect loop
      //    window.location.href = '/login';
      // }
    } else if (error.request) {
        // The request was made but no response was received (e.g., network error, backend down)
        console.error('[apiClient] Network Error or No Response:', error.message);
    } else {
        // Something happened in setting up the request that triggered an Error
        console.error('[apiClient] Error setting up request:', error.message);
    }
    // Reject the promise to pass the error along for component-level handling
    return Promise.reject(error);
  }
);

// Export the configured Axios instance
export default apiClient;