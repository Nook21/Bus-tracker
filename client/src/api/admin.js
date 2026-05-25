import api from './axios';

export const getAdminStats = () => api.get('/admin/stats');
export const getAllCompanies = () => api.get('/admin/companies');
export const createCompany = (data) => api.post('/admin/companies', data);
export const approveCompany = (id) => api.patch(`/admin/companies/${id}/approve`);
export const toggleCompanyStatus = (id) => api.patch(`/admin/companies/${id}/toggle`);
