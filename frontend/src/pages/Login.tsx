import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';

export const Login: React.FC = () => {
  const { login, usuario } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Se o usuário já estiver autenticado, redireciona direto para o Dashboard (/)
  if (usuario) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, senha);
      navigate('/', { replace: true });
    } catch (err: any) {
      if (!err.response) {
        setError('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
      } else {
        const errorMsg = err.response?.data?.error;
        setError(errorMsg || 'E-mail ou senha incorretos. Verifique suas credenciais.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'var(--bg-main)' }}>
      <div className="card card-gold" style={{ width: '100%', maxWidth: '420px', padding: '2.25rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img 
            src="/logo.png?v=99" 
            alt="Lemoka Centro Automotivo Logo Oficial" 
            style={{ height: '70px', width: 'auto', margin: '0 auto', objectFit: 'contain' }} 
          />
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginTop: '1rem', fontWeight: 700 }}>Lemoka Centro Automotivo</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--gold)', marginTop: '0.2rem', fontWeight: 600 }}>
            Qualidade e Velocidade em Cada Serviço
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.6rem' }}>
            Pavuna, Rio de Janeiro - RJ • Gestão Completa
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Contato: (21) 96484-3565
          </p>
        </div>

        {error && (
          <div className="alert alert-critico" style={{ marginBottom: '1.25rem', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ fontWeight: 700 }}>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">E-mail de Acesso</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                placeholder="seu-email@lemoka.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </div>


          <button 
            type="submit" 
            className="btn btn-gold" 
            style={{ width: '100%', marginTop: '1.25rem', padding: '0.75rem', fontWeight: 700 }} 
            disabled={loading}
          >
            {loading ? 'Autenticando...' : 'Acessar Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};
