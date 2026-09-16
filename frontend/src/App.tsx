import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NovoAtendimento } from './pages/NovoAtendimento';
import { Historico } from './pages/Historico';
import { Mecanicos } from './pages/Mecanicos';
import { Despesas } from './pages/Despesas';
import { Trafego } from './pages/Trafego';
import { PushConfig } from './pages/PushConfig';
import { Configuracoes } from './pages/Configuracoes';
import { OrdemServicoList } from './pages/OrdemServicoList';
import { NovaOrdemServico } from './pages/NovaOrdemServico';
import { OrdemServicoDetalhes } from './pages/OrdemServicoDetalhes';
import { Produtos } from './pages/Produtos';
import { Servicos } from './pages/Servicos';
import { PatioKanban } from './pages/PatioKanban';
import { OrcamentoPublico } from './pages/OrcamentoPublico';
import { Fornecedores } from './pages/Fornecedores';
import { Compras } from './pages/Compras';
import { Financeiro } from './pages/Financeiro';
import { NotasFiscais } from './pages/NotasFiscais';
import { CRM } from './pages/CRM';
import { Relatorios } from './pages/Relatorios';
import { SpedFiscal } from './pages/SpedFiscal';
import { MigracaoOSDIG } from './pages/MigracaoOSDIG';
import { AuditoriaMigracao } from './pages/AuditoriaMigracao';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { usuario, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', color: 'var(--text-secondary)' }}>
        Carregando Lemoka Centro Automotivo...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/orcamento/:token" element={<OrcamentoPublico />} />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="patio" element={<PatioKanban />} />
            <Route path="crm" element={<CRM />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="ordens-servico" element={<OrdemServicoList />} />
            <Route path="ordens-servico/nova" element={<NovaOrdemServico />} />
            <Route path="ordens-servico/:id" element={<OrdemServicoDetalhes />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="servicos" element={<Servicos />} />
            <Route path="compras" element={<Compras />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="notas-fiscais" element={<NotasFiscais />} />
            <Route path="sped" element={<SpedFiscal />} />
            <Route path="fornecedores" element={<Fornecedores />} />
            <Route path="novo" element={<NovoAtendimento />} />
            <Route path="historico" element={<Historico />} />
            <Route path="mecanicos" element={<Mecanicos />} />
            <Route path="despesas" element={<Despesas />} />
            <Route path="trafego" element={<Trafego />} />
            <Route path="push" element={<PushConfig />} />
            <Route path="migracao-osdig" element={<MigracaoOSDIG />} />
            <Route path="auditoria-migracao" element={<AuditoriaMigracao />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
