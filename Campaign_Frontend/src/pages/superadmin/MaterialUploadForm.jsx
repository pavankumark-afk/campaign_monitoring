import { useState, useRef } from 'react';
import { UploadCloud, FileText, Loader2 } from 'lucide-react';
import AcPicker from '../../components/common/AcPicker';
import { formatFileSize } from '../../utils/format';

const SCOPES = [
  { id: 'all', label: 'All 175 ACs' },
  { id: 'selected', label: 'Specific AC(s)' },
];

export default function MaterialUploadForm({ allACs, onUpload, isUploading, progress }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [formError, setFormError] = useState('');
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!file) return setFormError('Please choose a file to upload.');
    if (!title.trim()) return setFormError('Please give this material a title.');
    if (scope === 'selected' && selectedIds.length === 0) {
      return setFormError('Select at least one AC, or switch to "All 175 ACs".');
    }
    await onUpload({ file, title: title.trim(), targetScope: scope, acIds: selectedIds });
    setFile(null);
    setTitle('');
    setScope('all');
    setSelectedIds([]);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="material-title">Title</label>
        <input
          id="material-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Voter Awareness Poster - Phase 2"
        />
      </div>

      <div className="field">
        <label>File</label>
        <div
          className={`dropzone ${isDragOver ? 'dropzone--active' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            hidden
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          {file ? (
            <>
              <FileText size={26} />
              <div className="dropzone__filename">{file.name}</div>
              <div className="field-hint">{formatFileSize(file.size)} · click to replace</div>
            </>
          ) : (
            <>
              <UploadCloud size={26} />
              <div className="field-hint" style={{ marginTop: 6 }}>
                Click to browse, or drag a file here
              </div>
            </>
          )}
        </div>
        {isUploading && (
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <div className="field">
        <label>Send to</label>
        <div className="scope-selector">
          {SCOPES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`scope-pill ${scope === s.id ? 'scope-pill--active' : ''}`}
              onClick={() => setScope(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        {scope === 'selected' && (
          <AcPicker allACs={allACs} selectedIds={selectedIds} onChange={setSelectedIds} />
        )}
      </div>

      {formError && <p className="field-error" style={{ marginBottom: 12 }}>{formError}</p>}

      <button type="submit" className="btn btn--accent" disabled={isUploading}>
        {isUploading ? <Loader2 size={15} className="spin" /> : <UploadCloud size={15} />}
        {isUploading ? `Uploading… ${progress}%` : 'Upload material'}
      </button>
    </form>
  );
}
