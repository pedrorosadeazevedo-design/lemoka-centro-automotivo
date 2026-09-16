import axios from 'axios';

// Garante que a URL da API sempre termine exatamente em /api (corrigindo qualquer digitação /ap ou falta de barra)
const rawUrl = import.meta.env.VITE_API_URL || 'https://forza1-backend.onrender.com/api';
const cleanUrl = rawUrl.trim().replace(/\/+$/, '');
const finalBaseURL = cleanUrl.endsWith('/ap') ? cleanUrl + 'i' : (cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`);

export const api = axios.create({
  baseURL: finalBaseURL
});

// Interceptor para injetar o JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('@lemoka:token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
