/**
 * admin.js — system_admin APIs: classes, streams, houses, institution profile,
 * academic calendar, user management, subjects, grading, assessment types,
 * report card settings.
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

export const adminHousesApi = {
  list:         ()          => apiClient.get('/admin/houses'),
  listActive:   ()          => apiClient.get('/admin/houses/active'),
  create:       (data)      => apiClient.post('/admin/houses', data),
  update:       (id, data)  => apiClient.put(`/admin/houses/${id}`, data),
  delete:       (id)        => apiClient.delete(`/admin/houses/${id}`),
};

// ── Academic Calendar (admin write) ───────────────────────────
export const adminAcademicYearsApi = {
  list:   ()         => apiClient.get('/admin/academic-years'),
  create: (data)     => apiClient.post('/admin/academic-years', data),
  update: (id, data) => apiClient.put(`/admin/academic-years/${id}`, data),
};

export const adminTermsApi = {
  list:   (params)   => apiClient.get('/admin/terms', { params }),
  create: (data)     => apiClient.post('/admin/terms', data),
  update: (id, data) => apiClient.put(`/admin/terms/${id}`, data),
};

// ── User Management ───────────────────────────────────────────
export const adminUsersApi = {
  list:           (params)   => apiClient.get('/admin/users', { params }),
  create:         (data)     => apiClient.post('/admin/users', data),
  update:         (id, data) => apiClient.put(`/admin/users/${id}`, data),
  deactivate:     (id)       => apiClient.put(`/admin/users/${id}/deactivate`),
  reactivate:     (id)       => apiClient.put(`/admin/users/${id}/reactivate`),
  resetPassword:  (id, data) => apiClient.put(`/admin/users/${id}/reset-password`, data),
};

// ── Subjects ──────────────────────────────────────────────────
export const adminSubjectsApi = {
  list:   (params)   => apiClient.get('/admin/subjects', { params }),
  create: (data)     => apiClient.post('/admin/subjects', data),
  update: (id, data) => apiClient.put(`/admin/subjects/${id}`, data),
  delete: (id)       => apiClient.delete(`/admin/subjects/${id}`),
};

export const adminClassSubjectsApi = {
  list:   (params) => apiClient.get('/admin/class-subject-assignments', { params }),
  create: (data)   => apiClient.post('/admin/class-subject-assignments', data),
  delete: (id)     => apiClient.delete(`/admin/class-subject-assignments/${id}`),
};

export const adminSectionRulesApi = {
  list:   (params)   => apiClient.get('/admin/subject-section-rules', { params }),
  create: (data)     => apiClient.post('/admin/subject-section-rules', data),
  update: (id, data) => apiClient.put(`/admin/subject-section-rules/${id}`, data),
};

// ── Grading Scale ─────────────────────────────────────────────
export const adminGradingApi = {
  getActive:       ()         => apiClient.get('/admin/grading-scale/active'),
  updateEntry:     (id, data) => apiClient.put(`/admin/grading-scale/entries/${id}`, data),
  updateDivision:  (id, data) => apiClient.put(`/admin/grading-scale/divisions/${id}`, data),
};

// ── Assessment Types ──────────────────────────────────────────
export const adminAssessmentTypesApi = {
  list:       ()         => apiClient.get('/admin/assessment-types'),
  create:     (data)     => apiClient.post('/admin/assessment-types', data),
  update:     (id, data) => apiClient.put(`/admin/assessment-types/${id}`, data),
  deactivate: (id)       => apiClient.delete(`/admin/assessment-types/${id}`),
};

// ── Report Card Settings ──────────────────────────────────────
export const adminReportCardSettingsApi = {
  get:    ()     => apiClient.get('/admin/report-card-settings'),
  update: (data) => apiClient.put('/admin/report-card-settings', data),
};
