import { api } from './api';
import { Cliente, Vehicle, OrdemServico, StatusOS, Produto, Servico } from '../types';

export const clienteService = {
  getClientes: async (query?: string): Promise<Cliente[]> => {
    const response = await api.get<Cliente[]>('/clientes', {
      params: { q: query },
    });
    return response.data;
  },

  getClienteById: async (id: string): Promise<Cliente> => {
    const response = await api.get<Cliente>(`/clientes/${id}`);
    return response.data;
  },

  createCliente: async (clienteData: Partial<Cliente>): Promise<Cliente> => {
    const response = await api.post<Cliente>('/clientes', clienteData);
    return response.data;
  },

  updateCliente: async (id: string, clienteData: Partial<Cliente>): Promise<Cliente> => {
    const response = await api.put<Cliente>(`/clientes/${id}`, clienteData);
    return response.data;
  },
};

export const veiculoService = {
  getVeiculos: async (query?: string, clienteId?: string): Promise<Vehicle[]> => {
    const response = await api.get<Vehicle[]>('/veiculos', {
      params: { q: query, clienteId },
    });
    return response.data;
  },

  getVeiculoById: async (id: string): Promise<Vehicle> => {
    const response = await api.get<Vehicle>(`/veiculos/${id}`);
    return response.data;
  },

  createVeiculo: async (veiculoData: Partial<Vehicle>): Promise<Vehicle> => {
    const response = await api.post<Vehicle>('/veiculos', veiculoData);
    return response.data;
  },

  updateVeiculo: async (id: string, veiculoData: Partial<Vehicle>): Promise<Vehicle> => {
    const response = await api.put<Vehicle>(`/veiculos/${id}`, veiculoData);
    return response.data;
  },
};

export const produtoService = {
  getProdutos: async (query?: string): Promise<Produto[]> => {
    const response = await api.get<Produto[]>('/produtos', { params: { q: query } });
    return response.data;
  },

  createProduto: async (data: Partial<Produto>): Promise<Produto> => {
    const response = await api.post<Produto>('/produtos', data);
    return response.data;
  },

  updateProduto: async (id: string, data: Partial<Produto>): Promise<Produto> => {
    const response = await api.put<Produto>(`/produtos/${id}`, data);
    return response.data;
  },
};

export const servicoService = {
  getServicos: async (query?: string): Promise<Servico[]> => {
    const response = await api.get<Servico[]>('/servicos', { params: { q: query } });
    return response.data;
  },

  createServico: async (data: Partial<Servico>): Promise<Servico> => {
    const response = await api.post<Servico>('/servicos', data);
    return response.data;
  },

  updateServico: async (id: string, data: Partial<Servico>): Promise<Servico> => {
    const response = await api.put<Servico>(`/servicos/${id}`, data);
    return response.data;
  },
};

