import { useMemo, useState } from 'react';
import { Search, Check } from 'lucide-react';

export default function AcPicker({ allACs, selectedIds, onChange }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return allACs;
    const q = search.trim().toLowerCase();
    return allACs.filter((a) => a.name.toLowerCase().includes(q) || String(a.id).toLowerCase().includes(q));
  }, [allACs, search]);

  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="ac-picker">
      <div className="ac-picker__search">
        <Search size={14} />
        <input
          placeholder="Search by AC name or ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="ac-picker__meta">
        {selectedIds.length} of {allACs.length} selected
      </div>
      <div className="ac-picker__list">
        {filtered.map((ac) => {
          const checked = selectedIds.includes(ac.id);
          return (
            <button
              type="button"
              key={ac.id}
              className={`ac-picker__row ${checked ? 'ac-picker__row--checked' : ''}`}
              onClick={() => toggle(ac.id)}
            >
              <span className={`ac-picker__checkbox ${checked ? 'ac-picker__checkbox--on' : ''}`}>
                {checked && <Check size={12} strokeWidth={3} />}
              </span>
              <span className="ac-picker__name">{ac.name}</span>
              <span className="ac-picker__district">{ac.district}</span>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="ac-picker__empty">No ACs match "{search}"</p>}
      </div>
    </div>
  );
}
