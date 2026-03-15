/**
 * admin.js — system_admin APIs: classes, streams, institution profile.
 */

import { apiClient } from './client.js';

export const adminClassesApi = {
  list:   (params)    => apiClient.get('/classes', { params }),
  create: (data)      => apiClient.post('/classes', data),
  update: (id, data)  => apiClient.put(`/classes/${id}`, data),
};

export const adminStreamsApi = {
  list:   (params)    => apiClient.get('/streams', { params }),
  create: (data)      => apiClient.post('/streams', data),
  update: (id, data)  => apiClient.put(`/streams/${id}`, data),
};

export const schoolProfileApi = {
  get: () =>
    apiClient.get('/admin/settings/profile'),

  update: (formData) =>
    apiClient.put('/admin/settings/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};
