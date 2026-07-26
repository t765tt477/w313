import axios from 'axios';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:50000/api';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
};

export const adminAPI = {
  getAnalytics: () => api.get('/admin/analytics'),
  getAllDrivers: () => api.get('/admin/drivers'),
  addDriverCredit: (driverId: string, amount: number, description: string) =>
    api.post('/admin/drivers/credit', { driverId, amount, description }),
  getDriverDetails: (driverId: string) => api.get(`/admin/drivers/${driverId}`),
  approveDriver: (driverId: string) => api.put(`/admin/drivers/${driverId}/approve`),
  updateDriverImages: (driverId: string, images: { profileImage?: string; vehicleImage?: string; licenseImage?: string }) =>
    api.put(`/admin/drivers/${driverId}/images`, { driverId, ...images }),
  getAllOrders: () => api.get('/admin/orders'),
  getAllClients: () => api.get('/admin/clients'),
  getAllAdmins: () => api.get('/admin/admins'),
  createAdmin: (data: any) => api.post('/admin/admins', data),
  updateAdmin: (id: string, data: any) => api.put(`/admin/admins/${id}`, data),
  deleteAdmin: (id: string) => api.delete(`/admin/admins/${id}`),
};

export const cityAPI = {
  getAllCities: () => api.get('/cities'),
  createCity: (name: string) => api.post('/cities', { name }),
  updateCity: (id: string, data: { name?: string; isActive?: boolean }) => api.put(`/cities/${id}`, data),
  deleteCity: (id: string) => api.delete(`/cities/${id}`),
};

export const logAPI = {
  getAllLogs: (params?: any) => api.get('/logs', { params }),
  getLogById: (id: string) => api.get(`/logs/${id}`),
};

export const notificationAPI = {
  getNotifications: () => api.get('/notifications'),
  markAsRead: (notificationId: string) => api.put(`/notifications/${notificationId}/read`),
  markAllAsRead: () => api.put('/notifications/mark-all-read'),
  deleteNotification: (notificationId: string) => api.delete(`/notifications/${notificationId}`),
};

export default api;
