import React, { createContext, useContext, useState, useEffect } from 'react';
import { Usuario } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  usuario: Usuario | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('@lemoka:token') || localStorage.getItem('@forza1:token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        const isExpired = decoded.exp ? decoded.exp * 1000 < Date.now() : false;
        if (!isExpired) {
          setUsuario({ id: decoded.id, email: decoded.email, papel: decoded.papel });
        } else {
          localStorage.removeItem('@lemoka:token');
          localStorage.removeItem('@forza1:token');
        }
      } catch {
        localStorage.removeItem('@lemoka:token');
        localStorage.removeItem('@forza1:token');
      }
    }
    setLoading(false);
  }, []);

  const login = (token: string, usuario: Usuario) => {
    localStorage.setItem('@lemoka:token', token);
    setUsuario(usuario);
  };

  const logout = () => {
    localStorage.removeItem('@lemoka:token');
    localStorage.removeItem('@forza1:token');
    setUsuario(null);
  };

  const isAdmin = usuario?.papel === 'ADMIN';

  return (
    <AuthContext.Provider value={{ usuario, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
