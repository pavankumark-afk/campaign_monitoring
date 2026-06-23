import { apiClient, uploadClient } from './client';

/**
 * Backend contract (FastAPI):
 *
 * POST /materials/upload   (multipart/form-data, super admin only)
 *   fields: file, title, target_scope ("all" | "selected"), ac_ids[] (when selected)
 *   -> { id, title, fileName, fileUrl, uploadedAt, targetScope, acIds }
 *
 * GET /materials/uploads?page=&search=&from=&to=
 *   -> { items: [{ id, title, fileName, fileSize, uploadedAt, targetScope, acIds, downloadCount, clickCount }], total }
 *
 * GET /materials/uploads/:id/stats
 *   -> { id, title, totalTargetACs, downloadedByACs: [{ acId, acName, downloadedAt, clicks }], notDownloadedACs: [{ acId, acName }] }
 *
 * DELETE /materials/uploads/:id
 *
 * --- AC-level ---
 * GET /materials/my-list?page=&from=&to=
 *   -> { items: [{ id, title, fileName, fileSize, uploadedAt, clicks, downloaded }], total }
 *
 * POST /materials/:id/track-click      (fire when AC user opens/clicks a row, for analytics)
 * GET  /materials/:id/download         (returns redirect / blob — actual file)
 */

export const uploadMaterial = async ({ file, title, targetScope, acIds, onProgress }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('target_scope', targetScope);
  if (targetScope === 'selected' && acIds?.length) {
    acIds.forEach((id) => formData.append('ac_ids', id));
  }

  const { data } = await uploadClient.post('/materials/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });
  return data;
};

export const fetchUploads = async (params) => {
  const { data } = await apiClient.get('/materials/uploads', { params });
  return data;
};

export const fetchUploadStats = async (materialId) => {
  const { data } = await apiClient.get(`/materials/uploads/${materialId}/stats`);
  return data;
};

export const deleteMaterial = async (materialId) => {
  await apiClient.delete(`/materials/uploads/${materialId}`);
};

export const fetchMyMaterials = async (params) => {
  const { data } = await apiClient.get('/materials/my-list', { params });
  return data;
};

export const trackMaterialClick = async (materialId) => {
  try {
    await apiClient.post(`/materials/${materialId}/track-click`);
  } catch {
    // analytics tracking should never block the actual download
  }
};

export const downloadMaterialUrl = (materialId) => {
  const base = apiClient.defaults.baseURL;
  return `${base}/materials/${materialId}/download`;
};
