import { api } from './api';

export interface MigrationAuditRecord {
  id: string;
  categoria: 'CLIENTES' | 'VEICULOS' | 'PRODUTOS' | 'SERVICOS' | 'OS' | 'FINANCEIRO';
  severidade: 'ALERTA' | 'ERRO' | 'FATAL';
  mensagem: string;
  detalhes?: any;
  status: 'PENDENTE' | 'IGNORADO' | 'RESOLVIDO';
  osdigId?: string;
  lemokaId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditSummary {
  total: number;
  alertas: number;
  erros: number;
  fatales: number;
  pendentes: number;
  ignorados: number;
  resolvidos: number;
}

export interface AuditRunResponse {
  message: string;
  summary: AuditSummary;
}

export const auditService = {
  runAudit: async (): Promise<AuditRunResponse> => {
    const response = await api.post('/migration/audit/run');
    return response.data;
  },

  getRecords: async (params?: { categoria?: string; severidade?: string; status?: string }): Promise<{ summary: AuditSummary; records: MigrationAuditRecord[] }> => {
    const response = await api.get('/migration/audit/records', { params });
    return response.data;
  },

  updateStatus: async (id: string, status: 'PENDENTE' | 'IGNORADO' | 'RESOLVIDO'): Promise<MigrationAuditRecord> => {
    const response = await api.patch(`/migration/audit/records/${id}/status`, { status });
    return response.data;
  }
};
