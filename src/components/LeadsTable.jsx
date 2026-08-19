import { useState, useMemo, useEffect } from 'react';
import StatusSelect from './StatusSelect';
import { supabase, TABLE_NAME } from '../lib/supabase';

// Helper to retrieve statuses configuration dynamically from localStorage
const getSavedStatuses = () => {
  try {
    const saved = localStorage.getItem('seguro_statuses_config');
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error(e);
  }
  return {
    pendente: { label: 'Pendente', color: '#b45309', bg: 'rgba(217, 119, 6, 0.12)' },
    bem_sucedida: { label: 'Bem Sucedida', color: '#15803d', bg: 'rgba(22, 163, 74, 0.12)' },
    tentar_novamente: { label: 'Tentar Novamente', color: '#0369a1', bg: 'rgba(2, 132, 199, 0.12)' },
    sem_exito: { label: 'Sem Êxito', color: '#b91c1c', bg: 'rgba(220, 38, 38, 0.12)' },
  };
};

export default function LeadsTable({ leads, onLeadUpdated, loading, user, statusFilter, onStatusFilterChange }) {
  const [search, setSearch] = useState('');
  const [loteFilter, setLoteFilter] = useState('todos');
  const [operadorFilter, setOperadorFilter] = useState('todos');
  const [tipoListaFilter, setTipoListaFilter] = useState('todos');
  const [sortColumn, setSortColumn] = useState('nome');
  const [sortDir, setSortDir] = useState('asc');
  const [updatingId, setUpdatingId] = useState(null);
  
  // Custom columns configuration
  const [visibleCols, setVisibleCols] = useState([]);
  const [operadoresList, setOperadoresList] = useState([]);

  // Batch selection state
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [batchOperadorId, setBatchOperadorId] = useState('');
  const [assigningBatch, setAssigningBatch] = useState(false);

  // Toggle single lead selection
  const handleToggleSelectLead = (leadId) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  // Toggle select all visible filtered leads
  const handleSelectAllLeads = () => {
    if (selectedLeadIds.length === filtered.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filtered.map((l) => l.id));
    }
  };

  // Assign batch selected leads to an operator
  const handleAssignBatchLeads = async () => {
    if (selectedLeadIds.length === 0) return;
    if (!batchOperadorId) {
      alert('Por favor, selecione um operador na lista para enviar os leads.');
      return;
    }

    try {
      setAssigningBatch(true);
      const targetUserId = batchOperadorId === 'LIVRE' ? null : batchOperadorId;
      const targetName = batchOperadorId === 'LIVRE' ? 'Livre (Sem Operador)' : (operadoresList.find((o) => o.id === batchOperadorId)?.nome || 'Operador');

      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ usuario_designado_id: targetUserId })
        .in('id', selectedLeadIds);

      if (error) throw error;

      alert(`✓ ${selectedLeadIds.length} lead(s) enviado(s) com sucesso para ${targetName}!`);
      setSelectedLeadIds([]);
      setBatchOperadorId('');
      onLeadUpdated?.();
    } catch (err) {
      console.error(err);
      alert('Erro ao enviar leads em lote: ' + err.message);
    } finally {
      setAssigningBatch(false);
    }
  };

  useEffect(() => {
    if (user?.funcao === 'gerente') {
      const fetchOperadores = async () => {
        try {
          const { data } = await supabase
            .from('seg_usuarios')
            .select('id, nome')
            .eq('funcao', 'operador')
            .order('nome', { ascending: true });
          setOperadoresList(data || []);
        } catch (e) {
          console.error('Error fetching operators list:', e);
        }
      };
      fetchOperadores();
    }

    const fetchColumnsConfig = async () => {
      try {
        const { data, error } = await supabase
          .from('seg_configuracoes')
          .select('*')
          .eq('chave', 'colunas_visiveis')
          .single();
        if (!error && data) {
          let parsed = data.valor;
          // Handle double-encoded JSON string
          if (typeof parsed === 'string') {
            try {
              parsed = JSON.parse(parsed);
            } catch (e) {
              console.error('Error parsing colunas_visiveis:', e);
            }
          }
          const role = user?.funcao || 'operador';
          const roleCols = parsed?.[role];
          if (Array.isArray(roleCols) && roleCols.length > 0) {
            setVisibleCols(roleCols);
          } else {
            // Fallback default columns
            setVisibleCols(
              user?.funcao === 'gerente'
                ? ['nome', 'cpf', 'telefone', 'local', 'cargo', 'matricula', 'empresa', 'planilha', 'valor', 'comissao', 'comissao_receber', 'status', 'observacao', 'segmento']
                : ['nome', 'cpf', 'telefone', 'empresa', 'planilha', 'valor', 'comissao', 'comissao_receber', 'status', 'observacao', 'segmento']
            );
          }
        } else {
          // Fallback default columns
          setVisibleCols(
            user?.funcao === 'gerente'
              ? ['nome', 'cpf', 'telefone', 'local', 'cargo', 'matricula', 'empresa', 'planilha', 'valor', 'comissao', 'comissao_receber', 'status', 'observacao', 'segmento']
              : ['nome', 'cpf', 'telefone', 'empresa', 'planilha', 'valor', 'comissao', 'comissao_receber', 'status', 'observacao', 'segmento']
          );
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchColumnsConfig();
  }, [user]);

  // List unique batch names and dates
  const uniqueLotes = useMemo(() => {
    const list = leads.map(l => l.data_lote || l.lote_upload || '').filter(Boolean);
    return ['todos', ...new Set(list)];
  }, [leads]);

  // List unique segment types
  const uniqueTipoListas = useMemo(() => {
    const list = leads.map(l => l.tipo_lista || 'BRADESCO').filter(Boolean);
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

    // Tipo Lista filter
    if (tipoListaFilter !== 'todos') {
      data = data.filter((l) => (l.tipo_lista || 'BRADESCO') === tipoListaFilter);
    }

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
  }, [leads, statusFilter, loteFilter, operadorFilter, tipoListaFilter, search, sortColumn, sortDir, user]);

  // Counts per status based on filters (excluding status filter itself)
  const counts = useMemo(() => {
    let baseData = [...leads];
    if (tipoListaFilter !== 'todos') {
      baseData = baseData.filter((l) => (l.tipo_lista || 'BRADESCO') === tipoListaFilter);
    }
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
  }, [leads, loteFilter, operadorFilter, tipoListaFilter, user]);

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
        {/* Top bar: Search bar on left, Status Filter Pills on right */}
        <div className="table-controls-top">
          <div className="search-input-wrapper">
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

          <div className="filter-pills">
            {(() => {
              const dynamicStatuses = getSavedStatuses();
              return [
                { key: 'todos', label: 'Todos' },
                { key: 'pendente', label: dynamicStatuses.pendente?.label || 'Pendentes' },
                { key: 'bem_sucedida', label: dynamicStatuses.bem_sucedida?.label || 'Bem Sucedidas' },
                { key: 'tentar_novamente', label: dynamicStatuses.tentar_novamente?.label || 'Tentar' },
                { key: 'sem_exito', label: dynamicStatuses.sem_exito?.label || 'Sem Êxito' },
              ].map((f) => (
                <button
                  key={f.key}
                  className={`filter-pill ${statusFilter === f.key ? 'active' : ''}`}
                  onClick={() => onStatusFilterChange?.(f.key)}
                >
                  {f.label}
                  <span className="pill-count">{counts[f.key]}</span>
                </button>
              ));
            })()}
          </div>
        </div>

        {/* Bottom bar: Dropdown filters neatly aligned */}
        <div className="table-controls-filters">
          {/* Lote / Data filter dropdown */}
          <div className="status-select-wrapper filter-dropdown">
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

          {/* Tipo Lista filter dropdown */}
          <div className="status-select-wrapper filter-dropdown">
            <select
              className="status-select"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
              value={tipoListaFilter}
              onChange={(e) => setTipoListaFilter(e.target.value)}
            >
              <option value="todos">📁 Todos os Segmentos</option>
              {uniqueTipoListas.map((tipo) => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
            <span className="status-select-arrow" style={{ color: 'var(--text-muted)' }}>▼</span>
          </div>

          {/* Operator filter dropdown (Gerente only) */}
          {user?.funcao === 'gerente' && (
            <div className="status-select-wrapper filter-dropdown">
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

          {/* Delete entire batch button (Admin Master only) */}
          {user?.funcao === 'gerente' && user?.nome === 'admin' && loteFilter !== 'todos' && (
            <button
              className="btn-ghost"
              style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,0.3)', padding: '6px 12px', height: '34px' }}
              onClick={handleDeleteLote}
            >
              🗑️ Excluir Lote Inteiro
            </button>
          )}
        </div>
      </div>
      {/* Batch Assignment Action Bar */}
      {user?.funcao === 'gerente' && selectedLeadIds.length > 0 && (
        <div style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--accent-primary)',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1rem' }}>☑️</span>
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>
              {selectedLeadIds.length} lead(s) selecionado(s)
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Enviar para:</span>
            <div className="status-select-wrapper" style={{ width: 'auto', minWidth: '180px' }}>
              <select
                className="status-select"
                style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)', padding: '6px 28px 6px 12px' }}
                value={batchOperadorId}
                onChange={(e) => setBatchOperadorId(e.target.value)}
              >
                <option value="">-- Escolher Operador --</option>
                <option value="LIVRE">Livre (Sem Operador)</option>
                {operadoresList.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.nome}
                  </option>
                ))}
              </select>
              <span className="status-select-arrow" style={{ color: 'var(--text-muted)' }}>▼</span>
            </div>

            <button
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.8rem' }}
              disabled={assigningBatch}
              onClick={handleAssignBatchLeads}
            >
              {assigningBatch ? 'Enviando...' : '🚀 Enviar Lead(s)'}
            </button>

            <button
              className="btn-ghost"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => setSelectedLeadIds([])}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-wrapper">
        <table className="leads-table" id="leads-table">
          <thead>
            <tr>
              {user?.funcao === 'gerente' && (
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedLeadIds.length === filtered.length}
                    onChange={handleSelectAllLeads}
                    title="Selecionar todos os leads visíveis"
                    style={{ cursor: 'pointer' }}
                  />
                </th>
              )}
              {visibleCols.includes('nome') && (
                <th onClick={() => handleSort('nome')}>
                  Nome <span className="sort-indicator">{sortIcon('nome')}</span>
                </th>
              )}
              {visibleCols.includes('cpf') && (
                <th onClick={() => handleSort('cpf')}>
                  CPF <span className="sort-indicator">{sortIcon('cpf')}</span>
                </th>
              )}
              {visibleCols.includes('valor') && (
                <th onClick={() => handleSort('valor')}>
                  Valor <span className="sort-indicator">{sortIcon('valor')}</span>
                </th>
              )}
              {user?.funcao === 'gerente' && (
                <th>Operador</th>
              )}
              {visibleCols.includes('comissao') && <th>Comissão</th>}
              {visibleCols.includes('comissao_receber') && <th>Comissão a Rec.</th>}
              {visibleCols.includes('telefone') && <th>Telefone</th>}
              {visibleCols.includes('local') && <th>Local / Cidade</th>}
              {visibleCols.includes('cargo') && <th>Cargo</th>}
              {visibleCols.includes('matricula') && <th>Matrícula</th>}
              {visibleCols.includes('empresa') && <th>Empresa / Banco</th>}
              
              {visibleCols.includes('planilha') && <th>Planilha</th>}
              {visibleCols.includes('segmento') && <th>Segmento</th>}
              
              {visibleCols.includes('status') && (
                <th onClick={() => handleSort('status_ligacao')}>
                  Status <span className="sort-indicator">{sortIcon('status_ligacao')}</span>
                </th>
              )}
              {visibleCols.includes('observacao') && <th>Observação</th>}
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

              const isSelected = selectedLeadIds.includes(lead.id);

              return (
                <tr key={lead.id} style={{ ...rowStyle, ...(isSelected ? { backgroundColor: 'rgba(37, 99, 235, 0.12)' } : {}) }}>
                  {user?.funcao === 'gerente' && (
                    <td style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectLead(lead.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                  )}
                  {visibleCols.includes('nome') && (
                    <td className="cell-name">
                      <input
                        type="text"
                        className="obs-input"
                        style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 'inherit', color: 'inherit', minWidth: '120px' }}
                        defaultValue={lead.nome || ''}
                        placeholder="Sem nome..."
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          if (val === lead.nome) return;
                          await supabase.from(TABLE_NAME).update({ nome: val }).eq('id', lead.id);
                          onLeadUpdated?.();
                        }}
                      />
                    </td>
                  )}
                  {visibleCols.includes('cpf') && (
                    <td data-label="CPF" className="cell-cpf">
                      <input
                        type="text"
                        className="obs-input"
                        style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 'inherit', color: 'inherit', minWidth: '100px' }}
                        defaultValue={lead.cpf || ''}
                        placeholder="Sem CPF..."
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          if (val === lead.cpf) return;
                          const { error } = await supabase.from(TABLE_NAME).update({ cpf: val }).eq('id', lead.id);
                          if (error) alert('Erro ao salvar CPF (deve ser único): ' + error.message);
                          onLeadUpdated?.();
                        }}
                      />
                    </td>
                  )}
                  {visibleCols.includes('valor') && (
                    <td data-label="Valor" className="cell-valor">
                      <input
                        type="text"
                        className="obs-input"
                        style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 'inherit', color: 'inherit', minWidth: '80px' }}
                        defaultValue={lead.valor || ''}
                        placeholder="Ex: R$ 0,00"
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          if (val === lead.valor) return;
                          
                          let numVal = 0;
                          if (val) {
                            let cleanVal = val.replace(/[^\d.,]/g, '');
                            if (cleanVal.includes('.') && cleanVal.includes(',')) {
                              cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
                            } else if (cleanVal.includes(',')) {
                              cleanVal = cleanVal.replace(',', '.');
                            }
                            numVal = parseFloat(cleanVal) || 0;
                          }
                          const commVal = numVal * ((lead.pct_comissao || 0) / 100);

                          await supabase.from(TABLE_NAME).update({ 
                            valor: val,
                            valor_comissao: commVal 
                          }).eq('id', lead.id);
                          onLeadUpdated?.();
                        }}
                      />
                    </td>
                  )}
                  {user?.funcao === 'gerente' && (
                    <td data-label="Operador">
                      <div className="status-select-wrapper" style={{ minWidth: '110px', maxWidth: '130px' }}>
                        <select
                          className="status-select"
                          style={{
                            background: lead.usuario_designado_nome ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-input)',
                            color: lead.usuario_designado_nome ? 'var(--accent-primary-hover)' : 'var(--text-muted)',
                            border: '1px solid var(--border-primary)',
                            fontSize: '0.75rem',
                            padding: '3px 20px 3px 8px',
                            fontWeight: '600'
                          }}
                          value={lead.usuario_designado_id || ''}
                          onChange={async (e) => {
                            const newOpId = e.target.value || null;
                            const { error } = await supabase
                              .from(TABLE_NAME)
                              .update({ usuario_designado_id: newOpId })
                              .eq('id', lead.id);
                            if (error) {
                              alert('Erro ao enviar lead: ' + error.message);
                            } else {
                              onLeadUpdated?.();
                            }
                          }}
                        >
                          <option value="">Livre</option>
                          {operadoresList.map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.nome}
                            </option>
                          ))}
                        </select>
                        <span className="status-select-arrow" style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>▼</span>
                      </div>
                    </td>
                  )}
                  {visibleCols.includes('comissao') && (
                    <td data-label="Comissão" style={{ color: 'var(--success)', fontWeight: '500' }}>
                      {lead.valor_comissao ? (
                        <span>{formatCurrency(lead.valor_comissao)} <small style={{ color: 'var(--text-muted)' }}>({lead.pct_comissao}%)</small></span>
                      ) : (
                        '—'
                      )}
                    </td>
                  )}
                  {visibleCols.includes('comissao_receber') && (
                    <td data-label="Comissão Rec." style={{ color: 'var(--success)', fontWeight: '500' }}>
                      <input
                        type="text"
                        className="obs-input"
                        style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 'inherit', color: 'inherit', minWidth: '80px', color: 'var(--success)' }}
                        defaultValue={lead.valor_comissao_receber !== null ? formatCurrency(lead.valor_comissao_receber) : ''}
                        placeholder="Ex: R$ 0,00"
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          let cleanVal = val.replace(/[^\d.,]/g, '');
                          if (cleanVal.includes('.') && cleanVal.includes(',')) {
                            cleanVal = cleanVal.replace(/\./g, '').replace(',', '.');
                          } else if (cleanVal.includes(',')) {
                            cleanVal = cleanVal.replace(',', '.');
                          }
                          const num = val ? parseFloat(cleanVal) : null;
                          await supabase.from(TABLE_NAME).update({ valor_comissao_receber: num }).eq('id', lead.id);
                          onLeadUpdated?.();
                        }}
                      />
                    </td>
                  )}
                  {visibleCols.includes('telefone') && (
                    <td data-label="Telefone" className="cell-telefone">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="text"
                          className="obs-input"
                          style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 'inherit', color: 'inherit', minWidth: '100px' }}
                          defaultValue={lead.telefone || ''}
                          placeholder="Sem telefone..."
                          onBlur={async (e) => {
                            const val = e.target.value.trim();
                            if (val === lead.telefone) return;
                            await supabase.from(TABLE_NAME).update({ telefone: val }).eq('id', lead.id);
                            onLeadUpdated?.();
                          }}
                        />
                        {lead.telefone && (
                          <a
                            href={getWhatsAppLink(lead.telefone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir no WhatsApp"
                            style={{ fontSize: '0.9rem' }}
                          >
                            💬
                          </a>
                        )}
                      </div>
                    </td>
                  )}
                  {visibleCols.includes('local') && (
                    <td data-label="Local">
                      <input
                        type="text"
                        className="obs-input"
                        style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 'inherit', color: 'inherit', minWidth: '100px' }}
                        defaultValue={lead.local || ''}
                        placeholder="Sem local..."
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          await supabase.from(TABLE_NAME).update({ local: val }).eq('id', lead.id);
                          onLeadUpdated?.();
                        }}
                      />
                    </td>
                  )}
                  {visibleCols.includes('cargo') && (
                    <td data-label="Cargo">
                      <input
                        type="text"
                        className="obs-input"
                        style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 'inherit', color: 'inherit', minWidth: '100px' }}
                        defaultValue={lead.cargo || ''}
                        placeholder="Sem cargo..."
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          await supabase.from(TABLE_NAME).update({ cargo: val }).eq('id', lead.id);
                          onLeadUpdated?.();
                        }}
                      />
                    </td>
                  )}
                  {visibleCols.includes('matricula') && (
                    <td data-label="Matrícula">
                      <input
                        type="text"
                        className="obs-input"
                        style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 'inherit', color: 'inherit', minWidth: '100px' }}
                        defaultValue={lead.matricula || ''}
                        placeholder="Sem matr..."
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          await supabase.from(TABLE_NAME).update({ matricula: val }).eq('id', lead.id);
                          onLeadUpdated?.();
                        }}
                      />
                    </td>
                  )}
                  {visibleCols.includes('empresa') && (
                    <td data-label="Empresa">
                      <input
                        type="text"
                        className="obs-input"
                        style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 'inherit', color: 'inherit', minWidth: '100px' }}
                        defaultValue={lead.empresa || ''}
                        placeholder="Sem emp..."
                        onBlur={async (e) => {
                          const val = e.target.value.trim();
                          await supabase.from(TABLE_NAME).update({ empresa: val }).eq('id', lead.id);
                          onLeadUpdated?.();
                        }}
                      />
                    </td>
                  )}

                  {visibleCols.includes('planilha') && (
                    <td data-label="Planilha" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {lead.lote_upload || '—'}
                      <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>({formatDate(lead.data_lote)})</div>
                    </td>
                  )}
                  {visibleCols.includes('segmento') && (
                    <td data-label="Segmento">
                      <input
                        type="text"
                        className="obs-input"
                        style={{ background: 'transparent', border: 'none', padding: 0, fontWeight: 'inherit', color: 'inherit', minWidth: '80px' }}
                        defaultValue={lead.tipo_lista || 'BRADESCO'}
                        placeholder="Ex: BRADESCO"
                        onBlur={async (e) => {
                          const val = e.target.value.trim().toUpperCase();
                          if (!val) return;
                          await supabase.from(TABLE_NAME).update({ tipo_lista: val }).eq('id', lead.id);
                          onLeadUpdated?.();
                        }}
                      />
                    </td>
                  )}

                  {visibleCols.includes('status') && (
                    <td data-label="Status">
                      <StatusSelect
                        value={lead.status_ligacao || 'pendente'}
                        onChange={(val) => handleStatusChange(lead, val)}
                        disabled={updatingId === lead.id || (user?.funcao === 'gerente' && user?.nome !== 'admin')}
                      />
                    </td>
                  )}
                  {visibleCols.includes('observacao') && (
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
                  )}
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
