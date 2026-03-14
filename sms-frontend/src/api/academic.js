/**
 * academic.js — Read-only API calls for classes, streams, school sections, academic years.
 * All roles can access these (authenticated).
 */

import { apiClient } from './client.js';

export const classesApi = {
  list: (params) => apiClient.get('/classes', { params }),
};

export const streamsApi = {
  /** List streams. Pass { classId } to filter by class. Defaults to current academic year. */
  list: (params) => apiClient.get('/streams', { params }),
};

export const schoolSectionsApi = {
  list: () => apiClient.get('/school-sections'),
};

export const academicYearsApi = {
  list: () => apiClient.get('/academic-years'),
};
