/**
 * Renders progress as discrete tally segments rather than a smooth bar —
 * deliberately echoes a voter-roll tally sheet since the underlying data
 * literally is a count of people contacted out of a total electorate.
 */
export default function TallyStrip({ rows, segments = 20 }) {
  return (
    <div className="tally">
      {rows.map((row) => {
        const pct = row.total > 0 ? Math.round((row.done / row.total) * 100) : 0;
        const filledSegments = Math.round((pct / 100) * segments);
        return (
          <div className="tally__row" key={row.label}>
            <span className="tally__label" title={row.label}>{row.label}</span>
            <div className="tally__track" aria-label={`${row.label}: ${pct}% complete`}>
              {Array.from({ length: segments }).map((_, i) => (
                <div
                  key={i}
                  className={`tally__segment ${i < filledSegments ? 'tally__segment--filled' : ''}`}
                />
              ))}
            </div>
            <span className="tally__pct">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}
