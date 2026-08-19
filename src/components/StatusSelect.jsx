import { supabase } from '../lib/supabase';

// Helper to retrieve statuses configuration dynamically from localStorage
const getSavedStatuses = () => {
  try {
    const saved = localStorage.getItem('seguro_statuses_config');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return {
    pendente: { label: 'Pendente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)' },
    bem_sucedida: { label: 'Bem Sucedida', color: '#10b981', bg: 'rgba(16, 185, 129, 0.18)' },
    tentar_novamente: { label: 'Ligar Novamente', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.18)' },
    sem_exito: { label: 'Sem Êxito', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.18)' },
  };
};

export default function StatusSelect({ value, onChange, disabled }) {
  const dynamicStatuses = getSavedStatuses();
  const config = dynamicStatuses[value] || dynamicStatuses.pendente || { label: 'Pendente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)' };

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
          borderColor: `${config.color}55`,
          fontWeight: '600'
        }}
      >
        {Object.entries(dynamicStatuses).map(([key, cfg]) => (
          <option key={key} value={key} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
            {cfg?.label || key}
          </option>
        ))}
      </select>
      <span className="status-select-arrow" style={{ color: config?.color || 'inherit' }}>▼</span>
    </div>
  );
}
