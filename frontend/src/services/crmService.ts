import { api } from './api';
import {
  CRMDashboardData,
  PrevisaoRetorno,
  TarefaFollowUp,
  Tag,
  Cliente,
  OrdemServico,
  ObservacaoCliente,
} from '../types';

export const crmService = {
  getDashboard: async (): Promise<CRMDashboardData> => {
    const response = await api.get('/crm/dashboard');
    return response.data;
  },

  getPerfilCliente: async (id: string): Promise<any> => {
    const response = await api.get(`/crm/cliente/${id}`);
    return response.data;
  },

  getHistoricoVeiculo: async (idOrPlaca: string): Promise<any> => {
    const response = await api.get(`/crm/veiculo/${idOrPlaca}`);
    return response.data;
  },

  getRetornos: async (params?: { filtro?: string; q?: string }): Promise<PrevisaoRetorno[]> => {
    const response = await api.get('/crm/retornos', { params });
    return response.data;
  },

  concluirRetorno: async (id: string, data: { status: string; observacoes?: string }): Promise<PrevisaoRetorno> => {
    const response = await api.post(`/crm/retornos/${id}/concluir`, data);
    return response.data;
  },

  getClientesInativos: async (dias: number = 90): Promise<Cliente[]> => {
    const response = await api.get('/crm/inativos', { params: { dias } });
    return response.data;
  },

  getAniversariantes: async (janela: number = 7): Promise<Cliente[]> => {
    const response = await api.get('/crm/aniversariantes', { params: { janela } });
    return response.data;
  },

  getOrcamentosPendentes: async (): Promise<OrdemServico[]> => {
    const response = await api.get('/crm/orcamentos-pendentes');
    return response.data;
  },

  getFollowUps: async (params?: { status?: string; clienteId?: string }): Promise<TarefaFollowUp[]> => {
    const response = await api.get('/crm/followups', { params });
    return response.data;
  },

  createFollowUp: async (data: any): Promise<TarefaFollowUp> => {
    const response = await api.post('/crm/followups', data);
    return response.data;
  },

  updateFollowUp: async (id: string, data: any): Promise<TarefaFollowUp> => {
    const response = await api.put(`/crm/followups/${id}`, data);
    return response.data;
  },

  getTags: async (): Promise<Tag[]> => {
    const response = await api.get('/crm/tags');
    return response.data;
  },

  createTag: async (data: { nome: string; cor?: string; descricao?: string }): Promise<Tag> => {
    const response = await api.post('/crm/tags', data);
    return response.data;
  },

  associarTag: async (clienteId: string, tagId: string): Promise<any> => {
    const response = await api.post('/crm/tags/associar', { clienteId, tagId });
    return response.data;
  },

  removerTag: async (clienteId: string, tagId: string): Promise<any> => {
    const response = await api.post('/crm/tags/remover', { clienteId, tagId });
    return response.data;
  },

  addObservacao: async (clienteId: string, conteudo: string): Promise<ObservacaoCliente> => {
    const response = await api.post('/crm/observacoes', { clienteId, conteudo });
    return response.data;
  },

  /**
   * Helper para gerar link com mensagem pré-preenchida para WhatsApp (sem envio automático / sem API externa)
   */
  getWhatsAppLink: (phone: string | undefined, message: string): string => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMsg = encodeURIComponent(message);
    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    return `https://wa.me/${fullPhone}?text=${encodedMsg}`;
  },
};
