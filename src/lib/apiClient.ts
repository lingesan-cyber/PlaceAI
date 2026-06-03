import axios from 'axios';

/**
 * Standard HTTP client configured to connect directly to the
 * PlaceAI high-performance Node.js / Express backend service.
 */
export const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Automatically inject JWT Bearer token into every request
apiClient.interceptors.request.use((config) => {
  const store = localStorage.getItem('placement-auth-store');
  if (store) {
    try {
      const parsed = JSON.parse(store);
      const token = parsed.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error parsing token from storage', error);
    }
  }
  return config;
});
