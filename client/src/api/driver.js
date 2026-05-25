import api from './axios';

export const getDriverProfile = () => api.get('/driver/profile');
export const startTrip = () => api.post('/driver/trip/start');
export const endTrip = () => api.post('/driver/trip/end');
export const getCurrentTrip = () => api.get('/driver/trip/current');
