import { apiClient, uploadClient } from './client';

const UPLOAD_TARGET_META_KEY = 'sir_upload_target_meta';

function readUploadTargetMeta() {
  try {
    const raw = localStorage.getItem(UPLOAD_TARGET_META_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeUploadTargetMeta(meta) {
  try {
    localStorage.setItem(UPLOAD_TARGET_META_KEY, JSON.stringify(meta));
  } catch {
    // Non-blocking cache write.
  }
}

function getUploadTargetMetaById(documentId) {
  const meta = readUploadTargetMeta();
  return meta[String(documentId)] || null;
}

function setUploadTargetMeta(documentId, payload) {
  if (documentId == null) return;
  const meta = readUploadTargetMeta();
  meta[String(documentId)] = payload;
  writeUploadTargetMeta(meta);
}

const normalizeAcId = (value) => String(value ?? '').trim().toLowerCase();

function getCachedMyMaterials(acId) {
  const meta = readUploadTargetMeta();
  const myAc = normalizeAcId(acId);

  const rows = Object.entries(meta)
    .filter(([, payload]) => {
      if (!payload || typeof payload !== 'object') return false;
      if (payload.targetScope === 'all') return true;
      const ids = Array.isArray(payload.acIds) ? payload.acIds : [];
      return ids.some((id) => normalizeAcId(id) === myAc);
    })
    .map(([docId, payload]) => ({
      id: Number(docId),
      title: payload.title || `Material ${docId}`,
      fileName: payload.fileName || payload.title || `material-${docId}`,
      fileSize: null,
      uploadedAt: payload.uploadedAt || null,
      clicks: 0,
      downloaded: false,
    }))
    .filter((row) => Number.isFinite(row.id))
    .sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime());

  return { items: rows };
}

function normalizeMetricsRow(row) {
  const localTargetMeta = getUploadTargetMetaById(row.document_id);
  const targetType = String(row.target_type || '').toUpperCase();
  const uploadedAt =
    row.created_at ||
    row.uploaded_at ||
    row.createdAt ||
    localTargetMeta?.uploadedAt ||
    null;

  let targetScope = 'all';
  if (targetType === 'SPECIFIC') {
    targetScope = 'selected';
  } else if (targetType === 'ALL') {
    targetScope = 'all';
  } else if (localTargetMeta?.targetScope === 'selected') {
    targetScope = 'selected';
  }

  const localAcIds = Array.isArray(localTargetMeta?.acIds) ? localTargetMeta.acIds : [];

  return {
    id: row.document_id,
    title: row.document_title,
    fileName: row.document_title,
    fileSize: null,
    uploadedAt,
    targetScope,
    acIds: localAcIds,
    // Downloads = unique ACs/people downloaded at least once.
    downloadCount: row.unique_people_downloaded ?? 0,
    // Clicks = total download events.
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
  const extension = String(file?.name || '')
    .split('.')
    .pop()
    ?.trim()
    ?.toLowerCase();
  const normalizedFileType = extension || 'file';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', title);
  formData.append('fileType', normalizedFileType);
  formData.append('content', '');
  formData.append('targetType', targetScope === 'selected' ? 'SPECIFIC' : 'ALL');
  const recipientIds = specificIds ?? acIds;
  
  if (targetScope === 'selected' && recipientIds?.length) {
    formData.append('specificIds', JSON.stringify(recipientIds));
  }

  const { data } = await uploadClient.post('/documents/upload', formData, {
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });

  const documentId = data?.document?.id;
  if (documentId != null) {
    setUploadTargetMeta(documentId, {
      targetScope,
      acIds: Array.isArray(recipientIds) ? recipientIds : [],
      uploadedAt: new Date().toISOString(),
      title,
      fileName: file?.name || title,
    });
  }

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
  try {
    const { data } = await apiClient.get('/documents/list', { params });
    const rows = Array.isArray(data?.documents) ? data.documents : [];

    return {
      items: rows.map((row) => ({
        id: row.id,
        title: row.title ?? 'Material',
        fileName: row.title ?? 'file',
        fileSize: null,
        uploadedAt: row.created_at || null,
        clicks: 0,
        downloaded: false,
      })),
    };
  } catch {
    return getCachedMyMaterials(params?.acId);
  }
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
