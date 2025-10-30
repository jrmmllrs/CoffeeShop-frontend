// src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_URL;

export const apiService = {
  // Test backend connection
  async testConnection() {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
  },

  // Auth methods
  async login(credentials) {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });
    return response.json();
  },

  async register(userData) {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    return response.json();
  },

  // Products
  async getProducts() {
    const response = await fetch(`${API_BASE_URL}/api/products`);
    return response.json();
  },

  async createProduct(productData, token) {
    const response = await fetch(`${API_BASE_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(productData),
    });
    return response.json();
  },

  // Sales
  async createSale(saleData, token) {
    const response = await fetch(`${API_BASE_URL}/api/sales`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(saleData),
    });
    return response.json();
  },

  async getSales(token) {
    const response = await fetch(`${API_BASE_URL}/api/sales`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.json();
  }
};

export default apiService;