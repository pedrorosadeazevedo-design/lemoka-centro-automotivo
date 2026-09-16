import { api } from './api';
import {
  PlanoContas,
  ContaBancaria,
  SessaoCaixa,
  ContaReceber,
  ContaPagar,
  MovimentacaoFinanceira,
  DashboardFinanceiroData,
} from '../types';

export const financeiroService = {
  // Plano de Contas
  getPlanoContas: async (): Promise<PlanoContas[]> => {
    const response = await api.get('/financeiro/plano-contas');
    return response.data;
  },
  createPlanoContas: async (data: Partial<PlanoContas>): Promise<PlanoContas> => {
    const response = await api.post('/financeiro/plano-contas', data);
    return response.data;
  },
  updatePlanoContas: async (id: string, data: Partial<PlanoContas>): Promise<PlanoContas> => {
    const response = await api.put(`/financeiro/plano-contas/${id}`, data);
    return response.data;
  },

  // Contas Bancárias / Cofres
  getContasBancarias: async (): Promise<ContaBancaria[]> => {
    const response = await api.get('/financeiro/contas-bancarias');
    return response.data;
  },
  createContaBancaria: async (data: Partial<ContaBancaria>): Promise<ContaBancaria> => {
    const response = await api.post('/financeiro/contas-bancarias', data);
    return response.data;
  },
  updateContaBancaria: async (id: string, data: Partial<ContaBancaria>): Promise<ContaBancaria> => {
    const response = await api.put(`/financeiro/contas-bancarias/${id}`, data);
    return response.data;
  },

  // Caixa
  getSessaoCaixaAtual: async (): Promise<{ aberta: boolean; sessao: SessaoCaixa | null }> => {
    const response = await api.get('/financeiro/caixa/atual');
    return response.data;
  },
  getHistoricoCaixa: async (): Promise<SessaoCaixa[]> => {
    const response = await api.get('/financeiro/caixa/historico');
    return response.data;
  },
  abrirCaixa: async (saldoInicial: number, observacoes?: string): Promise<SessaoCaixa> => {
    const response = await api.post('/financeiro/caixa/abrir', { saldoInicial, observacoes });
    return response.data;
  },
  fecharCaixa: async (id: string, saldoInformado: number, observacoes?: string): Promise<SessaoCaixa> => {
    const response = await api.post(`/financeiro/caixa/${id}/fechar`, { saldoInformado, observacoes });
    return response.data;
  },
  suprimentoCaixa: async (valor: number, descricao: string, contaBancariaId?: string): Promise<MovimentacaoFinanceira> => {
    const response = await api.post('/financeiro/caixa/suprimento', { valor, descricao, contaBancariaId });
    return response.data;
  },
  retiradaCaixa: async (valor: number, descricao: string, contaBancariaId?: string): Promise<MovimentacaoFinanceira> => {
    const response = await api.post('/financeiro/caixa/retirada', { valor, descricao, contaBancariaId });
    return response.data;
  },

  // Contas a Receber
  getContasReceber: async (params?: { status?: string; clienteId?: string; q?: string; inicio?: string; fim?: string }): Promise<ContaReceber[]> => {
    const response = await api.get('/financeiro/contas-receber', { params });
    return response.data;
  },
  createContaReceber: async (data: any): Promise<ContaReceber[]> => {
    const response = await api.post('/financeiro/contas-receber', data);
    return response.data;
  },
  receberTitulo: async (id: string, data: {
    valorRecebido: number;
    dataRecebimento?: string;
    contaBancariaId?: string;
    formaPagamento?: string;
    jurosMulta?: number;
    descontoConcedido?: number;
    observacoes?: string;
  }): Promise<{ titulo: ContaReceber; movimentacao: MovimentacaoFinanceira }> => {
    const response = await api.post(`/financeiro/contas-receber/${id}/receber`, data);
    return response.data;
  },
  estornarRecebimento: async (id: string, motivo: string): Promise<void> => {
    await api.post(`/financeiro/contas-receber/${id}/estornar`, { motivo });
  },

  // Contas a Pagar
  getContasPagar: async (params?: { status?: string; fornecedorId?: string; q?: string; inicio?: string; fim?: string }): Promise<ContaPagar[]> => {
    const response = await api.get('/financeiro/contas-pagar', { params });
    return response.data;
  },
  createContaPagar: async (data: any): Promise<ContaPagar[]> => {
    const response = await api.post('/financeiro/contas-pagar', data);
    return response.data;
  },
  pagarTitulo: async (id: string, data: {
    valorPago: number;
    dataPagamento?: string;
    contaBancariaId?: string;
    formaPagamento?: string;
    jurosMulta?: number;
    descontoObtido?: number;
    observacoes?: string;
  }): Promise<{ titulo: ContaPagar; movimentacao: MovimentacaoFinanceira }> => {
    const response = await api.post(`/financeiro/contas-pagar/${id}/pagar`, data);
    return response.data;
  },
  estornarPagamento: async (id: string, motivo: string): Promise<void> => {
    await api.post(`/financeiro/contas-pagar/${id}/estornar`, { motivo });
  },

  // Transferências
  transferirFundos: async (contaOrigemId: string, contaDestinoId: string, valor: number, descricao?: string): Promise<any> => {
    const response = await api.post('/financeiro/transferencias', { contaOrigemId, contaDestinoId, valor, descricao });
    return response.data;
  },

  // Dashboard & Fluxo de Caixa
  getDashboardFinanceiro: async (params?: { inicio?: string; fim?: string }): Promise<DashboardFinanceiroData> => {
    const response = await api.get('/financeiro/dashboard', { params });
    return response.data;
  },
  getFluxoCaixa: async (params?: { inicio?: string; fim?: string; contaBancariaId?: string }): Promise<MovimentacaoFinanceira[]> => {
    const response = await api.get('/financeiro/fluxo-caixa', { params });
    return response.data;
  },
};
