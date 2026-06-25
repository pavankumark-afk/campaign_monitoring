import { useEffect, useMemo, useState } from 'react';
import Card from '../../components/common/Card';
import StatTile from '../../components/common/StatTile';
import { fetchUploads } from '../../api/materials';
import { USE_MOCKS, mockUploads } from '../../api/mockData';
import { formatDate, formatNumber } from '../../utils/format';

export default function MaterialDownloadStats() {
  const [uploads, setUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState('downloadCount');

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const result = USE_MOCKS ? mockUploads() : await fetchUploads({});
        setUploads(result);
      } catch {
        setUploads(mockUploads());
      }
      setIsLoading(false);
    })();
  }, []);

  const totals = useMemo(() => {
    return uploads.reduce(
      (acc, u) => ({
        downloads: acc.downloads + u.downloadCount,
        clicks: acc.clicks + u.clickCount,
      }),
      { downloads: 0, clicks: 0 }
    );
  }, [uploads]);

  const sorted = useMemo(() => {
    return [...uploads].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [uploads, sortBy]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Download Statistics</h1>
          <p>Engagement across every material you've uploaded — clicks and downloads by ACs.</p>
        </div>
      </div>

      <div className="stat-grid page-section" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatTile label="Materials uploaded" value={formatNumber(uploads.length)} />
        <StatTile label="Total downloads" value={formatNumber(totals.downloads)} />
        <StatTile label="Total clicks" value={formatNumber(totals.clicks)} />
      </div>

      <Card
        title="By material"
        subtitle="Click a column header to sort"
      >
        {isLoading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading…</p>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Uploaded</th>
                  <th
                    className="data-table__numeric"
                    style={{ cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => setSortBy('clickCount')}
                  >
                    Clicks {sortBy === 'clickCount' && '↓'}
                  </th>
                  <th
                    className="data-table__numeric"
                    style={{ cursor: 'pointer', textAlign: 'left' }}
                    onClick={() => setSortBy('downloadCount')}
                  >
                    Downloads {sortBy === 'downloadCount' && '↓'}
                  </th>
                  <th className="data-table__numeric" style={{ textAlign: 'left' }}>Conversion</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((u) => {
                  const conversion = u.clickCount > 0 ? Math.round((u.downloadCount / u.clickCount) * 100) : 0;
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.title}</td>
                      <td>{formatDate(u.uploadedAt)}</td>
                      <td className="data-table__numeric" style={{ textAlign: 'left' }}>{formatNumber(u.clickCount)}</td>
                      <td className="data-table__numeric" style={{ textAlign: 'left' }}>{formatNumber(u.downloadCount)}</td>
                      <td className="data-table__numeric" style={{ textAlign: 'left' }}>{conversion}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
