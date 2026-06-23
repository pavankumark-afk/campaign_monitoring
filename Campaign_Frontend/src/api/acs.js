import { apiClient } from './client';

/**
 * Note: AC endpoints not available in Express backend.
 * This endpoint needs to be implemented in the backend.
 * 
 * Placeholder for future implementation:
 * GET /acs -> [{ id, name, district, totalElectors }]
 */
export const fetchAllACs = async () => {
  console.warn('fetchAllACs: Not implemented in Express backend');
  throw new Error('AC endpoints not yet implemented in backend');
};
