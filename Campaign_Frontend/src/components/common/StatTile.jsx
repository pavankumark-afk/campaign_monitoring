import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function StatTile({ label, value, delta, deltaDirection = 'flat' }) {
  const Icon = deltaDirection === 'up' ? ArrowUp : deltaDirection === 'down' ? ArrowDown : Minus;
  return (
    <div className="stat-tile">
      <div className="stat-tile__label">{label}</div>
      <div className="stat-tile__value">{value}</div>
      {delta != null && (
        <div className={`stat-tile__delta stat-tile__delta--${deltaDirection}`}>
          <Icon size={13} />
          <span>{delta}</span>
        </div>
      )}
    </div>
  );
}
