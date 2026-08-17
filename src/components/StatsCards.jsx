export default function StatsCards({ leads, user, activeStatus, onStatusClick }) {
  const total = leads.length;

  const counts = {
    pendente: leads.filter((l) => l.status_ligacao === 'pendente').length,
    bem_sucedida: leads.filter((l) => l.status_ligacao === 'bem_sucedida').length,
    tentar_novamente: leads.filter((l) => l.status_ligacao === 'tentar_novamente').length,
    sem_exito: leads.filter((l) => l.status_ligacao === 'sem_exito').length,
  };

  // Calculate commissions
  const totalComissao = leads
    .filter((l) => l.status_ligacao === 'bem_sucedida')
    .reduce((acc, curr) => acc + (parseFloat(curr.valor_comissao) || 0), 0);

  // Format currency
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const pct = (val) => (total > 0 ? ((val / total) * 100).toFixed(1) : 0);

  const cardStyle = (statusKey) => ({
    cursor: onStatusClick ? 'pointer' : 'default',
    transform: activeStatus === statusKey ? 'scale(1.02)' : 'none',
    boxShadow: activeStatus === statusKey ? '0 0 10px rgba(37, 99, 235, 0.2)' : 'none',
    border: activeStatus === statusKey ? '2px solid var(--accent-primary)' : '1px solid var(--border-primary)',
    transition: 'all var(--transition-base)'
  });

  return (
    <div className="stats-grid">
      <div 
        className={`stat-card total ${activeStatus === 'todos' ? 'active' : ''}`}
        style={cardStyle('todos')}
        onClick={() => onStatusClick?.('todos')}
      >
        <span className="stat-label">Total de Leads</span>
        <span className="stat-value">{total}</span>
        <span className="stat-percent">Designados</span>
      </div>

      <div 
        className={`stat-card pendente ${activeStatus === 'pendente' ? 'active' : ''}`}
        style={cardStyle('pendente')}
        onClick={() => onStatusClick?.('pendente')}
      >
        <span className="stat-label">Pendentes</span>
        <span className="stat-value">{counts.pendente}</span>
        <span className="stat-percent">{pct(counts.pendente)}% do total</span>
      </div>

      <div 
        className={`stat-card sucesso ${activeStatus === 'bem_sucedida' ? 'active' : ''}`}
        style={cardStyle('bem_sucedida')}
        onClick={() => onStatusClick?.('bem_sucedida')}
      >
        <span className="stat-label">Bem Sucedidos</span>
        <span className="stat-value">{counts.bem_sucedida}</span>
        <span className="stat-percent">{pct(counts.bem_sucedida)}% do total</span>
      </div>

      {user?.funcao === 'gerente' ? (
        <div className="stat-card tentar" style={{ borderTop: '3px solid var(--accent-primary)' }}>
          <span className="stat-label" style={{ color: 'var(--text-secondary)' }}>Total Comissões</span>
          <span className="stat-value" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalComissao)}</span>
          <span className="stat-percent">A pagar a operadores</span>
        </div>
      ) : (
        <div className="stat-card tentar" style={{ borderTop: '3px solid var(--success)' }}>
          <span className="stat-label" style={{ color: 'var(--success)' }}>Minha Comissão</span>
          <span className="stat-value" style={{ color: 'var(--success)' }}>{formatCurrency(totalComissao)}</span>
          <span className="stat-percent">Acumulado ganho</span>
        </div>
      )}

      <div 
        className={`stat-card sem-exito ${activeStatus === 'sem_exito' ? 'active' : ''}`}
        style={cardStyle('sem_exito')}
        onClick={() => onStatusClick?.('sem_exito')}
      >
        <span className="stat-label">Sem Êxito</span>
        <span className="stat-value">{counts.sem_exito}</span>
        <span className="stat-percent">{pct(counts.sem_exito)}% do total</span>
      </div>
    </div>
  );
}
