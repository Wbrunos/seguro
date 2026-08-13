import { useState, useEffect } from 'react';
import { supabase, USERS_TABLE } from '../lib/supabase';

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
      const { error } = await supabase
        .from(USERS_TABLE)
        .insert([{ nome: newNome.trim(), senha: newSenha.trim(), funcao: newFuncao }]);
      
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
    setSenha(user.senha);
    setFuncao(user.funcao);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!isMaster) return;
    if (!nome.trim()) return;

    try {
      const updateData = { nome: nome.trim(), funcao };
      if (senha.trim()) {
        updateData.senha = senha.trim();
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
