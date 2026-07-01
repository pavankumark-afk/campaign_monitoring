/**
 * Renders progress as discrete tally segments rather than a smooth bar —
 * deliberately echoes a voter-roll tally sheet since the underlying data
 * literally is a count of people contacted out of a total electorate.
 */
export default function TallyStrip({ rows, segments = 20 }) {
  return (
    <div className="tally">
      {rows.map((row) => {
        const pctRaw = row.total > 0 ? (row.done / row.total) * 100 : 0;
        const pct = Number.isFinite(pctRaw) ? pctRaw : 0;
        let pctLabel = '0%';
        if (pct > 0 && pct < 0.01) {
          pctLabel = '<0.01%';
        } else if (pct < 1 && pct > 0) {
          pctLabel = `${pct.toFixed(2)}%`;
        } else if (pct >= 1) {
          pctLabel = `${Math.round(pct)}%`;
        }

        return (
          <div className="tally__row" key={row.label}>
            <span className="tally__label" title={row.label}>{row.label}</span>
            <div className="tally__track tally__track--lined" aria-label={`${row.label}: ${pctLabel} complete`}>
              <div className="tally__fill" style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
            </div>
            <span className="tally__pct">{pctLabel}</span>
          </div>
        );
      })}
    </div>
  );
}
