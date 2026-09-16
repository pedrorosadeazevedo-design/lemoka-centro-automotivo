import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Header: React.FC = () => {
  const { usuario, logout } = useAuth();

  return (
    <header className="header">
      <div className="main-content" style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <img 
            src="/logo.png?v=105" 
            alt="Lemoka Centro Automotivo Logo Oficial" 
            style={{ height: '58px', width: 'auto', objectFit: 'contain' }} 
          />
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {usuario && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{usuario.email}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--gold)', textTransform: 'uppercase', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px', justifyContent: 'flex-end' }}>
                  {usuario.papel === 'ADMIN' && <Shield size={10} />}
                  {usuario.papel}
                </div>
              </div>

              <Link to="/push" className="btn btn-secondary btn-sm" title="Notificações Push">
                <Bell size={16} color="var(--gold)" />
              </Link>

              <button onClick={logout} className="btn btn-secondary btn-sm" title="Sair do sistema">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
