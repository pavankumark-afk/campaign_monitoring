export const formatNumber = (n) => {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-IN').format(n);
};

export const formatPercent = (done, total) => {
  if (!total) return '0%';
  const pct = (Number(done) / Number(total)) * 100;
  if (!Number.isFinite(pct) || pct <= 0) return '0%';

  // Show precise display value without whole-number rounding.
  const truncated = Math.trunc(pct * 10000) / 10000;
  return `${truncated.toLocaleString('en-IN', {
    minimumFractionDigits: truncated < 1 ? 2 : 0,
    maximumFractionDigits: 4,
  })}%`;
};

export const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatRelativeTime = (iso) => {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

export const formatFileSize = (bytes) => {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
