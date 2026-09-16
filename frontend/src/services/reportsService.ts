import { api } from './api';

export interface DateFilter {
  period?: 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'last_month' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
}

export const reportsService = {
  getSalesReport: async (filter: DateFilter) => {
    const response = await api.get('/reports/sales', { params: filter });
    return response.data;
  },
  getServicesReport: async (filter: DateFilter) => {
    const response = await api.get('/reports/services', { params: filter });
    return response.data;
  },
  getProductsReport: async (filter: DateFilter) => {
    const response = await api.get('/reports/products', { params: filter });
    return response.data;
  },
  getPurchasesReport: async (filter: DateFilter) => {
    const response = await api.get('/reports/purchases', { params: filter });
    return response.data;
  },
  getFinancialReport: async (filter: DateFilter) => {
    const response = await api.get('/reports/financial', { params: filter });
    return response.data;
  },
  getDREReport: async (filter: DateFilter) => {
    const response = await api.get('/reports/dre', { params: filter });
    return response.data;
  },
  getCustomersReport: async (filter: DateFilter) => {
    const response = await api.get('/reports/customers', { params: filter });
    return response.data;
  },
  getMechanicsReport: async (filter: DateFilter) => {
    const response = await api.get('/reports/mechanics', { params: filter });
    return response.data;
  },
  getExecutiveReport: async (filter: DateFilter) => {
    const response = await api.get('/reports/executive', { params: filter });
    return response.data;
  }
};
