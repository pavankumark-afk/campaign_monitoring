import { apiClient } from './client';

/**
 * Note: SIR (Voter Monitoring) endpoints not available in Express backend.
 * These endpoints need to be implemented in the backend:
 * - GET /sir/summary
 * - GET /sir/ac-breakdown
 * - GET /sir/booth-breakdown
 * - GET /sir/trend
 */

export const fetchSirSummary = async (params) => {
  console.warn('fetchSirSummary: Not implemented in Express backend');
  throw new Error('SIR endpoints not yet implemented in backend');
};

export const fetchAcBreakdown = async () => {
  console.warn('fetchAcBreakdown: Not implemented in Express backend');
  throw new Error('SIR endpoints not yet implemented in backend');
};

export const fetchBoothBreakdown = async (acId) => {
  console.warn('fetchBoothBreakdown: Not implemented in Express backend');
  throw new Error('SIR endpoints not yet implemented in backend');
};

export const fetchSirTrend = async (params) => {
  console.warn('fetchSirTrend: Not implemented in Express backend');
  throw new Error('SIR endpoints not yet implemented in backend');
};
