import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Landmark,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Plus,
  ArrowRightLeft,
  DollarSign,
  Search,
  Filter,
  Lock,
  Unlock,
  CornerUpLeft,
  FileText,
  Building2,
  Tag,
  PieChart,
} from 'lucide-react';
import { financeiroService } from '../services/financeiroService';
import { clienteService, fornecedorService } from '../services/osService';
import {
  ContaReceber,
  ContaPagar,
  ContaBancaria,
  SessaoCaixa,
  PlanoContas,
  MovimentacaoFinanceira,
  DashboardFinanceiroData,
  Cliente,
  Fornecedor,
} from '../types';

export const Financeiro: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'receber' | 'pagar' | 'caixa_bancos' | 'plano_contas'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Data States
  const [dashboardData, setDashboardData] = useState<DashboardFinanceiroData | null>(null);
  const [fluxoCaixa, setFluxoCaixa] = useState<MovimentacaoFinanceira[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasBancarias, setContasBancarias] = useState<ContaBancaria[]>([]);
  const [sessaoCaixa, setSessaoCaixa] = useState<SessaoCaixa | null>(null);
  const [planoContas, setPlanoContas] = useState<PlanoContas[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

  // Filter States
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [modalNovoReceber, setModalNovoReceber] = useState(false);
  const [modalBaixaReceber, setModalBaixaReceber] = useState<ContaReceber | null>(null);

  const [modalNovoPagar, setModalNovoPagar] = useState(false);
  const [modalBaixaPagar, setModalBaixaPagar] = useState<ContaPagar | null>(null);

  const [modalEstorno, setModalEstorno] = useState<{ id: string; tipo: 'RECEBER' | 'PAGAR' } | null>(null);
  const [motivoEstornoText, setMotivoEstornoText] = useState('');

  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false);
  const [modalFecharCaixa, setModalFecharCaixa] = useState(false);
  const [modalSuprimento, setModalSuprimento] = useState(false);
  const [modalRetirada, setModalRetirada] = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(false);
  const [modalNovaContaBancaria, setModalNovaContaBancaria] = useState(false);
  const [modalNovaCategoria, setModalNovaCategoria] = useState(false);

  // Form States
  const [formReceber, setFormReceber] = useState({
    titulo: '',
    clienteId: '',
    dataVencimento: new Date().toISOString().split('T')[0],
    valorTotal: '',
    parcelas: '1',
    desconto: '0',
    acrescimo: '0',
    observacoes: '',
  });

  const [formPagar, setFormPagar] = useState({
    titulo: '',
    fornecedorId: '',
    dataVencimento: new Date().toISOString().split('T')[0],
    valorTotal: '',
    parcelas: '1',
    desconto: '0',
    acrescimo: '0',
    observacoes: '',
  });

  const [formBaixa, setFormBaixa] = useState({
    valor: '',
    data: new Date().toISOString().split('T')[0],
    contaBancariaId: '',
    formaPagamento: 'PIX',
    jurosMulta: '0',
    desconto: '0',
    observacoes: '',
  });

  const [formCaixaOp, setFormCaixaOp] = useState({
    valor: '',
    descricao: '',
    contaBancariaId: '',
  });

  const [formTransferencia, setFormTransferencia] = useState({
    contaOrigemId: '',
    contaDestinoId: '',
    valor: '',
    descricao: '',
  });

  const [formContaBancaria, setFormContaBancaria] = useState({
    nome: '',
    banco: '',
    agencia: '',
    conta: '',
    tipo: 'CORRENTE',
    saldoInicial: '0',
  });

  const [formCategoria, setFormCategoria] = useState({
    codigo: '',
    descricao: '',
    tipo: 'DESPESA',
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [dash, fluxo, rec, pag, banc, caixaRes, plano, clis, forns] = await Promise.all([
        financeiroService.getDashboardFinanceiro(),
        financeiroService.getFluxoCaixa(),
        financeiroService.getContasReceber({ status: filterStatus }),
        financeiroService.getContasPagar({ status: filterStatus }),
        financeiroService.getContasBancarias(),
        financeiroService.getSessaoCaixaAtual(),
        financeiroService.getPlanoContas(),
        clienteService.getClientes(),
        fornecedorService.getFornecedores(),
      ]);

      setDashboardData(dash);
      setFluxoCaixa(fluxo);
      setContasReceber(rec);
      setContasPagar(pag);
      setContasBancarias(banc);
      setSessaoCaixa(caixaRes.sessao);
      setPlanoContas(plano);
      setClientes(clis);
      setFornecedores(forns);
    } catch (err) {
      console.error('Erro ao carregar módulo financeiro:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [filterStatus]);

  // Handle Handlers
  const handleCriarReceber = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeiroService.createContaReceber({
        ...formReceber,
        valorTotal: Number(formReceber.valorTotal),
        parcelas: Number(formReceber.parcelas),
        desconto: Number(formReceber.desconto),
        acrescimo: Number(formReceber.acrescimo),
      });
      setModalNovoReceber(false);
      setFormReceber({
        titulo: '',
        clienteId: '',
        dataVencimento: new Date().toISOString().split('T')[0],
        valorTotal: '',
        parcelas: '1',
        desconto: '0',
        acrescimo: '0',
        observacoes: '',
      });
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao criar conta a receber');
    }
  };

  const handleBaixarReceber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalBaixaReceber) return;
    try {
      await financeiroService.receberTitulo(modalBaixaReceber.id, {
        valorRecebido: Number(formBaixa.valor),
        dataRecebimento: formBaixa.data,
        contaBancariaId: formBaixa.contaBancariaId || undefined,
        formaPagamento: formBaixa.formaPagamento,
        jurosMulta: Number(formBaixa.jurosMulta),
        descontoConcedido: Number(formBaixa.desconto),
        observacoes: formBaixa.observacoes,
      });
      setModalBaixaReceber(null);
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao processar recebimento');
    }
  };

  const handleCriarPagar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeiroService.createContaPagar({
        ...formPagar,
        valorTotal: Number(formPagar.valorTotal),
        parcelas: Number(formPagar.parcelas),
        desconto: Number(formPagar.desconto),
        acrescimo: Number(formPagar.acrescimo),
      });
      setModalNovoPagar(false);
      setFormPagar({
        titulo: '',
        fornecedorId: '',
        dataVencimento: new Date().toISOString().split('T')[0],
        valorTotal: '',
        parcelas: '1',
        desconto: '0',
        acrescimo: '0',
        observacoes: '',
      });
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao criar conta a pagar');
    }
  };

  const handleBaixarPagar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalBaixaPagar) return;
    try {
      await financeiroService.pagarTitulo(modalBaixaPagar.id, {
        valorPago: Number(formBaixa.valor),
        dataPagamento: formBaixa.data,
        contaBancariaId: formBaixa.contaBancariaId || undefined,
        formaPagamento: formBaixa.formaPagamento,
        jurosMulta: Number(formBaixa.jurosMulta),
        descontoObtido: Number(formBaixa.desconto),
        observacoes: formBaixa.observacoes,
      });
      setModalBaixaPagar(null);
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao processar pagamento');
    }
  };

  const handleConfirmarEstorno = async () => {
    if (!modalEstorno || !motivoEstornoText) return;
    try {
      if (modalEstorno.tipo === 'RECEBER') {
        await financeiroService.estornarRecebimento(modalEstorno.id, motivoEstornoText);
      } else {
        await financeiroService.estornarPagamento(modalEstorno.id, motivoEstornoText);
      }
      setModalEstorno(null);
      setMotivoEstornoText('');
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao estornar operação');
    }
  };

  const handleAbrirCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeiroService.abrirCaixa(Number(formCaixaOp.valor), formCaixaOp.descricao);
      setModalAbrirCaixa(false);
      setFormCaixaOp({ valor: '', descricao: '', contaBancariaId: '' });
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao abrir caixa');
    }
  };

  const handleFecharCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessaoCaixa) return;
    try {
      await financeiroService.fecharCaixa(sessaoCaixa.id, Number(formCaixaOp.valor), formCaixaOp.descricao);
      setModalFecharCaixa(false);
      setFormCaixaOp({ valor: '', descricao: '', contaBancariaId: '' });
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao fechar caixa');
    }
  };

  const handleSuprimento = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeiroService.suprimentoCaixa(Number(formCaixaOp.valor), formCaixaOp.descricao, formCaixaOp.contaBancariaId || undefined);
      setModalSuprimento(false);
      setFormCaixaOp({ valor: '', descricao: '', contaBancariaId: '' });
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao realizar suprimento');
    }
  };

  const handleRetirada = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeiroService.retiradaCaixa(Number(formCaixaOp.valor), formCaixaOp.descricao, formCaixaOp.contaBancariaId || undefined);
      setModalRetirada(false);
      setFormCaixaOp({ valor: '', descricao: '', contaBancariaId: '' });
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao realizar retirada');
    }
  };

  const handleTransferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeiroService.transferirFundos(
        formTransferencia.contaOrigemId,
        formTransferencia.contaDestinoId,
        Number(formTransferencia.valor),
        formTransferencia.descricao
      );
      setModalTransferencia(false);
      setFormTransferencia({ contaOrigemId: '', contaDestinoId: '', valor: '', descricao: '' });
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao transferir fundos');
    }
  };

  const handleNovaContaBancaria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeiroService.createContaBancaria({
        ...formContaBancaria,
        saldoInicial: Number(formContaBancaria.saldoInicial),
      });
      setModalNovaContaBancaria(false);
      setFormContaBancaria({ nome: '', banco: '', agencia: '', conta: '', tipo: 'CORRENTE', saldoInicial: '0' });
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao cadastrar conta bancária');
    }
  };

  const handleNovaCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await financeiroService.createPlanoContas(formCategoria as any);
      setModalNovaCategoria(false);
      setFormCategoria({ codigo: '', descricao: '', tipo: 'DESPESA' });
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao cadastrar categoria');
    }
  };

  const formatCurrency = (val: number | string | undefined) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'LIQUIDADO':
        return <span className="status-badge status-completed"><CheckCircle size={12} /> Liquidado</span>;
      case 'PARCIAL':
        return <span className="status-badge status-warning"><Clock size={12} /> Parcial</span>;
      case 'VENCIDO':
        return <span className="status-badge status-danger"><AlertTriangle size={12} /> Vencido</span>;
      case 'CANCELADO':
        return <span className="status-badge status-cancelled"><XCircle size={12} /> Cancelado</span>;
      default:
        return <span className="status-badge status-open"><Clock size={12} /> Em Aberto</span>;
    }
  };

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Módulo Financeiro Completo
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Contas a Receber, Contas a Pagar, Fluxo de Caixa, Bancos e Conciliação
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setModalTransferencia(true)}>
            <ArrowRightLeft size={16} /> Transferência Interna
          </button>
          {sessaoCaixa ? (
            <button className="btn btn-danger" onClick={() => { setFormCaixaOp({ valor: '', descricao: '', contaBancariaId: '' }); setModalFecharCaixa(true); }}>
              <Lock size={16} /> Fechar Caixa
            </button>
          ) : (
            <button className="btn btn-success" onClick={() => { setFormCaixaOp({ valor: '0', descricao: '', contaBancariaId: '' }); setModalAbrirCaixa(true); }}>
              <Unlock size={16} /> Abrir Caixa
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="kanban-tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          <PieChart size={16} /> Dashboard & Fluxo
        </button>
        <button
          className={`tab-btn ${activeTab === 'receber' ? 'active' : ''}`}
          onClick={() => setActiveTab('receber')}
        >
          <TrendingUp size={16} /> Contas a Receber
        </button>
        <button
          className={`tab-btn ${activeTab === 'pagar' ? 'active' : ''}`}
          onClick={() => setActiveTab('pagar')}
        >
          <TrendingDown size={16} /> Contas a Pagar
        </button>
        <button
          className={`tab-btn ${activeTab === 'caixa_bancos' ? 'active' : ''}`}
          onClick={() => setActiveTab('caixa_bancos')}
        >
          <Landmark size={16} /> Caixa & Bancos
        </button>
        <button
          className={`tab-btn ${activeTab === 'plano_contas' ? 'active' : ''}`}
          onClick={() => setActiveTab('plano_contas')}
        >
          <Tag size={16} /> Plano de Contas
        </button>
      </div>

      {/* TAB 1: DASHBOARD FINANCEIRO */}
      {activeTab === 'dashboard' && (
        <>
          {/* KPI Cards Grid */}
          <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="metric-card">
              <div className="metric-icon blue">
                <Wallet size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Caixa Físico</span>
                <span className="metric-value">{formatCurrency(dashboardData?.saldoCaixaTotal)}</span>
                <span style={{ fontSize: '0.8rem', color: sessaoCaixa ? 'var(--color-success)' : 'var(--text-secondary)' }}>
                  {sessaoCaixa ? '● Caixa Aberto' : '○ Caixa Fechado'}
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon purple">
                <Landmark size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Bancos & Contas</span>
                <span className="metric-value">{formatCurrency(dashboardData?.saldoBancosTotal)}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Total em contas PJ
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon green">
                <TrendingUp size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">A Receber Total</span>
                <span className="metric-value">{formatCurrency(dashboardData?.totalAReceber)}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>
                  Vencidos: {formatCurrency(dashboardData?.vencidoAReceber)}
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon red">
                <TrendingDown size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">A Pagar Total</span>
                <span className="metric-value">{formatCurrency(dashboardData?.totalAPagar)}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>
                  Vencidos: {formatCurrency(dashboardData?.vencidoAPagar)}
                </span>
              </div>
            </div>
          </div>

          {/* Resultado do Período Box */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Resultado Efetivo (Entradas vs Saídas de Caixa/Banco)</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                  Movimentações reais liquidadas no período. Não confunda faturamento a prazo com entrada no caixa.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Entradas</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)' }}>
                    + {formatCurrency(dashboardData?.entradasPeriodo)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Saídas</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-danger)' }}>
                    - {formatCurrency(dashboardData?.saidasPeriodo)}
                  </span>
                </div>
                <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Resultado</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 700, color: (dashboardData?.resultadoPeriodo || 0) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {formatCurrency(dashboardData?.resultadoPeriodo)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Extrato / Fluxo de Caixa Recente */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Fluxo de Caixa / Movimentações Recentes</h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Origem</th>
                    <th>Forma</th>
                    <th style={{ textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {fluxoCaixa.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                        Nenhuma movimentação registrada no período.
                      </td>
                    </tr>
                  ) : (
                    fluxoCaixa.map((mov) => (
                      <tr key={mov.id}>
                        <td style={{ fontSize: '0.85rem' }}>
                          {new Date(mov.dataMovimentacao).toLocaleString('pt-BR')}
                        </td>
                        <td>
                          <span className={`status-badge ${mov.tipo === 'ENTRADA' || mov.tipo === 'SUPRIMENTO' ? 'status-completed' : 'status-danger'}`}>
                            {mov.tipo}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{mov.descricao}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{mov.origem}</td>
                        <td style={{ fontSize: '0.85rem' }}>{mov.formaPagamento}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: mov.tipo === 'ENTRADA' || mov.tipo === 'SUPRIMENTO' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {mov.tipo === 'ENTRADA' || mov.tipo === 'SUPRIMENTO' ? '+' : '-'} {formatCurrency(mov.valor)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: CONTAS A RECEBER */}
      {activeTab === 'receber' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={() => setModalNovoReceber(true)}>
                <Plus size={16} /> Novo Título a Receber
              </button>
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar por cliente, título ou OS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Filter size={16} color="var(--text-secondary)" />
              <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="ALL">Todos os Status</option>
                <option value="ABERTO">Aberto</option>
                <option value="PARCIAL">Parcial</option>
                <option value="VENCIDO">Vencido</option>
                <option value="LIQUIDADO">Liquidado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nº Título</th>
                  <th>Título / Origem</th>
                  <th>Cliente</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Valor Total</th>
                  <th style={{ textAlign: 'right' }}>Pago</th>
                  <th style={{ textAlign: 'right' }}>Em Aberto</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contasReceber.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      Nenhum título a receber encontrado.
                    </td>
                  </tr>
                ) : (
                  contasReceber.map((tit) => (
                    <tr key={tit.id}>
                      <td style={{ fontWeight: 600 }}>#{tit.numeroTitulo}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{tit.titulo}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {tit.origem} {tit.ordemServico ? `(OS #${tit.ordemServico.numeroOs})` : ''}
                        </div>
                      </td>
                      <td>{tit.cliente?.nome || '-'}</td>
                      <td>{new Date(tit.dataVencimento).toLocaleDateString('pt-BR')}</td>
                      <td>{getStatusBadge(tit.statusCalculado || tit.status)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(tit.valorLiquido)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-success)' }}>{formatCurrency(tit.valorPago)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-danger)' }}>{formatCurrency(tit.valorEmAberto)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          {tit.status !== 'LIQUIDADO' && tit.status !== 'CANCELADO' && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => {
                                setFormBaixa({
                                  valor: String(tit.valorEmAberto),
                                  data: new Date().toISOString().split('T')[0],
                                  contaBancariaId: contasBancarias[0]?.id || '',
                                  formaPagamento: 'PIX',
                                  jurosMulta: '0',
                                  desconto: '0',
                                  observacoes: '',
                                });
                                setModalBaixaReceber(tit);
                              }}
                            >
                              Receber
                            </button>
                          )}

                          {tit.valorPago > 0 && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setModalEstorno({ id: tit.id, tipo: 'RECEBER' })}
                            >
                              <CornerUpLeft size={14} /> Estornar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CONTAS A PAGAR */}
      {activeTab === 'pagar' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button className="btn btn-primary" onClick={() => setModalNovoPagar(true)}>
                <Plus size={16} /> Novo Título a Pagar
              </button>
              <div className="search-box">
                <Search size={16} />
                <input
                  type="text"
                  placeholder="Buscar por fornecedor, título ou compra..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Filter size={16} color="var(--text-secondary)" />
              <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="ALL">Todos os Status</option>
                <option value="ABERTO">Aberto</option>
                <option value="PARCIAL">Parcial</option>
                <option value="VENCIDO">Vencido</option>
                <option value="LIQUIDADO">Liquidado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nº Título</th>
                  <th>Título / Origem</th>
                  <th>Fornecedor</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Valor Total</th>
                  <th style={{ textAlign: 'right' }}>Pago</th>
                  <th style={{ textAlign: 'right' }}>Em Aberto</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contasPagar.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      Nenhum título a pagar encontrado.
                    </td>
                  </tr>
                ) : (
                  contasPagar.map((tit) => (
                    <tr key={tit.id}>
                      <td style={{ fontWeight: 600 }}>#{tit.numeroTitulo}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{tit.titulo}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {tit.origem} {tit.compra ? `(Compra #${tit.compra.numeroCompra})` : ''}
                        </div>
                      </td>
                      <td>{tit.fornecedor?.nomeFantasia || tit.fornecedor?.razaoSocial || '-'}</td>
                      <td>{new Date(tit.dataVencimento).toLocaleDateString('pt-BR')}</td>
                      <td>{getStatusBadge(tit.statusCalculado || tit.status)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(tit.valorLiquido)}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-success)' }}>{formatCurrency(tit.valorPago)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-danger)' }}>{formatCurrency(tit.valorEmAberto)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          {tit.status !== 'LIQUIDADO' && tit.status !== 'CANCELADO' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => {
                                setFormBaixa({
                                  valor: String(tit.valorEmAberto),
                                  data: new Date().toISOString().split('T')[0],
                                  contaBancariaId: contasBancarias[0]?.id || '',
                                  formaPagamento: 'PIX',
                                  jurosMulta: '0',
                                  desconto: '0',
                                  observacoes: '',
                                });
                                setModalBaixaPagar(tit);
                              }}
                            >
                              Pagar
                            </button>
                          )}

                          {tit.valorPago > 0 && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => setModalEstorno({ id: tit.id, tipo: 'PAGAR' })}
                            >
                              <CornerUpLeft size={14} /> Estornar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CAIXA E BANCOS */}
      {activeTab === 'caixa_bancos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Sessão de Caixa Atual */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Wallet size={20} color="var(--color-primary)" /> Caixa Físico (Balcão)
              </h3>
              {sessaoCaixa ? (
                <span className="status-badge status-completed">Aberto</span>
              ) : (
                <span className="status-badge status-cancelled">Fechado</span>
              )}
            </div>

            {sessaoCaixa ? (
              <div>
                <div style={{ background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Abertura</span>
                      <div style={{ fontWeight: 600 }}>{new Date(sessaoCaixa.dataAbertura).toLocaleString('pt-BR')}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Saldo Inicial</span>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(sessaoCaixa.saldoInicial)}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Entradas / Suprimentos</span>
                      <div style={{ fontWeight: 600, color: 'var(--color-success)' }}>+ {formatCurrency(sessaoCaixa.totais?.entradas)}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Saídas / Sangrias</span>
                      <div style={{ fontWeight: 600, color: 'var(--color-danger)' }}>- {formatCurrency(sessaoCaixa.totais?.saidas)}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600 }}>Saldo Calculado em Caixa</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {formatCurrency(sessaoCaixa.saldoCalculado)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn btn-success" style={{ flex: 1 }} onClick={() => setModalSuprimento(true)}>
                    <Plus size={16} /> Suprimento
                  </button>
                  <button className="btn btn-warning" style={{ flex: 1 }} onClick={() => setModalRetirada(true)}>
                    Retirada / Sangria
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>O caixa físico está fechado no momento.</p>
                <button className="btn btn-success" onClick={() => setModalAbrirCaixa(true)}>
                  <Unlock size={16} /> Abrir Caixa com Saldo Inicial
                </button>
              </div>
            )}
          </div>

          {/* Contas Bancárias / Cofres */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Building2 size={20} color="var(--color-primary)" /> Contas Bancárias / Cofres
              </h3>
              <button className="btn btn-sm btn-primary" onClick={() => setModalNovaContaBancaria(true)}>
                <Plus size={14} /> Nova Conta
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {contasBancarias.map((banc) => (
                <div key={banc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: 'var(--bg-main)', borderRadius: '8px', borderLeft: '4px solid var(--color-primary)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{banc.nome}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {banc.banco ? `${banc.banco} | Ag: ${banc.agencia || '-'} CC: ${banc.conta || '-'}` : banc.tipo}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatCurrency(banc.saldoAtual)}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Saldo Atual</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PLANO DE CONTAS */}
      {activeTab === 'plano_contas' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Plano de Contas / Categorias Financeiras</h3>
            <button className="btn btn-primary" onClick={() => setModalNovaCategoria(true)}>
              <Plus size={16} /> Nova Categoria
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descrição da Categoria</th>
                  <th>Tipo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {planoContas.map((cat) => (
                  <tr key={cat.id}>
                    <td style={{ fontWeight: 600 }}>{cat.codigo || '-'}</td>
                    <td style={{ fontWeight: 500 }}>{cat.descricao}</td>
                    <td>
                      <span className={`status-badge ${cat.tipo === 'RECEITA' ? 'status-completed' : 'status-warning'}`}>
                        {cat.tipo}
                      </span>
                    </td>
                    <td>
                      {cat.status ? (
                        <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Ativo</span>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>Inativo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NOVO CONTAS A RECEBER */}
      {modalNovoReceber && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Novo Título a Receber</h3>
              <button className="modal-close" onClick={() => setModalNovoReceber(false)}>×</button>
            </div>
            <form onSubmit={handleCriarReceber}>
              <div className="form-group">
                <label className="form-label">Descrição / Título *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={formReceber.titulo}
                  onChange={(e) => setFormReceber({ ...formReceber, titulo: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cliente</label>
                <select
                  className="form-select"
                  value={formReceber.clienteId}
                  onChange={(e) => setFormReceber({ ...formReceber, clienteId: e.target.value })}
                >
                  <option value="">Selecione um cliente (opcional)</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Valor Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    required
                    value={formReceber.valorTotal}
                    onChange={(e) => setFormReceber({ ...formReceber, valorTotal: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nº de Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    className="form-input"
                    value={formReceber.parcelas}
                    onChange={(e) => setFormReceber({ ...formReceber, parcelas: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Data de Vencimento 1ª Parcela *</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={formReceber.dataVencimento}
                  onChange={(e) => setFormReceber({ ...formReceber, dataVencimento: e.target.value })}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalNovoReceber(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Gerar Título(s)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECEBER / BAIXAR TÍTULO */}
      {modalBaixaReceber && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Receber Título: #{modalBaixaReceber.numeroTitulo}</h3>
              <button className="modal-close" onClick={() => setModalBaixaReceber(null)}>×</button>
            </div>
            <form onSubmit={handleBaixarReceber}>
              <div style={{ background: 'var(--bg-main)', padding: '0.85rem', borderRadius: '6px', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600 }}>{modalBaixaReceber.titulo}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Em Aberto: <strong style={{ color: 'var(--color-danger)' }}>{formatCurrency(modalBaixaReceber.valorEmAberto)}</strong>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Valor Recebido (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    required
                    value={formBaixa.valor}
                    onChange={(e) => setFormBaixa({ ...formBaixa, valor: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Data do Recebimento *</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    value={formBaixa.data}
                    onChange={(e) => setFormBaixa({ ...formBaixa, data: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Forma de Recebimento</label>
                  <select
                    className="form-select"
                    value={formBaixa.formaPagamento}
                    onChange={(e) => setFormBaixa({ ...formBaixa, formaPagamento: e.target.value })}
                  >
                    <option value="PIX">PIX</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="TRANSFERENCIA">Transferência</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Depositar em Conta / Caixa</label>
                  <select
                    className="form-select"
                    value={formBaixa.contaBancariaId}
                    onChange={(e) => setFormBaixa({ ...formBaixa, contaBancariaId: e.target.value })}
                  >
                    <option value="">Caixa Padrão / Balcão</option>
                    {contasBancarias.map((b) => (
                      <option key={b.id} value={b.id}>{b.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalBaixaReceber(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  Confirmar Baixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO CONTAS A PAGAR */}
      {modalNovoPagar && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Novo Título a Pagar</h3>
              <button className="modal-close" onClick={() => setModalNovoPagar(false)}>×</button>
            </div>
            <form onSubmit={handleCriarPagar}>
              <div className="form-group">
                <label className="form-label">Descrição / Título *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={formPagar.titulo}
                  onChange={(e) => setFormPagar({ ...formPagar, titulo: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Fornecedor</label>
                <select
                  className="form-select"
                  value={formPagar.fornecedorId}
                  onChange={(e) => setFormPagar({ ...formPagar, fornecedorId: e.target.value })}
                >
                  <option value="">Selecione um fornecedor (opcional)</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>{f.nomeFantasia || f.razaoSocial}</option>
                  ))}
                </select>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Valor Total (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    required
                    value={formPagar.valorTotal}
                    onChange={(e) => setFormPagar({ ...formPagar, valorTotal: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nº de Parcelas</label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    className="form-input"
                    value={formPagar.parcelas}
                    onChange={(e) => setFormPagar({ ...formPagar, parcelas: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Data de Vencimento 1ª Parcela *</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={formPagar.dataVencimento}
                  onChange={(e) => setFormPagar({ ...formPagar, dataVencimento: e.target.value })}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalNovoPagar(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Gerar Título(s)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PAGAR / BAIXAR TÍTULO */}
      {modalBaixaPagar && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Pagar Título: #{modalBaixaPagar.numeroTitulo}</h3>
              <button className="modal-close" onClick={() => setModalBaixaPagar(null)}>×</button>
            </div>
            <form onSubmit={handleBaixarPagar}>
              <div style={{ background: 'var(--bg-main)', padding: '0.85rem', borderRadius: '6px', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600 }}>{modalBaixaPagar.titulo}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Em Aberto: <strong style={{ color: 'var(--color-danger)' }}>{formatCurrency(modalBaixaPagar.valorEmAberto)}</strong>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Valor Pago (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    required
                    value={formBaixa.valor}
                    onChange={(e) => setFormBaixa({ ...formBaixa, valor: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Data do Pagamento *</label>
                  <input
                    type="date"
                    className="form-input"
                    required
                    value={formBaixa.data}
                    onChange={(e) => setFormBaixa({ ...formBaixa, data: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Forma de Pagamento</label>
                  <select
                    className="form-select"
                    value={formBaixa.formaPagamento}
                    onChange={(e) => setFormBaixa({ ...formBaixa, formaPagamento: e.target.value })}
                  >
                    <option value="PIX">PIX</option>
                    <option value="DINHEIRO">Dinheiro</option>
                    <option value="CARTAO_DEBITO">Cartão de Débito</option>
                    <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="TRANSFERENCIA">Transferência</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Retirar da Conta / Caixa</label>
                  <select
                    className="form-select"
                    value={formBaixa.contaBancariaId}
                    onChange={(e) => setFormBaixa({ ...formBaixa, contaBancariaId: e.target.value })}
                  >
                    <option value="">Caixa Padrão / Balcão</option>
                    {contasBancarias.map((b) => (
                      <option key={b.id} value={b.id}>{b.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalBaixaPagar(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirmar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ESTORNO DE OPERAÇÃO */}
      {modalEstorno && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Estornar Baixa / Liquidação</h3>
              <button className="modal-close" onClick={() => setModalEstorno(null)}>×</button>
            </div>
            <div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                O estorno irá reverter a movimentação financeira e restaurar o saldo em aberto do título. Informar motivo obrigatório:
              </p>
              <div className="form-group">
                <label className="form-label">Motivo do Estorno *</label>
                <textarea
                  className="form-textarea"
                  required
                  rows={3}
                  value={motivoEstornoText}
                  onChange={(e) => setMotivoEstornoText(e.target.value)}
                  placeholder="Informe a justificativa do estorno..."
                />
              </div>
              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setModalEstorno(null)}>
                  Cancelar
                </button>
                <button className="btn btn-danger" onClick={handleConfirmarEstorno}>
                  Confirmar Estorno
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ABRIR CAIXA */}
      {modalAbrirCaixa && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Abertura de Caixa</h3>
              <button className="modal-close" onClick={() => setModalAbrirCaixa(false)}>×</button>
            </div>
            <form onSubmit={handleAbrirCaixa}>
              <div className="form-group">
                <label className="form-label">Saldo Inicial do Caixa (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  required
                  value={formCaixaOp.valor}
                  onChange={(e) => setFormCaixaOp({ ...formCaixaOp, valor: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Observações</label>
                <input
                  type="text"
                  className="form-input"
                  value={formCaixaOp.descricao}
                  onChange={(e) => setFormCaixaOp({ ...formCaixaOp, descricao: e.target.value })}
                />
              </div>
              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalAbrirCaixa(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  Abrir Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FECHAR CAIXA */}
      {modalFecharCaixa && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Fechamento de Caixa</h3>
              <button className="modal-close" onClick={() => setModalFecharCaixa(false)}>×</button>
            </div>
            <form onSubmit={handleFecharCaixa}>
              <div style={{ background: 'var(--bg-main)', padding: '0.85rem', borderRadius: '6px', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Saldo Calculado no Sistema:</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{formatCurrency(sessaoCaixa?.saldoCalculado)}</div>
              </div>

              <div className="form-group">
                <label className="form-label">Valor Total Contado em Dinheiro (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  required
                  value={formCaixaOp.valor}
                  onChange={(e) => setFormCaixaOp({ ...formCaixaOp, valor: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observações sobre diferenças / fechamento</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={formCaixaOp.descricao}
                  onChange={(e) => setFormCaixaOp({ ...formCaixaOp, descricao: e.target.value })}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalFecharCaixa(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-danger">
                  Encerrar e Concluir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SUPRIMENTO */}
      {modalSuprimento && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Suprimento de Caixa</h3>
              <button className="modal-close" onClick={() => setModalSuprimento(false)}>×</button>
            </div>
            <form onSubmit={handleSuprimento}>
              <div className="form-group">
                <label className="form-label">Valor a Adicionar (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  required
                  value={formCaixaOp.valor}
                  onChange={(e) => setFormCaixaOp({ ...formCaixaOp, valor: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Descrição / Origem dos Fundos *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Ex: Adição de troco inicial"
                  value={formCaixaOp.descricao}
                  onChange={(e) => setFormCaixaOp({ ...formCaixaOp, descricao: e.target.value })}
                />
              </div>
              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalSuprimento(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-success">
                  Confirmar Suprimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RETIRADA / SANGRIA */}
      {modalRetirada && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Retirada / Sangria de Caixa</h3>
              <button className="modal-close" onClick={() => setModalRetirada(false)}>×</button>
            </div>
            <form onSubmit={handleRetirada}>
              <div className="form-group">
                <label className="form-label">Valor a Retirar (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  required
                  value={formCaixaOp.valor}
                  onChange={(e) => setFormCaixaOp({ ...formCaixaOp, valor: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Motivo da Retirada *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Ex: Sangria para depósito bancário"
                  value={formCaixaOp.descricao}
                  onChange={(e) => setFormCaixaOp({ ...formCaixaOp, descricao: e.target.value })}
                />
              </div>
              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalRetirada(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-warning">
                  Confirmar Retirada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFERÊNCIA INTERNA */}
      {modalTransferencia && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Transferência Entre Contas</h3>
              <button className="modal-close" onClick={() => setModalTransferencia(false)}>×</button>
            </div>
            <form onSubmit={handleTransferencia}>
              <div className="form-group">
                <label className="form-label">Conta de Origem (Saída) *</label>
                <select
                  className="form-select"
                  required
                  value={formTransferencia.contaOrigemId}
                  onChange={(e) => setFormTransferencia({ ...formTransferencia, contaOrigemId: e.target.value })}
                >
                  <option value="">Selecione a conta de origem</option>
                  {contasBancarias.map((b) => (
                    <option key={b.id} value={b.id}>{b.nome} ({formatCurrency(b.saldoAtual)})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Conta de Destino (Entrada) *</label>
                <select
                  className="form-select"
                  required
                  value={formTransferencia.contaDestinoId}
                  onChange={(e) => setFormTransferencia({ ...formTransferencia, contaDestinoId: e.target.value })}
                >
                  <option value="">Selecione a conta de destino</option>
                  {contasBancarias.map((b) => (
                    <option key={b.id} value={b.id}>{b.nome} ({formatCurrency(b.saldoAtual)})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Valor a Transferir (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input"
                  required
                  value={formTransferencia.valor}
                  onChange={(e) => setFormTransferencia({ ...formTransferencia, valor: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descrição / Observação</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Transferência de saldo de sangria para Bradesco PJ"
                  value={formTransferencia.descricao}
                  onChange={(e) => setFormTransferencia({ ...formTransferencia, descricao: e.target.value })}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalTransferencia(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Executar Transferência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA CONTA BANCÁRIA */}
      {modalNovaContaBancaria && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Cadastrar Conta Bancária / Cofre</h3>
              <button className="modal-close" onClick={() => setModalNovaContaBancaria(false)}>×</button>
            </div>
            <form onSubmit={handleNovaContaBancaria}>
              <div className="form-group">
                <label className="form-label">Nome da Conta *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Ex: Itaú PJ Principal, Cofre Empresa"
                  value={formContaBancaria.nome}
                  onChange={(e) => setFormContaBancaria({ ...formContaBancaria, nome: e.target.value })}
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Tipo de Conta</label>
                  <select
                    className="form-select"
                    value={formContaBancaria.tipo}
                    onChange={(e) => setFormContaBancaria({ ...formContaBancaria, tipo: e.target.value })}
                  >
                    <option value="CORRENTE">Conta Corrente</option>
                    <option value="POUPANCA">Poupança</option>
                    <option value="CARTEIRA_DIGITAL">Carteira Digital</option>
                    <option value="CAIXA_FISICO">Caixa Físico</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Saldo Inicial (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formContaBancaria.saldoInicial}
                    onChange={(e) => setFormContaBancaria({ ...formContaBancaria, saldoInicial: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalNovaContaBancaria(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Cadastrar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA CATEGORIA PLANO DE CONTAS */}
      {modalNovaCategoria && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Nova Categoria de Plano de Contas</h3>
              <button className="modal-close" onClick={() => setModalNovaCategoria(false)}>×</button>
            </div>
            <form onSubmit={handleNovaCategoria}>
              <div className="form-group">
                <label className="form-label">Descrição da Categoria *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Ex: Licenças de Software, Ferramentas"
                  value={formCategoria.descricao}
                  onChange={(e) => setFormCategoria({ ...formCategoria, descricao: e.target.value })}
                />
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Código (Opcional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: 2.9"
                    value={formCategoria.codigo}
                    onChange={(e) => setFormCategoria({ ...formCategoria, codigo: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <select
                    className="form-select"
                    value={formCategoria.tipo}
                    onChange={(e) => setFormCategoria({ ...formCategoria, tipo: e.target.value as 'RECEITA' | 'DESPESA' })}
                  >
                    <option value="DESPESA">Despesa</option>
                    <option value="RECEITA">Receita</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalNovaCategoria(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
