import { STATUS_LIGACAO } from '../lib/supabase';

export default function StatusBadge({ status }) {
  const config = STATUS_LIGACAO[status] || STATUS_LIGACAO.pendente;

  return (
    <span
      className="status-badge"
      style={{ background: config.bg, color: config.color }}
    >
      <span
        className="status-dot"
        style={{ background: config.color }}
      />
      {config.label}
    </span>
  );
}
