import { useState } from 'react';
import { supabase, USERS_TABLE } from '../lib/supabase';

export default function Login({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [funcao, setFuncao] = useState('operador');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!nome.trim() || !senha.trim()) {
      setError('Por favor, preencha todos os campos.');
      setLoading(false);
      return;
    }

    try {
      if (isRegister) {
        // Registra um novo usuário
        const { data, error: regError } = await supabase
          .from(USERS_TABLE)
          .insert([{ nome: nome.trim(), senha: senha.trim(), funcao }])
          .select();

        if (regError) {
          if (regError.message.includes('unique')) {
            throw new Error('Este usuário já existe.');
          }
          throw regError;
        }

        if (data && data[0]) {
          onLoginSuccess(data[0]);
        }
      } else {
        // Login básico
        const { data, error: loginError } = await supabase
          .from(USERS_TABLE)
          .select('*')
          .eq('nome', nome.trim())
          .eq('senha', senha.trim());

        if (loginError) throw loginError;

        if (data && data.length > 0) {
          const loggedUser = data[0];
          if (loggedUser.bloqueado) {
            setError('Sua conta está bloqueada pelo administrador.');
          } else {
            onLoginSuccess(loggedUser);
          }
        } else {
          setError('Usuário ou senha incorretos.');
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: 'var(--space-md)'
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 'var(--space-xs)', fontSize: '1.5rem' }}>
          {isRegister ? 'Criar Nova Conta' : 'Acesse o Painel'}
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-lg)' }}>
          {isRegister ? 'Preencha os dados abaixo' : 'Digite suas credenciais de acesso'}
        </p>

        {error && (
          <div className="upload-result error" style={{ marginBottom: 'var(--space-md)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div>
            <label htmlFor="user-nome" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Usuário / Nome
            </label>
            <input
              id="user-nome"
              type="text"
              className="search-input"
              style={{ paddingLeft: 'var(--space-md)' }}
              placeholder="Digite o nome de usuário"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="user-password" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
              Senha
            </label>
            <input
              id="user-password"
              type="password"
              className="search-input"
              style={{ paddingLeft: 'var(--space-md)' }}
              placeholder="Digite a senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          {isRegister && (
            <div>
              <label htmlFor="user-funcao" style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                Tipo de Função
              </label>
              <div className="status-select-wrapper">
                <select
                  id="user-funcao"
                  className="status-select"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-primary)' }}
                  value={funcao}
                  onChange={(e) => setFuncao(e.target.value)}
                >
                  <option value="operador">Operador (Atendimento)</option>
                  <option value="gerente">Gerente (Gestão/Upload)</option>
                </select>
                <span className="status-select-arrow" style={{ color: 'var(--text-muted)' }}>▼</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '12px', marginTop: 'var(--space-sm)' }}
            disabled={loading}
          >
            {loading ? 'Aguarde...' : isRegister ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
