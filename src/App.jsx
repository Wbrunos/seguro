import { useState, useEffect, useCallback } from 'react';
import { supabase, TABLE_NAME } from './lib/supabase';
import FileUpload from './components/FileUpload';
import LeadsTable from './components/LeadsTable';
import StatsCards from './components/StatsCards';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import OperatorPerformance from './components/OperatorPerformance';
import ManualLeadForm from './components/ManualLeadForm';

function App() {
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [activeTab, setActiveTab] = useState('leads'); // leads | performance | users

  // Check saved session
  useEffect(() => {
    const savedUser = localStorage.getItem('seguro_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('seguro_user');
      }
    }
  }, []);

  const addToast = (type, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data: usersData } = await supabase
        .from('seg_usuarios')
        .select('id, nome');
      
      const userMap = {};
      if (usersData) {
        usersData.forEach(u => {
          userMap[u.id] = u.nome;
        });
      }

      let query = supabase.from(TABLE_NAME).select('*');
      
      // If user is operator, filter only designated ones
      if (user.funcao === 'operador') {
        query = query.eq('usuario_designado_id', user.id);
      }

      const { data, error } = await query.order('nome', { ascending: true });

      if (error) throw error;

      // Map designer names
      const mappedLeads = (data || []).map(lead => ({
        ...lead,
        usuario_designado_nome: userMap[lead.usuario_designado_id] || null
      }));

      setLeads(mappedLeads);
    } catch (err) {
      console.error('Error fetching leads:', err);
      addToast('error', 'Erro ao carregar leads: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user, fetchLeads]);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('seguro_user', JSON.stringify(userData));
    addToast('success', `Bem-vindo, ${userData.nome}!`);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('seguro_user');
    setLeads([]);
  };

  const handleUploadComplete = () => {
    addToast('success', 'Upload concluído com sucesso!');
    fetchLeads();
    setShowUpload(false);
  };

  const handleLeadUpdated = () => {
    fetchLeads();
  };

  if (!user) {
    return (
      <div className="app-container">
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <h1>Seguro Bradesco — Gestão de Ligações</h1>
            <span style={{ 
              fontSize: '0.7rem', 
              padding: '2px 8px', 
              borderRadius: '999px', 
              background: user.funcao === 'gerente' ? 'rgba(79, 70, 229, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              color: user.funcao === 'gerente' ? 'var(--accent-primary-hover)' : 'var(--success)',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}>
              {user.funcao}
            </span>
          </div>
          <p className="subtitle">
            Olá, <strong style={{ color: 'var(--text-primary)' }}>{user.nome}</strong> · Controle de status de ligações e comissões
          </p>
        </div>
        <div className="app-header-right">
          <button
            className="btn-ghost"
            onClick={fetchLeads}
            title="Atualizar dados"
          >
            🔄 Atualizar
          </button>
          
          {user.funcao === 'gerente' && (
            <button
              className="btn-primary"
              onClick={() => setShowUpload(!showUpload)}
            >
              {showUpload ? '✕ Fechar' : '📄 Upload CSV'}
            </button>
          )}

          <button
            className="btn-ghost"
            style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
            onClick={handleLogout}
          >
            Sair
          </button>
        </div>
      </header>

      {/* Tabs selector for Gerente */}
      {user.funcao === 'gerente' && (
        <div className="filter-pills" style={{ marginBottom: 'var(--space-md)' }}>
          <button 
            className={`filter-pill ${activeTab === 'leads' ? 'active' : ''}`}
            onClick={() => setActiveTab('leads')}
          >
            📋 Leads & Planilhas
          </button>
          <button 
            className={`filter-pill ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            📊 Desempenho Operadores
          </button>
          <button 
            className={`filter-pill ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Gerenciar Contas
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'leads' || user.funcao !== 'gerente' ? (
        <>
          {/* Upload and manual entry Section */}
          {showUpload && user.funcao === 'gerente' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
              <section className="glass-card">
                <div className="section-header">
                  <div>
                    <h2 className="section-title">Importar Planilha</h2>
                    <p className="section-subtitle">
                      Faça upload de uma planilha CSV e designe a um operador com comissão específica
                    </p>
                  </div>
                </div>
                <FileUpload onUploadComplete={handleUploadComplete} />
              </section>

              <section className="glass-card">
                <ManualLeadForm onLeadAdded={fetchLeads} />
              </section>
            </div>
          )}

          {/* Stats */}
          {!loading && (
            <StatsCards leads={leads} user={user} />
          )}

          {/* Leads Table */}
          <section className="glass-card">
            <div className="section-header">
              <div>
                <h2 className="section-title">
                  {user.funcao === 'gerente' ? 'Visão Geral de Leads' : 'Minhas Ligações Designadas'}
                </h2>
                <p className="section-subtitle">
                  {leads.length > 0
                    ? `${leads.length} leads · Clique no status para alterar`
                    : 'Nenhum lead importado ou designado ainda'}
                </p>
              </div>
            </div>
            <LeadsTable
              leads={leads}
              onLeadUpdated={handleLeadUpdated}
              loading={loading}
              user={user}
            />
          </section>
        </>
      ) : null}

      {user.funcao === 'gerente' && activeTab === 'performance' && (
        <section className="glass-card">
          <OperatorPerformance leads={leads} />
        </section>
      )}

      {user.funcao === 'gerente' && activeTab === 'users' && (
        <section className="glass-card">
          <UserManagement currentUser={user} />
        </section>
      )}

      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'info' && 'ℹ'}
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
