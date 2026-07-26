import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:50000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  verifyOTP: (data: any) => api.post('/auth/verify-otp', data),
  resendOTP: (data: any) => api.post('/auth/resend-otp', data),
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: any) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
};

export const cityAPI = {
  getActiveCities: () => api.get('/cities/active'),
};

export const orderAPI = {
  createOrder: (data: any) => api.post('/orders', data),
  getUserOrders: () => api.get('/orders'),
  getOrderById: (id: string) => api.get(`/orders/${id}`),
  cancelOrder: (id: string) => api.put(`/orders/${id}/cancel`),
  rateOrder: (id: string, rating: number) => api.post(`/orders/${id}/rate`, { rating }),
};

export const driverAPI = {
  getProfile: () => api.get('/drivers/profile'),
  updateLocation: (lat: number, lng: number) => api.put('/drivers/location', { lat, lng }),
  toggleAvailability: () => api.put('/drivers/availability'),
  getAvailableOrders: () => api.get('/drivers/available-orders'),
  acceptOrder: (orderId: string) => api.post('/drivers/accept-order', { orderId }),
  rejectOrder: (orderId: string) => api.post('/drivers/reject-order', { orderId }),
  getPendingOffer: () => api.get('/drivers/pending-offer'),
  updateOrderStatus: (orderId: string, status: string) => api.put('/drivers/order-status', { orderId, status }),
  getDriverOrders: () => api.get('/drivers/orders'),
  getEarnings: () => api.get('/drivers/earnings'),
};

export const userAPI = {
  updateProfile: (data: any) => api.put('/users/profile', data),
  changePassword: (data: any) => api.put('/users/change-password', data),
};

export default api;
