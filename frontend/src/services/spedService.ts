import { api } from './api';

export interface PeriodoFiscal {
  id: string;
  competencia: string;
  dataInicio: string;
  dataFim: string;
  status: 'ABERTO' | 'EM_PROCESSAMENTO' | 'VALIDADO' | 'EXPORTADO' | 'FECHADO';
  layoutVersao: string;
  totalEntradas: number;
  totalSaidas: number;
  totalDocumentos: number;
  totalInconsistencias: number;
  fechadoEm?: string;
  inconsistencias?: any[];
  arquivos?: any[];
  _count?: {
    inconsistencias: number;
    arquivos: number;
    auditorias: number;
  };
}

export const spedService = {
  getPeriodos: async (): Promise<PeriodoFiscal[]> => {
    const response = await api.get('/sped/periodos');
    return response.data;
  },
  createPeriodo: async (competencia: string, layoutVersao?: string): Promise<PeriodoFiscal> => {
    const response = await api.post('/sped/periodos', { competencia, layoutVersao });
    return response.data;
  },
  processarPeriodo: async (id: string): Promise<PeriodoFiscal> => {
    const response = await api.post(`/sped/periodos/${id}/processar`);
    return response.data;
  },
  gerarArquivo: async (id: string) => {
    const response = await api.post(`/sped/periodos/${id}/gerar-arquivo`);
    return response.data;
  },
  fecharPeriodo: async (id: string): Promise<PeriodoFiscal> => {
    const response = await api.post(`/sped/periodos/${id}/fechar`);
    return response.data;
  }
};
