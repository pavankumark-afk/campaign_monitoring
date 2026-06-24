import { apiClient } from './client';

/**
 * SIR dashboard now consumes the hierarchical campaign metrics endpoint:
 * GET /voters/metrics/hierarchical
 */

const HIERARCHICAL_ENDPOINTS = ['/voters/metrics/hierarchical', '/metrics/hierarchical'];

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const normalizeKey = (value) => String(value ?? '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

const getAcKeys = (value) => {
  const raw = normalizeKey(value);
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
  return new Set([raw, digits, `ac${digits}`]);
};

const hasKeyOverlap = (keysA, keysB) => {
  for (const k of keysA) {
    if (k && keysB.has(k)) return true;
  }
  return false;
};

const formatAcId = (acNo) => {
  const raw = String(acNo ?? '').trim();
  if (!raw) return 'AC-NA';
  if (/^ac/i.test(raw)) return raw.toUpperCase();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return raw;
  return `AC${digits.padStart(3, '0')}`;
};

async function fetchHierarchicalRows() {
  let lastError;
  for (const endpoint of HIERARCHICAL_ENDPOINTS) {
    try {
      const { data } = await apiClient.get(endpoint);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Failed to fetch hierarchical metrics');
}

function flattenAcRows(rows) {
  return rows.flatMap((pc) => {
    const parliamentNo = pc?.parliament_no;
    const acs = Array.isArray(pc?.acs) ? pc.acs : [];
    return acs.map((ac) => ({
      parliamentNo,
      acNo: ac?.ac_no,
      totalElectors: toNumber(ac?.total_voters),
      contacted: toNumber(ac?.contacted_count),
      pending: toNumber(ac?.remaining_count),
    }));
  });
}

export const fetchSirSummary = async (params) => {
  const scope = params?.scope;
  const rows = await fetchHierarchicalRows();

  if (scope === 'super_admin') {
    const totalElectors = rows.reduce((sum, pc) => sum + toNumber(pc?.total_voters), 0);
    const totalContacted = rows.reduce((sum, pc) => sum + toNumber(pc?.contacted_count), 0);
    const totalPending = rows.reduce((sum, pc) => sum + toNumber(pc?.remaining_count), 0);
    const totalACs = rows.reduce((sum, pc) => sum + (Array.isArray(pc?.acs) ? pc.acs.length : 0), 0);

    return {
      totalElectors,
      totalContacted,
      totalPending,
      totalACs,
      totalBLAs: null,
      lastSyncedAt: new Date().toISOString(),
    };
  }

  if (scope === 'ac') {
    const acRows = flattenAcRows(rows);
    const targetKeys = getAcKeys(params?.ac_id);
    const matched = acRows.find((row) => hasKeyOverlap(getAcKeys(row.acNo), targetKeys));

    if (!matched) {
      throw new Error('AC metrics not found in hierarchical response');
    }

    return {
      totalElectors: matched.totalElectors,
      totalContacted: matched.contacted,
      totalPending: matched.pending,
      totalBoothAgents: null,
      lastSyncedAt: new Date().toISOString(),
    };
  }

  throw new Error(`Unsupported scope: ${scope}`);
};

export const fetchAcBreakdown = async () => {
  const rows = await fetchHierarchicalRows();
  const acRows = flattenAcRows(rows);

  return acRows.map((row) => ({
    acId: formatAcId(row.acNo),
    acName: `AC ${row.acNo} (PC ${row.parliamentNo})`,
    totalElectors: row.totalElectors,
    contacted: row.contacted,
    pending: row.pending,
  }));
};

export const fetchBoothBreakdown = async (acId) => {
  void acId;
  return [];
};

export const fetchSirTrend = async (params) => {
  void params;
  return [];
};
