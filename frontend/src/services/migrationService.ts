import { api } from './api';

export const migrationService = {
  executeDryRun: async (dataset: any) => {
    const response = await api.post('/migration/dry-run', { dataset });
    return response.data;
  },
  executeBatch: async (dataset: any, modo: string = 'HOMOLOGACAO_AMOSTRA') => {
    const response = await api.post('/migration/execute-batch', { dataset, modo });
    return response.data;
  },
  getBatches: async () => {
    const response = await api.get('/migration/batches');
    return response.data;
  }
};
