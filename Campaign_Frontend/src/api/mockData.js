// Lightweight mock data so the UI is fully clickable before the FastAPI
// backend is wired up. Toggle off via VITE_USE_MOCKS=false once real
// endpoints exist — see src/api/*.js for the real contracts.

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false';

const ACS = Array.from({ length: 175 }, (_, i) => {
  const id = `AC${String(i + 1).padStart(3, '0')}`;
  const total = 80000 + Math.floor(Math.random() * 60000);
  const contacted = Math.floor(total * (0.35 + Math.random() * 0.6));
  return {
    id,
    name: `${id} - Constituency ${i + 1}`,
    district: `District ${Math.ceil((i + 1) / 12)}`,
    totalElectors: total,
    contacted,
  };
});

export const mockACs = ACS;

export function mockSirSummary(scope, acId) {
  if (scope === 'super_admin') {
    const totalElectors = ACS.reduce((s, a) => s + a.totalElectors, 0);
    const totalContacted = ACS.reduce((s, a) => s + a.contacted, 0);
    return {
      totalElectors,
      totalContacted,
      totalPending: totalElectors - totalContacted,
      totalACs: ACS.length,
      totalBLAs: 5400,
      lastSyncedAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    };
  }
  const ac = ACS.find((a) => a.id === acId) || ACS[0];
  return {
    totalElectors: ac.totalElectors,
    totalContacted: ac.contacted,
    totalPending: ac.totalElectors - ac.contacted,
    totalBoothAgents: 28,
    lastSyncedAt: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
  };
}

export function mockAcBreakdown() {
  return ACS.map((a) => ({
    acId: a.id,
    acName: a.name,
    totalElectors: a.totalElectors,
    contacted: a.contacted,
    pending: a.totalElectors - a.contacted,
  }));
}

export function mockBoothBreakdown(acId) {
  const ac = ACS.find((a) => a.id === acId) || ACS[0];
  return Array.from({ length: 18 }, (_, i) => {
    const total = Math.floor(ac.totalElectors / 18);
    const contacted = Math.floor(total * (0.3 + Math.random() * 0.65));
    return {
      boothId: `${acId}-B${i + 1}`,
      boothName: `Booth ${i + 1}`,
      agentName: ['R. Kumar', 'S. Reddy', 'P. Naidu', 'M. Rao', 'A. Sharma'][i % 5],
      totalElectors: total,
      contacted,
      pending: total - contacted,
    };
  });
}

export function mockSirTrend(days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return {
      date: d.toISOString().slice(0, 10),
      contacted: Math.floor(8000 + Math.random() * 6000 + i * 400),
    };
  });
}

const TITLES = [
  'Voter Awareness Poster - Phase 2',
  'Form 6 Filing Instructions',
  'Booth Agent Daily Checklist',
  'SIR Field Guide (Updated)',
  'Door-to-Door Script - Telugu',
  'Election Commission Circular 14',
];

export function mockUploads() {
  return Array.from({ length: 14 }, (_, i) => {
    const targetScope = i % 3 === 0 ? 'all' : 'selected';
    const acIds = targetScope === 'all' ? [] : ACS.slice(i, i + 4).map((a) => a.id);
    const d = new Date();
    d.setDate(d.getDate() - i * 2);
    return {
      id: `mat-${i + 1}`,
      title: TITLES[i % TITLES.length] + (i >= TITLES.length ? ` (${i})` : ''),
      fileName: `material_${i + 1}.pdf`,
      fileSize: 200000 + Math.floor(Math.random() * 4000000),
      uploadedAt: d.toISOString(),
      targetScope,
      acIds,
      downloadCount: Math.floor(Math.random() * (targetScope === 'all' ? 175 : acIds.length)),
      clickCount: Math.floor(Math.random() * 300),
    };
  });
}

export function mockUploadStats(materialId) {
  const targetACs = ACS.slice(0, 30);
  const downloadedCount = Math.floor(targetACs.length * 0.6);
  return {
    id: materialId,
    title: 'Voter Awareness Poster - Phase 2',
    totalTargetACs: targetACs.length,
    downloadedByACs: targetACs.slice(0, downloadedCount).map((a) => ({
      acId: a.id,
      acName: a.name,
      downloadedAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 72).toISOString(),
      clicks: 1 + Math.floor(Math.random() * 5),
    })),
    notDownloadedACs: targetACs.slice(downloadedCount).map((a) => ({ acId: a.id, acName: a.name })),
  };
}

export function mockMyMaterials() {
  return mockUploads().map(({ id, title, fileName, fileSize, uploadedAt, clickCount }) => ({
    id,
    title,
    fileName,
    fileSize,
    uploadedAt,
    clicks: Math.floor(clickCount / 8),
    downloaded: Math.random() > 0.4,
  }));
}

// --- Mock auth (demo only) ---
// superadmin / admin123  ->  Super Admin
// ac001 / ac123          ->  AC001 - Constituency 1
export function mockLogin(username, password) {
  const u = username.trim().toLowerCase();
  if (u === 'superadmin' && password === 'admin123') {
    return {
      access_token: 'mock.super.token',
      role: 'super_admin',
      name: 'Election Super Admin',
      id: 'superadmin',
    };
  }
  const acMatch = u.match(/^ac0*?(\d{1,3})$/);
  if (acMatch && password === 'ac123') {
    const num = parseInt(acMatch[1], 10);
    const ac = ACS.find((a) => a.id === `AC${String(num).padStart(3, '0')}`);
    if (ac) {
      return {
        access_token: `mock.ac.token.${ac.id}`,
        role: 'ac',
        name: `${ac.name} Coordinator`,
        id: u,
        ac_id: ac.id,
        ac_name: ac.name,
      };
    }
  }
  const err = new Error('Invalid credentials');
  err.response = { data: { detail: 'Invalid username or password. Try superadmin/admin123 or ac001/ac123 (demo).' } };
  throw err;
}

export function mockProfile() {
  const raw = localStorage.getItem('sir_user');
  if (!raw) throw new Error('No session');
  const u = JSON.parse(raw);
  return { id: u.id, name: u.name, role: u.role, acId: u.acId, acName: u.acName };
}
