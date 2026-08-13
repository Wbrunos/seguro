import { useState, useMemo } from 'react';
import StatusSelect from './StatusSelect';
import { supabase, TABLE_NAME } from '../lib/supabase';

export default function LeadsTable({ leads, onLeadUpdated, loading, user }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [loteFilter, setLoteFilter] = useState('todos');
  const [operadorFilter, setOperadorFilter] = useState('todos');
  const [sortColumn, setSortColumn] = useState('nome');
  const [sortDir, setSortDir] = useState('asc');
  const [updatingId, setUpdatingId] = useState(null);

  // List unique batch names and dates
  const uniqueLotes = useMemo(() => {
    const list = leads.map(l => l.data_lote || l.lote_upload || '').filter(Boolean);
    return ['todos', ...new Set(list)];
  }, [leads]);

  // List unique operator names if manager
  const uniqueOperadores = useMemo(() => {
    if (user?.funcao !== 'gerente') return [];
    const list = leads.map(l => l.usuario_designado_nome || 'Livre').filter(Boolean);
    return ['todos', ...new Set(list)];
  }, [leads, user]);

  // Filter + Search + Sort
  const filtered = useMemo(() => {
    let data = [...leads];

    // Lote / Data filter
    if (loteFilter !== 'todos') {
      data = data.filter((l) => (l.data_lote || l.lote_upload) === loteFilter);
    }

    // Operator filter (for Manager)
    if (user?.funcao === 'gerente' && operadorFilter !== 'todos') {
      data = data.filter((l) => (l.usuario_designado_nome || 'Livre') === operadorFilter);
    }

    // Status filter
    if (statusFilter !== 'todos') {
      data = data.filter((l) => l.status_ligacao === statusFilter);
    }

    // Search
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(
        (l) =>
          (l.nome || '').toLowerCase().includes(term) ||
          (l.cpf || '').includes(term) ||
          (l.telefone || '').includes(term) ||
          (l.cidade || '').toLowerCase().includes(term)
      );
    }

    // Sort
    data.sort((a, b) => {
      const valA = (a[sortColumn] || '').toLowerCase();
      const valB = (b[sortColumn] || '').toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [leads, statusFilter, loteFilter, operadorFilter, search, sortColumn, sortDir, user]);

  // Counts per status based on filters (excluding status filter itself)
  const counts = useMemo(() => {
    let baseData = [...leads];
    if (loteFilter !== 'todos') {
      baseData = baseData.filter((l) => (l.data_lote || l.lote_upload) === loteFilter);
    }
    if (user?.funcao === 'gerente' && operadorFilter !== 'todos') {
      baseData = baseData.filter((l) => (l.usuario_designado_nome || 'Livre') === operadorFilter);
    }

    return {
      todos: baseData.length,
      pendente: baseData.filter((l) => l.status_ligacao === 'pendente').length,
      bem_sucedida: baseData.filter((l) => l.status_ligacao === 'bem_sucedida').length,
      tentar_novamente: baseData.filter((l) => l.status_ligacao === 'tentar_novamente').length,
      sem_exito: baseData.filter((l) => l.status_ligacao === 'sem_exito').length,
    };
  }, [leads, loteFilter, operadorFilter, user]);

  const handleSort = (col) => {
    if (sortColumn === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDir('asc');
    }
  };

  const sortIcon = (col) => {
    if (sortColumn !== col) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  // Update status in Supabase
  const handleStatusChange = async (lead, newStatus) => {
    setUpdatingId(lead.id);
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ status_ligacao: newStatus })
        .eq('id', lead.id);

      if (error) throw error;
      onLeadUpdated?.();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Erro ao atualizar status: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete single lead
  const handleDeleteLead = async (leadId) => {
    if (!confirm('Deseja realmente excluir este lead de forma permanente?')) return;
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq('id', leadId);
      if (error) throw error;
      onLeadUpdated?.();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir lead: ' + err.message);
    }
  };

  // Delete entire batch
  const handleDeleteLote = async () => {
    if (loteFilter === 'todos') return;
    const readable = loteFilter.includes('-') ? formatDate(loteFilter) : loteFilter;
    if (!confirm(`ATENÇÃO: Deseja realmente excluir TODOS os leads do lote/data "${readable}"? Esta ação não pode ser desfeita.`)) return;
    
    try {
      // Find matches to delete by checking data_lote or lote_upload
      const field = loteFilter.includes('-') ? 'data_lote' : 'lote_upload';
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq(field, loteFilter);
      
      if (error) throw error;
      setLoteFilter('todos');
      onLeadUpdated?.();
      alert('Lote de leads excluído com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir lote: ' + err.message);
    }
  };

  // Update observation in Supabase
  const handleObsBlur = async (lead, newObs) => {
    if (newObs === (lead.observacao || '')) return;
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ observacao: newObs })
        .eq('id', lead.id);

      if (error) throw error;
      onLeadUpdated?.();
    } catch (err) {
      console.error('Error updating obs:', err);
    }
  };

  const formatPhone = (phone) => {
    if (!phone) return '—';
    const cleaned = phone.trim().replace(/\s+/g, '');
    return cleaned;
  };

  const getWhatsAppLink = (phone) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    return `https://wa.me/55${cleaned}`;
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <span style={{ color: 'var(--text-secondary)' }}>Carregando leads...</span>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <div className="empty-title">Nenhum lead importado</div>
        <div className="empty-subtitle">
          Faça upload de uma planilha CSV Bradesco para começar
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Controls */}
      <div className="table-controls">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', flex: '1' }}>
          <div className="search-input-wrapper" style={{ flex: '1', minWidth: '220px' }}>
            <span className="search-icon">🔍</span>
            <input
              id="search-leads"
              type="text"
              className="search-input"
              placeholder="Buscar por nome, CPF, telefone ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Lote / Data filter dropdown */}
          <div className="status-select-wrapper" style={{ width: 'auto', minWidth: '160px' }}>
            <select
              className="status-select"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
              value={loteFilter}
              onChange={(e) => setLoteFilter(e.target.value)}
            >
              <option value="todos">📅 Todas as Datas / Lotes</option>
              {uniqueLotes.map((lote) => (
                <option key={lote} value={lote}>
                  {lote === 'todos' ? 'Todas' : (lote.includes('-') ? formatDate(lote) : lote)}
                </option>
              ))}
            </select>
            <span className="status-select-arrow" style={{ color: 'var(--text-muted)' }}>▼</span>
          </div>

          {/* Delete entire batch button (Admin Master only) */}
          {user?.funcao === 'gerente' && user?.nome === 'admin' && loteFilter !== 'todos' && (
            <button
              className="btn-ghost"
              style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)', padding: '6px 12px' }}
              onClick={handleDeleteLote}
            >
              🗑️ Excluir Lote Inteiro
            </button>
          )}

          {/* Operator filter dropdown (Gerente only) */}
          {user?.funcao === 'gerente' && (
            <div className="status-select-wrapper" style={{ width: 'auto', minWidth: '160px' }}>
              <select
                className="status-select"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                value={operadorFilter}
                onChange={(e) => setOperadorFilter(e.target.value)}
              >
                <option value="todos">👥 Todos os Operadores</option>
                {uniqueOperadores.map((op) => (
                  <option key={op} value={op}>
                    {op === 'Livre' ? 'Sem Operador (Livre)' : op}
                  </option>
                ))}
              </select>
              <span className="status-select-arrow" style={{ color: 'var(--text-muted)' }}>▼</span>
            </div>
          )}
        </div>

        <div className="filter-pills">
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'pendente', label: 'Pendentes' },
            { key: 'bem_sucedida', label: 'Bem Sucedidas' },
            { key: 'tentar_novamente', label: 'Tentar' },
            { key: 'sem_exito', label: 'Sem Êxito' },
          ].map((f) => (
            <button
              key={f.key}
              className={`filter-pill ${statusFilter === f.key ? 'active' : ''}`}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
              <span className="pill-count">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="leads-table" id="leads-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('nome')}>
                Nome <span className="sort-indicator">{sortIcon('nome')}</span>
              </th>
              <th onClick={() => handleSort('cpf')}>
                CPF <span className="sort-indicator">{sortIcon('cpf')}</span>
              </th>
              <th onClick={() => handleSort('valor')}>
                Valor <span className="sort-indicator">{sortIcon('valor')}</span>
              </th>
              {user?.funcao === 'gerente' && (
                <th>Operador</th>
              )}
              <th>Comissão</th>
              <th>Telefone</th>
              <th>Planilha</th>
              <th onClick={() => handleSort('status_ligacao')}>
                Status <span className="sort-indicator">{sortIcon('status_ligacao')}</span>
              </th>
              <th>Observação</th>
              {user?.funcao === 'gerente' && user?.nome === 'admin' && (
                <th>Excluir</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => {
              // Custom row color background based on status
              let rowStyle = {};
              if (lead.status_ligacao === 'bem_sucedida') {
                rowStyle = { backgroundColor: 'rgba(22, 163, 74, 0.08)' };
              } else if (lead.status_ligacao === 'tentar_novamente') {
                rowStyle = { backgroundColor: 'rgba(2, 132, 199, 0.08)' };
              } else if (lead.status_ligacao === 'sem_exito') {
                rowStyle = { backgroundColor: 'rgba(220, 38, 38, 0.08)' };
              } else if (lead.status_ligacao === 'pendente') {
                rowStyle = { backgroundColor: 'rgba(217, 119, 6, 0.05)' };
              }

              return (
                <tr key={lead.id} style={rowStyle}>
                  <td className="cell-name">{lead.nome}</td>
                  <td data-label="CPF" className="cell-cpf">{lead.cpf}</td>
                  <td data-label="Valor" className="cell-valor">{lead.valor || '—'}</td>
                {user?.funcao === 'gerente' && (
                  <td data-label="Operador" style={{ fontWeight: '500' }}>
                    {lead.usuario_designado_nome || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Livre</span>}
                  </td>
                )}
                <td data-label="Comissão" style={{ color: 'var(--success)', fontWeight: '500' }}>
                  {lead.valor_comissao ? (
                    <span>{formatCurrency(lead.valor_comissao)} <small style={{ color: 'var(--text-muted)' }}>({lead.pct_comissao}%)</small></span>
                  ) : (
                    '—'
                  )}
                </td>
                <td data-label="Telefone" className="cell-telefone">
                  {lead.telefone ? (
                    <a
                      href={getWhatsAppLink(lead.telefone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir no WhatsApp"
                    >
                      {formatPhone(lead.telefone)}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td data-label="Planilha" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {lead.lote_upload || '—'}
                  <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>({formatDate(lead.data_lote)})</div>
                </td>
                <td data-label="Status">
                  <StatusSelect
                    value={lead.status_ligacao || 'pendente'}
                    onChange={(val) => handleStatusChange(lead, val)}
                    disabled={updatingId === lead.id || (user?.funcao === 'gerente' && user?.nome !== 'admin')}
                  />
                </td>
                <td data-label="Observação">
                  <input
                    className="obs-input"
                    type="text"
                    placeholder={user?.funcao === 'gerente' && user?.nome !== 'admin' ? 'Sem nota' : 'Adicionar nota...'}
                    defaultValue={lead.observacao || ''}
                    disabled={user?.funcao === 'gerente' && user?.nome !== 'admin'}
                    onBlur={(e) => handleObsBlur(lead, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur();
                    }}
                  />
                </td>
                {user?.funcao === 'gerente' && user?.nome === 'admin' && (
                  <td data-label="Excluir">
                    <button
                      className="btn-ghost"
                      style={{ padding: '4px 8px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      onClick={() => handleDeleteLead(lead.id)}
                    >
                      🗑️
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        </table>

        <div className="table-footer">
          <span>
            Mostrando {filtered.length} de {leads.length} leads
          </span>
          <span>
            Última atualização: {new Date().toLocaleTimeString('pt-BR')}
          </span>
        </div>
      </div>
    </>
  );
}
