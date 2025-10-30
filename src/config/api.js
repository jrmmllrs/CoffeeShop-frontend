// src/config/api.js
const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL,
  isProduction: import.meta.env.VITE_ENV === 'production'
};

export default API_CONFIG;