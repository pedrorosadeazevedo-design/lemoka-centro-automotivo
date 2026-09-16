import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, History, Users, DollarSign, TrendingUp, Settings, FileText, Package, Wrench, LayoutGrid, ShoppingCart, Truck, Database, BarChart3, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Navigation: React.FC = () => {
  const { isAdmin } = useAuth();

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/patio', label: 'Pátio da Oficina', icon: LayoutGrid },
    { to: '/crm', label: 'CRM / Fidelização', icon: Users },
    { to: '/relatorios', label: 'Relatórios & DRE', icon: BarChart3 },
    { to: '/ordens-servico', label: 'Ordens de Serviço', icon: FileText },
    { to: '/produtos', label: 'Peças & Produtos', icon: Package },
    { to: '/servicos', label: 'Serviços', icon: Wrench },
    { to: '/compras', label: 'Compras / Entrada', icon: ShoppingCart },
    { to: '/financeiro', label: 'Financeiro', icon: DollarSign },
    { to: '/notas-fiscais', label: 'Notas Fiscais', icon: FileText },
    { to: '/sped', label: 'SPED Fiscal', icon: FileText },
    { to: '/fornecedores', label: 'Fornecedores', icon: Truck },
    { to: '/novo', label: 'Novo (Rápido)', icon: PlusCircle },
    { to: '/historico', label: 'Histórico', icon: History },
    { to: '/mecanicos', label: 'Mecânicos', icon: Users },
    { to: '/despesas', label: 'Despesas', icon: DollarSign },
    { to: '/trafego', label: 'Tráfego', icon: TrendingUp },
  ];

  if (isAdmin) {
    navItems.push({ to: '/migracao-osdig', label: 'Migração OSDIG (Prévia)', icon: Database });
    navItems.push({ to: '/auditoria-migracao', label: 'Auditoria Migração', icon: ShieldCheck });
    navItems.push({ to: '/configuracoes', label: 'Configurações', icon: Settings });
  }

  return (
    <>
      {/* Desktop Navigation */}
      <div className="main-content" style={{ padding: '0.75rem 1.25rem 0 1.25rem' }}>
        <nav className="desktop-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </>
  );
};
