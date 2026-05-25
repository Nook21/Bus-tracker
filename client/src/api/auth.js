import api from './axios';

export const loginApi = (credentials) => api.post('/auth/login', credentials);
export const getMeApi = () => api.get('/auth/me');

// Email verification
export const verifyEmailApi = (data) => api.post('/auth/verify-email', data);
export const resendVerificationApi = (email) => api.post('/auth/resend-verification', { email });

// Password reset
export const forgotPasswordApi = (email) => api.post('/auth/forgot-password', { email });
export const verifyResetCodeApi = (data) => api.post('/auth/verify-reset-code', data);
export const resetPasswordApi = (data) => api.post('/auth/reset-password', data);
