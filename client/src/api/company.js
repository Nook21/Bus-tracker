import api from './axios';

export const getCompanyStats = () => api.get('/company/stats');
export const getDrivers = () => api.get('/company/drivers');
export const createDriver = (data) => api.post('/company/drivers', data);
export const toggleDriverStatus = (id) => api.patch(`/company/drivers/${id}/toggle`);
export const getActiveTrips = () => api.get('/company/trips');
export const getCompanyLiveLocations = () => api.get('/company/live-locations');
