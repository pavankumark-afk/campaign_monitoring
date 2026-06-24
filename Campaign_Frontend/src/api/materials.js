import { apiClient, uploadClient } from './client';

function normalizeMetricsRow(row) {
  return {
    id: row.document_id,
    title: row.document_title,
    fileName: row.document_title,
    fileSize: null,
    uploadedAt: row.created_at ?? null,
    targetScope: 'all',
    acIds: [],
    downloadCount: row.total_download_count ?? 0,
    clickCount: row.total_download_count ?? 0,
    downloadedByACs: (row.each_mla_download_breakdown || []).map((item) => ({
      acId: String(item.mla_id),
      acName: item.mla_name,
      downloadedAt: null,
      clicks: item.times_downloaded ?? 0,
    })),
  };
}

/**
 * Backend contract (Express):
 *
 * POST /documents/upload   (multipart/form-data, super admin only)
 *   fields: file, title, targetType ("ALL" | "SPECIFIC"), specificIds[] (when selected)
 *   -> { message, document }
 *
 * GET /documents/:docId/download
 *   -> file blob
 *
 * GET /documents/metrics   (super admin only)
 *   -> { ... }
 */

export const uploadMaterial = async ({ file, title, targetScope, specificIds, acIds, onProgress }) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('targetType', targetScope === 'selected' ? 'SPECIFIC' : 'ALL');
  const recipientIds = specificIds ?? acIds;
  
  if (targetScope === 'selected' && recipientIds?.length) {
    formData.append('specificIds', JSON.stringify(recipientIds));
  }

  const { data } = await uploadClient.post('/documents/upload', formData, {
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
  const { data } = await apiClient.get('/documents/metrics', { params });
  return Array.isArray(data) ? data.map(normalizeMetricsRow) : [];
};

export const fetchUploadStats = async (materialId) => {
  const { data } = await apiClient.get('/documents/metrics');
  const row = Array.isArray(data) ? data.find((item) => String(item.document_id) === String(materialId)) : null;
  if (!row) {
    return {
      id: materialId,
      title: 'Material',
      totalTargetACs: 0,
      downloadedByACs: [],
      notDownloadedACs: [],
    };
  }

  const normalized = normalizeMetricsRow(row);
  return {
    id: normalized.id,
    title: normalized.title,
    totalTargetACs: normalized.downloadedByACs.length,
    downloadedByACs: normalized.downloadedByACs,
    notDownloadedACs: [],
  };
};

export const deleteMaterial = async (materialId) => {
  console.warn('deleteMaterial: Delete functionality not implemented in Express backend');
  // Awaiting backend implementation
};

export const fetchMyMaterials = async (params) => {
  console.warn('fetchMyMaterials: Not implemented in Express backend');
  throw new Error('User materials list not yet implemented in backend');
};

export const trackMaterialClick = async (materialId) => {
  try {
    // Analytics tracking not yet implemented
    console.log('Click tracked for material:', materialId);
  } catch {
    // analytics tracking should never block the actual download
  }
};

export const downloadMaterialUrl = (materialId) => {
  const base = apiClient.defaults.baseURL;
  return `${base}/documents/${materialId}/download`;
};
