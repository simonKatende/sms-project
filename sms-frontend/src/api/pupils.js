import { apiClient } from './client.js';

export const pupilsApi = {
  list:            (params)      => apiClient.get('/pupils', { params }),
  getById:         (id)          => apiClient.get(`/pupils/${id}`),
  getFamily:       (guardianId)  => apiClient.get(`/pupils/family/${guardianId}`),
  guardianCheck:   (phone)       => apiClient.get('/pupils/guardian-check', { params: { phone } }),

  create: (formData) =>
    apiClient.post('/pupils', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id, data) => apiClient.put(`/pupils/${id}`, data),
  remove: (id)       => apiClient.delete(`/pupils/${id}`),

  exportXlsx: (params) =>
    apiClient.get('/pupils/export', {
      params,
      responseType: 'blob',
    }),

  uploadPhoto: (id, formData) =>
    apiClient.post(`/pupils/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
