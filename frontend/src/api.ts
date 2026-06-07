import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PROD ? '/api' : 'http://127.0.0.1:5000/api',
});

export default api;
