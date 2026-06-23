import { useEffect, useState, useCallback } from 'react';
import { Trash2, Globe2, Users, BarChart3, X } from 'lucide-react';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import MaterialUploadForm from './MaterialUploadForm';
import { fetchAllACs } from '../../api/acs';
import { uploadMaterial, fetchUploads, fetchUploadStats, deleteMaterial } from '../../api/materials';
import { USE_MOCKS, mockACs, mockUploads, mockUploadStats } from '../../api/mockData';
import { formatDate, formatFileSize, formatNumber } from '../../utils/format';

export default function MaterialUploads() {
  const [allACs, setAllACs] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statsModal, setStatsModal] = useState(null); // { id, data }

  const loadACs = useCallback(async () => {
    if (USE_MOCKS) {
      setAllACs(mockACs);
      return;
    }

    try {
      setAllACs(await fetchAllACs());
    } catch {
      setAllACs(mockACs);
    }
  }, []);

  const loadUploads = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const result = USE_MOCKS ? mockUploads() : await fetchUploads({});
      setUploads(result);
    } catch {
      setUploads(mockUploads());
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadACs();
    loadUploads();
  }, [loadACs, loadUploads]);

  const handleUpload = async ({ file, title, targetScope, acIds }) => {
    setIsUploading(true);
    setProgress(0);
    try {
      if (USE_MOCKS) {
        for (let p = 20; p <= 100; p += 20) {
          await new Promise((r) => setTimeout(r, 150));
          setProgress(p);
        }
      } else {
        await uploadMaterial({ file, title, targetScope, acIds, onProgress: setProgress });
      }
      await loadUploads();
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this material? ACs will no longer see it in their list.')) return;
    if (!USE_MOCKS) await deleteMaterial(id);
    setUploads((prev) => prev.filter((u) => u.id !== id));
  };

  const openStats = async (id) => {
    let data;
    try {
      data = USE_MOCKS ? mockUploadStats(id) : await fetchUploadStats(id);
    } catch {
      data = mockUploadStats(id);
    }
    setStatsModal({ id, data });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Material Uploads</h1>
          <p>Push files to a specific AC, a few ACs, or all 175 ACs at once.</p>
        </div>
      </div>

      <div className="page-section">
        <Card title="Upload new material">
          <MaterialUploadForm
            allACs={allACs}
            onUpload={handleUpload}
            isUploading={isUploading}
            progress={progress}
          />
        </Card>
      </div>

      <Card title="Upload history" subtitle="Recent materials sent to ACs">
        {isLoadingList ? (
          <p style={{ color: 'var(--color-text-muted)' }}>Loading uploads…</p>
        ) : uploads.length === 0 ? (
          <div className="empty-state">
            <h4>No materials uploaded yet</h4>
            <p>Files you upload above will show up here.</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Sent to</th>
                  <th>Date</th>
                  <th>Size</th>
                  <th className="data-table__numeric">Downloads</th>
                  <th className="data-table__numeric">Clicks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {uploads.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{u.fileName}</div>
                    </td>
                    <td>
                      {u.targetScope === 'all' ? (
                        <Badge tone="success"><Globe2 size={11} /> All ACs</Badge>
                      ) : (
                        <Badge tone="neutral"><Users size={11} /> {u.acIds.length} AC{u.acIds.length > 1 ? 's' : ''}</Badge>
                      )}
                    </td>
                    <td>{formatDate(u.uploadedAt)}</td>
                    <td>{formatFileSize(u.fileSize)}</td>
                    <td className="data-table__numeric">{formatNumber(u.downloadCount)}</td>
                    <td className="data-table__numeric">{formatNumber(u.clickCount)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button className="btn btn--ghost btn--icon btn--sm" title="View stats" onClick={() => openStats(u.id)}>
                          <BarChart3 size={14} />
                        </button>
                        <button className="btn btn--ghost btn--icon btn--sm" title="Delete" onClick={() => handleDelete(u.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {statsModal && <StatsModal payload={statsModal} onClose={() => setStatsModal(null)} />}
    </div>
  );
}

function StatsModal({ payload, onClose }) {
  const { data } = payload;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3>{data.title}</h3>
          <button className="btn btn--ghost btn--icon btn--sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="modal__body">
          <p className="field-hint" style={{ marginBottom: 14 }}>
            {data.downloadedByACs.length} of {data.totalTargetACs} targeted ACs have downloaded this file.
          </p>

          <h4 style={{ fontSize: 13, marginBottom: 8 }}>Downloaded</h4>
          <div className="data-table-wrap" style={{ marginBottom: 18 }}>
            <table className="data-table">
              <thead>
                <tr><th>AC</th><th className="data-table__numeric">Clicks</th><th>Last downloaded</th></tr>
              </thead>
              <tbody>
                {data.downloadedByACs.map((a) => (
                  <tr key={a.acId}>
                    <td>{a.acName}</td>
                    <td className="data-table__numeric">{a.clicks}</td>
                    <td>{formatDate(a.downloadedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.notDownloadedACs.length > 0 && (
            <>
              <h4 style={{ fontSize: 13, marginBottom: 8 }}>Not yet downloaded</h4>
              <div className="data-table-wrap">
                <table className="data-table">
                  <tbody>
                    {data.notDownloadedACs.map((a) => (
                      <tr key={a.acId}>
                        <td>{a.acName}</td>
                        <td style={{ textAlign: 'right' }}><Badge tone="warning">Pending</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
