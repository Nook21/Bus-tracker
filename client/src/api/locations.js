import api from './axios';

export const getLiveBuses = () => api.get('/locations/live');
export const getNearestBuses = (lat, lng, limit = 10) =>
  api.get(`/locations/nearest?lat=${lat}&lng=${lng}&limit=${limit}`);
