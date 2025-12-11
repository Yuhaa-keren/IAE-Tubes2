import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: 'http://localhost:3000', // Ke API Gateway
});

// Otomatis tempel token di setiap request
axiosInstance.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default axiosInstance;