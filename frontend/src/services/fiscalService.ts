import { api } from './api';
import {
  DocumentoFiscal,
  ValidacaoFiscalResult,
  EmpresaConfig,
  ConfiguracaoFiscal,
} from '../types';

export const fiscalService = {
  getConfig: async (): Promise<{ empresa: EmpresaConfig; config: ConfiguracaoFiscal }> => {
    const response = await api.get('/fiscal/config');
    return response.data;
  },

  updateConfig: async (data: any): Promise<{ empresa: EmpresaConfig; config: ConfiguracaoFiscal }> => {
    const response = await api.put('/fiscal/config', data);
    return response.data;
  },

  getDocumentos: async (params?: { tipo?: string; status?: string; clienteId?: string; q?: string; inicio?: string; fim?: string }): Promise<DocumentoFiscal[]> => {
    const response = await api.get('/fiscal/documentos', { params });
    return response.data;
  },

  getDocumentoById: async (id: string): Promise<DocumentoFiscal> => {
    const response = await api.get(`/fiscal/documentos/${id}`);
    return response.data;
  },

  gerarRascunho: async (ordemServicoId: string, tipo: 'NFE' | 'NFCE' | 'NFSE'): Promise<DocumentoFiscal> => {
    const response = await api.post('/fiscal/gerar-rascunho', { ordemServicoId, tipo });
    return response.data;
  },

  validarDocumento: async (id: string): Promise<ValidacaoFiscalResult> => {
    const response = await api.post(`/fiscal/documentos/${id}/validar`);
    return response.data;
  },

  emitirDocumento: async (id: string): Promise<any> => {
    const response = await api.post(`/fiscal/documentos/${id}/emitir`);
    return response.data;
  },

  cancelarDocumento: async (id: string, motivo: string): Promise<DocumentoFiscal> => {
    const response = await api.post(`/fiscal/documentos/${id}/cancelar`, { motivo });
    return response.data;
  },

  inutilizarNumeracao: async (data: {
    tipo: string;
    serie?: string;
    numeroInicial: number;
    numeroFinal: number;
    justificativa: string;
  }): Promise<DocumentoFiscal> => {
    const response = await api.post('/fiscal/inutilizar', data);
    return response.data;
  },

  getXMLUrl: (id: string) => {
    return `/api/fiscal/documentos/${id}/xml`;
  },

  getDANFEUrl: (id: string) => {
    return `/api/fiscal/documentos/${id}/danfe`;
  },
};
