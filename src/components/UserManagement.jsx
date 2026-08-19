import { useState, useEffect } from 'react';
import { supabase, USERS_TABLE } from '../lib/supabase';
import { hashPassword } from '../utils/security';

export default function UserManagement({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNome, setNewNome] = useState('');
  const [newSenha, setNewSenha] = useState('');
  const [newFuncao, setNewFuncao] = useState('operador');
  const [editingUser, setEditingUser] = useState(null);
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [funcao, setFuncao] = useState('operador');
  const [empresasPermitidas, setEmpresasPermitidas] = useState('');

  const isMaster = currentUser?.nome === 'admin';

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(USERS_TABLE)
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!isMaster) return;
    if (!newNome.trim() || !newSenha.trim()) {
      alert('Preencha o nome e senha do novo usuário.');
      return;
    }

    try {
      const hashedPwd = await hashPassword(newSenha.trim());
      const { error } = await supabase
        .from(USERS_TABLE)
        .insert([{ nome: newNome.trim(), senha: hashedPwd, funcao: newFuncao, empresas_permitidas: null }]);
      
      if (error) {
        if (error.message.includes('unique')) {
          throw new Error('Este usuário já existe.');
        }
        throw error;
      }

      setNewNome('');
      setNewSenha('');
      setShowAddForm(false);
      fetchUsers();
      alert('Novo usuário cadastrado com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar usuário: ' + err.message);
    }
  };

  const handleToggleBlock = async (user) => {
    if (!isMaster) {
      alert('Apenas o Administrador Master (admin) pode bloquear usuários.');
      return;
    }
    try {
      const { error } = await supabase
        .from(USERS_TABLE)
        .update({ bloqueado: !user.bloqueado })
        .eq('id', user.id);
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Erro ao alterar status de bloqueio: ' + err.message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!isMaster) {
      alert('Apenas o Administrador Master (admin) pode excluir usuários.');
      return;
    }
    if (!confirm('Deseja realmente excluir este usuário? Todos os leads designados a ele ficarão livres.')) return;
    try {
      const { error } = await supabase
        .from(USERS_TABLE)
        .delete()
        .eq('id', userId);
      if (error) throw error;
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir usuário: ' + err.message);
    }
  };

  const startEdit = (user) => {
    if (!isMaster) {
      alert('Apenas o Administrador Master (admin) pode editar usuários.');
      return;
    }
    setEditingUser(user);
    setNome(user.nome);
    setSenha('');
    setFuncao(user.funcao);
    setEmpresasPermitidas(user.empresas_permitidas ? user.empresas_permitidas.join(', ') : '');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!isMaster) return;
    if (!nome.trim()) return;

    try {
      // Split text input by commas and clean
      const arr = empresasPermitidas.split(',')
        .map(x => x.trim().toUpperCase())
        .filter(Boolean);

      const updateData = { 
        nome: nome.trim(), 
        funcao,
        empresas_permitidas: arr.length > 0 ? arr : null
      };
      if (senha.trim()) {
        updateData.senha = await hashPassword(senha.trim());
      }

      const { error } = await supabase
        .from(USERS_TABLE)
        .update(updateData)
        .eq('id', editingUser.id);

      if (error) throw error;
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar edições: ' + err.message);
    }
  };

  return (
    <div style={{ marginTop: 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>
          Controle de Operadores {!isMaster && <span style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 'normal', marginLeft: '8px' }}>(Apenas Visualização)</span>}
        </h3>
        {isMaster && (
          <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? '✕ Fechar Cadastro' : '➕ Novo Operador / Gerente'}
          </button>
        )}
      </div>

      {showAddForm && isMaster && (
        <form onSubmit={handleCreateUser} className="glass-card" style={{ maxWidth: '400px', marginBottom: 'var(--space-md)', padding: 'var(--space-md)', border: '1px solid var(--accent-primary)' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>Cadastrar Novo Usuário</h4>
          
          <div style={{ marginBottom: 'var(--space-sm)' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Nome / Usuário</label>
            <input type="text" className="search-input" style={{ padding: '6px 10px' }} placeholder="Nome" value={newNome} onChange={(e) => setNewNome(e.target.value)} />
          </div>

          <div style={{ marginBottom: 'var(--space-sm)' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Senha</label>
            <input type="password" className="search-input" style={{ padding: '6px 10px' }} placeholder="Senha" value={newSenha} onChange={(e) => setNewSenha(e.target.value)} />
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Função</label>
            <div className="status-select-wrapper">
              <select className="status-select" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }} value={newFuncao} onChange={(e) => setNewFuncao(e.target.value)}>
                <option value="operador">Operador (Atendimento)</option>
                <option value="gerente">Gerente (Visualização/Upload)</option>
              </select>
              <span className="status-select-arrow">▼</span>
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', padding: '10px' }}>Criar Usuário</button>
        </form>
      )}

      {isMaster && (
        <>
          <AdminColumnConfig />
          <AdminStatusConfig />
        </>
      )}
      
      {editingUser && isMaster ? (
        <form onSubmit={handleSaveEdit} className="glass-card" style={{ maxWidth: '400px', marginBottom: 'var(--space-md)', padding: 'var(--space-md)' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>Editar Usuário: {editingUser.nome}</h4>
          
          <div style={{ marginBottom: 'var(--space-sm)' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Nome</label>
            <input type="text" className="search-input" style={{ padding: '6px 10px' }} value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div style={{ marginBottom: 'var(--space-sm)' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Nova Senha (deixe vazio se não quiser alterar)</label>
            <input type="password" className="search-input" style={{ padding: '6px 10px' }} placeholder="Senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Função</label>
            <div className="status-select-wrapper">
              <select className="status-select" style={{ background: 'var(--bg-input)', color: 'var(--text-primary)' }} value={funcao} onChange={(e) => setFuncao(e.target.value)}>
                <option value="operador">Operador</option>
                <option value="gerente">Gerente</option>
              </select>
              <span className="status-select-arrow">▼</span>
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '4px' }}>Empresas Permitidas (deixe em branco para liberar todas)</label>
            <input
              type="text"
              className="search-input"
              style={{ padding: '6px 10px' }}
              placeholder="Ex: BRADESCO, SANTANDER, TJPB"
              value={empresasPermitidas}
              onChange={(e) => setEmpresasPermitidas(e.target.value)}
            />
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Separe por vírgulas para liberar mais de uma.</span>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button type="submit" className="btn-primary">Salvar</button>
            <button type="button" className="btn-ghost" onClick={() => setEditingUser(null)}>Cancelar</button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="loading-overlay"><div className="spinner" /></div>
      ) : (
        <div className="table-wrapper">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Função</th>
                <th>Status</th>
                {isMaster && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: '600' }}>{u.nome}</td>
                  <td>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      padding: '2px 8px', 
                      borderRadius: '999px',
                      background: u.funcao === 'gerente' ? 'rgba(79, 70, 229, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                      color: u.funcao === 'gerente' ? 'var(--accent-primary-hover)' : 'var(--success)'
                    }}>
                      {u.funcao}
                    </span>
                  </td>
                  <td>
                    {u.bloqueado ? (
                      <span style={{ color: 'var(--danger)', fontWeight: '600' }}>Bloqueado</span>
                    ) : (
                      <span style={{ color: 'var(--success)', fontWeight: '600' }}>Ativo</span>
                    )}
                  </td>
                  {isMaster && (
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => startEdit(u)}>✏️ Editar</button>
                        <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem', color: u.bloqueado ? 'var(--success)' : 'var(--warning)', borderColor: u.bloqueado ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)' }} onClick={() => handleToggleBlock(u)}>
                          {u.bloqueado ? '🔓 Desbloquear' : '🔒 Bloquear'}
                        </button>
                        {u.nome !== 'admin' && (
                          <button className="btn-ghost" style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteUser(u.id)}>🗑️ Excluir</button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Columns config helper subcomponent
function AdminColumnConfig() {
  const [cols, setCols] = useState({ operador: [], gerente: [] });
  const [saving, setSaving] = useState(false);

  const availableCols = [
    { key: 'nome', label: 'Nome' },
    { key: 'cpf', label: 'CPF / ID' },
    { key: 'telefone', label: 'Telefone' },
    { key: 'local', label: 'Local' },
    { key: 'cargo', label: 'Cargo' },
    { key: 'matricula', label: 'Matrícula' },
    { key: 'empresa', label: 'Empresa' },
    { key: 'planilha', label: 'Planilha' },
    { key: 'segmento', label: 'Segmento' },
    { key: 'valor', label: 'Valor' },
    { key: 'comissao', label: 'Comissão' },
    { key: 'comissao_receber', label: 'Comissão a Receber' },
    { key: 'status', label: 'Status' },
    { key: 'observacao', label: 'Observação' },
  ];

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('seg_configuracoes')
        .select('*')
        .eq('chave', 'colunas_visiveis')
        .single();
      if (!error && data) {
        let parsed = data.valor;
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch (e) {
            console.error(e);
          }
        }
        setCols(parsed || { operador: [], gerente: [] });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleToggle = (role, key) => {
    setCols(prev => {
      const current = prev[role] || [];
      const updated = current.includes(key)
        ? current.filter(k => k !== key)
        : [...current, key];
      return { ...prev, [role]: updated };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('seg_configuracoes')
        .upsert({ chave: 'colunas_visiveis', valor: cols });
      if (error) throw error;
      alert('Visibilidade das colunas salva com sucesso!');
    } catch (err) {
      alert('Erro ao salvar colunas: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', border: '1px solid var(--accent-primary)' }}>
      <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-sm)' }}>👁️ Colunas Visíveis por Função</h4>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
        Marque as colunas que cada função de usuário poderá visualizar no painel de leads.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
        <div>
          <h5 style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '8px', color: 'var(--accent-primary-hover)' }}>Operadores</h5>
          {availableCols.map(c => (
            <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', padding: '4px 0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={(cols.operador || []).includes(c.key)}
                onChange={() => handleToggle('operador', c.key)}
              />
              {c.label}
            </label>
          ))}
        </div>
        <div>
          <h5 style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '8px', color: 'var(--success)' }}>Gerentes</h5>
          {availableCols.map(c => (
            <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', padding: '4px 0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={(cols.gerente || []).includes(c.key)}
                onChange={() => handleToggle('gerente', c.key)}
              />
              {c.label}
            </label>
          ))}
        </div>
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '8px 16px' }}>
        {saving ? 'Salvando...' : '💾 Salvar Configurações de Colunas'}
      </button>
    </div>
  );
}

// Status labels custom configuration subcomponent
export function AdminStatusConfig() {
  const [statusMap, setStatusMap] = useState({
    pendente: { label: '', color: '', bg: '' },
    bem_sucedida: { label: '', color: '', bg: '' },
    tentar_novamente: { label: '', color: '', bg: '' },
    sem_exito: { label: '', color: '', bg: '' }
  });
  const [saving, setSaving] = useState(false);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('seg_configuracoes')
        .select('*')
        .eq('chave', 'status_config')
        .single();
      if (!error && data) {
        let parsed = data.valor;
        if (typeof parsed === 'string') {
          try {
            parsed = JSON.parse(parsed);
          } catch (e) {
            console.error(e);
          }
        }
        setStatusMap(parsed || {
          pendente: { label: 'Pendente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)' },
          bem_sucedida: { label: 'Bem Sucedida', color: '#10b981', bg: 'rgba(16, 185, 129, 0.18)' },
          tentar_novamente: { label: 'Ligar Novamente', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.18)' },
          sem_exito: { label: 'Sem Êxito', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.18)' }
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleChange = (statusKey, newLabel) => {
    setStatusMap(prev => ({
      ...prev,
      [statusKey]: {
        ...prev[statusKey],
        label: newLabel
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('seg_configuracoes')
        .upsert({ chave: 'status_config', valor: statusMap });
      if (error) throw error;
      localStorage.setItem('seguro_statuses_config', JSON.stringify(statusMap));
      alert('Configuração de rótulos dos Status salva com sucesso! Recarregue a página para aplicar em todas as telas.');
    } catch (err) {
      alert('Erro ao salvar status: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card" style={{ marginBottom: 'var(--space-md)', padding: 'var(--space-md)', border: '1px solid var(--accent-primary)' }}>
      <h4 style={{ fontSize: '0.9rem', marginBottom: 'var(--space-sm)' }}>🏷️ Personalizar Rótulos dos Status</h4>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
        Renomeie os rótulos das ligações para adaptá-los à sua operação comercial.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
        {['pendente', 'bem_sucedida', 'tentar_novamente', 'sem_exito'].map((key) => (
          <div key={key}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase' }}>
              Status Original: {key.replace('_', ' ')}
            </label>
            <input
              type="text"
              className="search-input"
              style={{ padding: '6px 10px' }}
              value={statusMap[key]?.label || ''}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder="Digite o novo rótulo..."
            />
          </div>
        ))}
      </div>

      <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '8px 16px' }}>
        {saving ? 'Salvando...' : '💾 Salvar Nomes dos Status'}
      </button>
    </div>
  );
}
