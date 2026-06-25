import { useEffect, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import Card from '../../components/common/Card';
import { fetchMyMaterials, trackMaterialClick, downloadMaterialUrl } from '../../api/materials';
import { USE_MOCKS, mockMyMaterials } from '../../api/mockData';
import { formatDate, formatFileSize } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export default function AcMaterials() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setError('');
      try {
        const result = USE_MOCKS ? mockMyMaterials() : (await fetchMyMaterials({ acId: user?.acId })).items;
        setItems(result);
      } catch (err) {
        setItems([]);
        setError(err?.message || 'Unable to load materials.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user?.acId]);

  const handleDownload = async (item) => {
    await trackMaterialClick(item.id);
    if (USE_MOCKS) {
      window.alert(`(Demo) Would download: ${item.fileName}`);
    } else {
      window.open(downloadMaterialUrl(item.id), '_blank');
    }
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, clicks: i.clicks + 1, downloaded: true } : i))
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Material</h1>
          <p>Files shared with your constituency, listed by upload date.</p>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading materials…</p>
        ) : error ? (
          <div className="empty-state">
            <h4>Materials unavailable</h4>
            <p>{error}</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h4>No materials yet</h4>
            <p>Anything Super Admin sends to your AC will appear here.</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th className="data-table__numeric">Clicks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 600 }}>{item.title}</div>
                          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {item.fileName} · {formatFileSize(item.fileSize)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(item.uploadedAt)}</td>
                    <td className="data-table__numeric">{item.clicks}</td>
                    <td>
                      <button className="btn btn--primary btn--sm" onClick={() => handleDownload(item)}>
                        <Download size={13} />
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