export const osService = {
  getOrdensServico: async (params?: {
    status?: string;
    q?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<OrdemServico[]> => {
    const response = await api.get<OrdemServico[]>('/ordens-servico', { params });
    return response.data;
  },

  getOrdemServicoById: async (id: string): Promise<OrdemServico> => {
    const response = await api.get<OrdemServico>(`/ordens-servico/${id}`);
    return response.data;
  },

  createOrdemServico: async (osData: {
    clienteId: string;
    veiculoId: string;
    mecanicoId?: string;
    previsaoEntrega?: string;
    observacoes?: string;
    desconto?: number;
    acrescimo?: number;
    produtos?: Array<{ productId?: string; descricao: string; quantidade: number; precoUnitario: number; desconto?: number; acrescimo?: number; custoUnitario?: number }>;
    servicos?: Array<{ serviceId?: string; descricao: string; mecanicoId?: string; quantidade: number; precoUnitario: number; desconto?: number; acrescimo?: number }>;
  }): Promise<OrdemServico> => {
    const response = await api.post<OrdemServico>('/ordens-servico', osData);
    return response.data;
  },

  updateStatusOS: async (
    id: string,
    status?: StatusOS,
    formaPagamento?: string,
    desconto?: number,
    acrescimo?: number
  ): Promise<OrdemServico> => {
    const response = await api.patch<OrdemServico>(`/ordens-servico/${id}/status`, {
      status,
      formaPagamento,
      desconto,
      acrescimo,
    });
    return response.data;
  },

  addItemProduto: async (
    osId: string,
    data: {
      productId?: string;
      descricao: string;
      quantidade: number;
      precoUnitario: number;
      desconto?: number;
      acrescimo?: number;
    }
  ): Promise<OrdemServico> => {
    const response = await api.post<OrdemServico>(`/ordens-servico/${osId}/itens/produto`, data);
    return response.data;
  },

  addItemServico: async (
    osId: string,
    data: {
      serviceId?: string;
      descricao: string;
      mecanicoId?: string;
      quantidade: number;
      precoUnitario: number;
      desconto?: number;
      acrescimo?: number;
    }
  ): Promise<OrdemServico> => {
    const response = await api.post<OrdemServico>(`/ordens-servico/${osId}/itens/servico`, data);
    return response.data;
  },

  updateItem: async (
    osId: string,
    tipo: 'produto' | 'servico',
    itemId: string,
    data: {
      quantidade?: number;
      precoUnitario?: number;
      desconto?: number;
      acrescimo?: number;
      mecanicoId?: string;
    }
  ): Promise<OrdemServico> => {
    const response = await api.put<OrdemServico>(`/ordens-servico/${osId}/itens/${tipo}/${itemId}`, data);
    return response.data;
  },

  deleteItem: async (
    osId: string,
    tipo: 'produto' | 'servico',
    itemId: string
  ): Promise<OrdemServico> => {
    const response = await api.delete<OrdemServico>(`/ordens-servico/${osId}/itens/${tipo}/${itemId}`);
    return response.data;
  },

  downloadOSPDF: async (osId: string, numeroOs: number): Promise<void> => {
    const response = await api.get(`/ordens-servico/${osId}/pdf`, {
      responseType: 'blob',
    });
    const file = new Blob([response.data], { type: 'application/pdf' });
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL, '_blank');
  },

  getPatioKanban: async (params?: { q?: string; mecanicoId?: string }): Promise<Array<OrdemServico & { isAtrasada?: boolean }>> => {
    const response = await api.get('/ordens-servico/patio', { params });
    return response.data;
  },

  getOSStatusHistory: async (osId: string): Promise<any[]> => {
    const response = await api.get(`/ordens-servico/${osId}/historico`);
    return response.data;
  },

  converterOrcamentoEmOS: async (osId: string): Promise<OrdemServico> => {
    const response = await api.post<OrdemServico>(`/ordens-servico/${osId}/converter-os`);
    return response.data;
  },

  getOrcamentoPublico: async (token: string): Promise<any> => {
    const response = await api.get(`/orcamento/publico/${token}`);
    return response.data;
  },

  decidirOrcamentoPublico: async (
    token: string,
    decisoes: {
      decisoesProdutos?: Array<{ id: string; aprovado: boolean }>;
      decisoesServicos?: Array<{ id: string; aprovado: boolean }>;
      acaoFinal?: string;
    }
  ): Promise<any> => {
    const response = await api.post(`/orcamento/publico/${token}/aprovar`, decisoes);
    return response.data;
  },
};

export const estoqueService = {
  getMovimentacoes: async (params?: { produtoId?: string; tipo?: string; q?: string }) => {
    const response = await api.get('/estoque/movimentacoes', { params });
    return response.data;
  },

  createMovimentacaoManual: async (data: {
    produtoId: string;
    tipo: 'ENTRADA' | 'SAIDA' | 'AJUSTE';
    quantidade: number;
    observacao?: string;
  }) => {
    const response = await api.post('/estoque/movimentacoes', data);
    return response.data;
  },
};

export const fragaService = {
  buscarPecasOnline: async (params?: {
    q?: string;
    codigo?: string;
    marca?: string;
    modelo?: string;
    versao?: string;
    ano?: number;
    motorizacao?: string;
  }): Promise<{ configured: boolean; message?: string; data: any[] }> => {
    const response = await api.get('/fraga/buscar', { params });
    return response.data;
  },

  importarPecaParaCatalogoLocal: async (data: {
    fragaPecaId: string;
    precoVenda: number;
    precoCusto?: number;
    estoqueFisico?: number;
    estoqueMinimo?: number;
    localizacao?: string;
    codigoFraga?: string;
    codigoFabricante?: string;
    codigoOEM?: string;
    descricao: string;
    marca?: string;
    categoria?: string;
    unidade?: string;
  }) => {
    const response = await api.post('/fraga/importar', data);
    return response.data;
  },
};

export const fornecedorService = {
  getFornecedores: async (query?: string): Promise<Fornecedor[]> => {
    const response = await api.get<Fornecedor[]>('/fornecedores', { params: { q: query } });
    return response.data;
  },

  getFornecedorById: async (id: string): Promise<Fornecedor> => {
    const response = await api.get<Fornecedor>(`/fornecedores/${id}`);
    return response.data;
  },

  createFornecedor: async (data: Partial<Fornecedor>): Promise<Fornecedor> => {
    const response = await api.post<Fornecedor>('/fornecedores', data);
    return response.data;
  },

  updateFornecedor: async (id: string, data: Partial<Fornecedor>): Promise<Fornecedor> => {
    const response = await api.put<Fornecedor>(`/fornecedores/${id}`, data);
    return response.data;
  },
};

export const compraService = {
  getCompras: async (params?: { fornecedorId?: string; status?: string; q?: string }): Promise<Compra[]> => {
    const response = await api.get<Compra[]>('/compras', { params });
    return response.data;
  },

  getCompraById: async (id: string): Promise<Compra> => {
    const response = await api.get<Compra>(`/compras/${id}`);
    return response.data;
  },

  createCompra: async (data: {
    fornecedorId: string;
    numeroNotaFiscal?: string;
    serieNotaFiscal?: string;
    chaveAcessoNfe?: string;
    dataEmissao?: string;
    condicaoPagamento?: string;
    desconto?: number;
    acrescimo?: number;
    observacoes?: string;
    itens: Array<{
      produtoId: string;
      codigoFornecedor?: string;
      referencia?: string;
      quantidade: number;
      custoUnitario: number;
      desconto?: number;
      acrescimo?: number;
    }>;
  }): Promise<Compra> => {
    const response = await api.post<Compra>('/compras', data);
    return response.data;
  },

  confirmarCompra: async (id: string): Promise<Compra> => {
    const response = await api.post<Compra>(`/compras/${id}/confirmar`);
    return response.data;
  },

  cancelarCompra: async (id: string, motivo?: string): Promise<Compra> => {
    const response = await api.post<Compra>(`/compras/${id}/cancelar`, { motivo });
    return response.data;
  },
};
