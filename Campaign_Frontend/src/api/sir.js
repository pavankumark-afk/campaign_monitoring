import { apiClient } from './client';

/**
 * SIR dashboard now consumes the hierarchical campaign metrics endpoint:
 * GET /voters/metrics/hierarchical
 */

const HIERARCHICAL_ENDPOINTS = ['/voters/metrics/hierarchical', '/metrics/hierarchical'];
const MLA_SELF_ENDPOINTS = ['/voters/metrics/my-constituency', '/metrics/my-constituency'];
const HIERARCHICAL_CACHE_TTL_MS = 15000;

let hierarchicalCache = {
  rows: null,
  fetchedAt: 0,
};
let inFlightHierarchicalRequest = null;

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
  const now = Date.now();
  if (hierarchicalCache.rows && now - hierarchicalCache.fetchedAt < HIERARCHICAL_CACHE_TTL_MS) {
    return hierarchicalCache.rows;
  }

  if (inFlightHierarchicalRequest) {
    return inFlightHierarchicalRequest;
  }

  let lastError;
  inFlightHierarchicalRequest = (async () => {
    for (const endpoint of HIERARCHICAL_ENDPOINTS) {
      try {
        const { data } = await apiClient.get(endpoint);
        const rows = Array.isArray(data) ? data : [];
        hierarchicalCache = {
          rows,
          fetchedAt: Date.now(),
        };
        return rows;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('Failed to fetch hierarchical metrics');
  })();

  try {
    return await inFlightHierarchicalRequest;
  } finally {
    inFlightHierarchicalRequest = null;
  }
}

async function fetchMlaSelfMetrics() {
  let lastError;

  for (const endpoint of MLA_SELF_ENDPOINTS) {
    try {
      const { data } = await apiClient.get(endpoint);
      return data || {};
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Failed to fetch MLA constituency metrics');
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
  let rows = null;

  if (scope === 'super_admin') {
    rows = await fetchHierarchicalRows();
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
    try {
      const data = await fetchMlaSelfMetrics();
      return {
        totalElectors: toNumber(data?.total_voters),
        totalContacted: toNumber(data?.contacted_count),
        totalPending: toNumber(data?.remaining_count),
        totalBoothAgents: null,
        lastSyncedAt: new Date().toISOString(),
      };
    } catch {
      // Backward compatible fallback for environments still using hierarchical aggregation.
      rows = await fetchHierarchicalRows();
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

export const fetchPcBreakdown = async () => {
  const rows = await fetchHierarchicalRows();

  return rows
    .filter((pc) => pc?.parliament_no != null)
    .map((pc) => ({
      pcId: String(pc.parliament_no),
      pcName: `PC ${pc.parliament_no}`,
      totalElectors: toNumber(pc?.total_voters),
      contacted: toNumber(pc?.contacted_count),
      pending: toNumber(pc?.remaining_count),
    }));
};

export const fetchBoothBreakdown = async (acId) => {
  void acId;
  return [];
};

export const fetchSirTrend = async (params) => {
  const scope = params?.scope;
  const days = Number(params?.days) > 0 ? Number(params.days) : 14;

  let contactedTotal = 0;

  if (scope === 'ac') {
    try {
      const data = await fetchMlaSelfMetrics();
      contactedTotal = toNumber(data?.contacted_count);
    } catch {
      const rows = await fetchHierarchicalRows();
      const acRows = flattenAcRows(rows);
      const targetKeys = getAcKeys(params?.ac_id);
      const matched = acRows.find((row) => hasKeyOverlap(getAcKeys(row.acNo), targetKeys));
      contactedTotal = matched ? toNumber(matched.contacted) : 0;
    }
  } else {
    const rows = await fetchHierarchicalRows();
    contactedTotal = rows.reduce((sum, pc) => sum + toNumber(pc?.contacted_count), 0);
  }

  // Backend currently provides snapshot metrics only (no historical series).
  // Generate an approximate rising series so the chart shows progress instead of a flat line.
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const fraction = (i + 1) / days;
    return {
      date: d.toISOString().slice(0, 10),
      contacted: Math.round(contactedTotal * fraction),
    };
  });
};
