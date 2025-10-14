// src/api/axiosConfig.js
import axios from 'axios';
import { auth } from '../config/firebaseConfig';

// Create an Axios instance
const apiClient = axios.create({
  // IMPORTANT: Replace this with your Vercel deployment URL
  baseURL: 'https://ai-interviewer-theta-ivory.vercel.app/api', 
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
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;