// src/api/axiosConfig.js
import axios from 'axios';
import { auth } from '../config/firebaseConfig';

// Create an Axios instance using the environment variable for the base URL
const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api`,
});

// Add a request interceptor to include the Firebase auth token
apiClient.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
