import { useState, useEffect, useCallback } from 'react';
import { supabase, TABLE_NAME } from './lib/supabase';
import { sanitizeUserForStorage } from './utils/security';
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
  const [statusFilter, setStatusFilter] = useState('todos');

  // Check saved session
  useEffect(() => {
    // Clean URL hash to prevent credential leakage in browser history
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    const savedUser = localStorage.getItem('seguro_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Remove any leaked password from old sessions
        const safeUser = sanitizeUserForStorage(parsed);
        setUser(safeUser);
        // Re-save without password if it was there
        if (parsed.senha) {
          localStorage.setItem('seguro_user', JSON.stringify(safeUser));
        }
      } catch (e) {
        localStorage.removeItem('seguro_user');
      }
    }

    // Load status label configs
    const fetchStatusConfigs = async () => {
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
          localStorage.setItem('seguro_statuses_config', JSON.stringify(parsed));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchStatusConfigs();
  }, []);

  const addToast = (type, message) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const fetchLeads = useCallback(async (isSilent = false) => {
    if (!user) return;
    try {
      if (!isSilent) setLoading(true);
      
      // Fetch latest profile config for logged user to avoid stale session cache
      const { data: latestProfile } = await supabase
        .from('seg_usuarios')
        .select('*')
        .eq('id', user.id)
        .single();
      
      const activeUser = latestProfile || user;

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
      
      // Filter by permitted companies and/or assigned user for non-admin users
      if (activeUser.nome !== 'admin') {
        if (activeUser.funcao === 'operador') {
          // Operador: show leads assigned to operator OR matching permitted companies
          if (activeUser.empresas_permitidas && Array.isArray(activeUser.empresas_permitidas) && activeUser.empresas_permitidas.length > 0) {
            const empConditions = activeUser.empresas_permitidas.map(e => `empresa.eq.${e}`).join(',');
            query = query.or(`usuario_designado_id.eq.${activeUser.id},${empConditions}`);
          }
        } else if (activeUser.funcao === 'gerente') {
          // Gerente: filter by permitted companies if configured
          if (activeUser.empresas_permitidas && Array.isArray(activeUser.empresas_permitidas) && activeUser.empresas_permitidas.length > 0) {
            query = query.in('empresa', activeUser.empresas_permitidas);
          }
        }
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
      if (!isSilent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user, fetchLeads]);

  const handleLoginSuccess = (userData) => {
    const safeUser = sanitizeUserForStorage(userData);
    setUser(safeUser);
    localStorage.setItem('seguro_user', JSON.stringify(safeUser));
    addToast('success', `Bem-vindo, ${safeUser.nome}!`);
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
    fetchLeads(true); // Silent refresh (prevents screen flashing)
  };

  // Dark mode handler
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('seguro_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('seguro_theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('seguro_theme', 'light');
    }
  }, [darkMode]);

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
            <h1>Gestão de Ligações</h1>
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
          {/* Theme switcher */}
          <button
            className="btn-ghost"
            style={{ fontSize: '1rem', padding: '6px 12px' }}
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {darkMode ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
          </button>

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
            <StatsCards 
              leads={leads} 
              user={user} 
              activeStatus={statusFilter} 
              onStatusClick={setStatusFilter} 
            />
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
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
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
