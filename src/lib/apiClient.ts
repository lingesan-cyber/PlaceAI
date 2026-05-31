import axios from 'axios';

/**
 * Standard HTTP client configured to connect directly to the
 * PlaceAI high-performance Node.js / Express backend service.
 */
export const apiClient = axios.create({
  baseURL: 'http://localhost:5000/api',
});
