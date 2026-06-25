import { apiClient } from './client';

/**
 * Note: AC endpoints not available in Express backend.
 * This endpoint needs to be implemented in the backend.
 * 
 * Placeholder for future implementation:
 * GET /acs -> [{ id, name, district, totalElectors }]
 */
export const fetchAllACs = async () => {
  const { data } = await apiClient.get('/mlas/monitor');
  const rows = Array.isArray(data) ? data : [];

  const acRows = rows.filter((row) => {
    const role = String(row?.role ?? '').toLowerCase();
    return role === 'ac' || role === 'mla' || (role && role !== 'super_admin' && role !== 'admin');
  });

  if (acRows.length === 0) {
    throw new Error('No AC users found in /mlas/monitor response');
  }

  return acRows
    .map((row) => ({
      // Keep numeric MLA id so upload "specificIds" follows backend numeric recipient path.
      id: Number(row.id),
      name: row.name || `AC ${row.id}`,
      district: row.mobile ? `Mobile ${row.mobile}` : 'AC',
    }))
    .filter((row) => Number.isInteger(row.id));
};
