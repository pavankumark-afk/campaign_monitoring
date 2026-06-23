import { apiClient } from './client';

/**
 * GET /acs
 *   -> [{ id, name, district, totalElectors }]   (all 175 ACs, super admin only)
 */
export const fetchAllACs = async () => {
  const { data } = await apiClient.get('/acs');
  return data;
};
