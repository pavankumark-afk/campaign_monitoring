import { apiClient } from './client';

/**
 * Backend contract (FastAPI):
 *
 * GET /sir/summary?scope=super_admin
 *   -> { totalElectors, totalContacted, totalPending, totalACs, totalBLAs, lastSyncedAt }
 *
 * GET /sir/summary?scope=ac&ac_id=AC012
 *   -> { totalElectors, totalContacted, totalPending, totalBoothAgents, lastSyncedAt }
 *
 * GET /sir/ac-breakdown   (super admin only — used for the AC-wise tally list)
 *   -> [{ acId, acName, totalElectors, contacted, pending }]
 *
 * GET /sir/booth-breakdown?ac_id=AC012   (AC level — booth agent wise tally)
 *   -> [{ boothId, boothName, agentName, totalElectors, contacted, pending }]
 *
 * GET /sir/trend?scope=super_admin|ac&ac_id=...&days=14
 *   -> [{ date: "2026-06-10", contacted: 1200 }, ...]
 */

export const fetchSirSummary = async (params) => {
  const { data } = await apiClient.get('/sir/summary', { params });
  return data;
};

export const fetchAcBreakdown = async () => {
  const { data } = await apiClient.get('/sir/ac-breakdown');
  return data;
};

export const fetchBoothBreakdown = async (acId) => {
  const { data } = await apiClient.get('/sir/booth-breakdown', { params: { ac_id: acId } });
  return data;
};

export const fetchSirTrend = async (params) => {
  const { data } = await apiClient.get('/sir/trend', { params });
  return data;
};
