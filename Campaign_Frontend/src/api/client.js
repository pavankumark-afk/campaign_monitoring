import axios from 'axios';

axios.defaults.withCredentials = true;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Handle 401s globally -> force logout + redirect to login
let onUnauthorized = () => {};
export const registerUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

// Separate client for file uploads (multipart) - same base, different default headers
export const uploadClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

uploadClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);
