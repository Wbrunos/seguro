import { STATUS_LIGACAO } from '../lib/supabase';

export default function StatusSelect({ value, onChange, disabled }) {
  const config = STATUS_LIGACAO[value] || STATUS_LIGACAO.pendente;

  return (
    <div className="status-select-wrapper">
      <select
        className="status-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{
          background: config.bg,
          color: config.color,
        }}
      >
        {Object.entries(STATUS_LIGACAO).map(([key, cfg]) => (
          <option key={key} value={key}>
            {cfg.label}
          </option>
        ))}
      </select>
      <span className="status-select-arrow">▼</span>
    </div>
  );
}
