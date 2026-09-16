import axios, { AxiosInstance } from 'axios';

export interface FragaPeca {
  id: string;
  codigoFraga?: string;
  codigoFabricante?: string;
  referenciaFabricante?: string;
  codigoOEM?: string;
  descricao: string;
  descricaoTecnica?: string;
  marca?: string;
  categoria?: string;
  unidade?: string;
  aplicacoes?: Array<{
    marca: string;
    modelo: string;
    versao?: string;
    anoInicio?: number;
    anoFim?: number;
    motorização?: string;
  }>;
  equivalencias?: Array<{
    marca: string;
    codigo: string;
    descricao?: string;
  }>;
  imagemUrl?: string;
  especificacoesTecnicas?: Record<string, any>;
}

export interface FragaSearchFilters {
  q?: string;
  codigo?: string;
  marcaVeiculo?: string;
  modeloVeiculo?: string;
  versaoVeiculo?: string;
  anoVeiculo?: number;
  motorizacaoVeiculo?: string;
}

export interface FragaProviderResult {
  configured: boolean;
  message?: string;
  data: FragaPeca[];
}

export class FragaProvider {
  private apiUrl: string | undefined;
  private clientId: string | undefined;
  private clientSecret: string | undefined;
  private apiToken: string | undefined;
  private client: AxiosInstance | null = null;

  constructor() {
    this.apiUrl = process.env.FRAGA_API_URL;
    this.clientId = process.env.FRAGA_CLIENT_ID;
    this.clientSecret = process.env.FRAGA_CLIENT_SECRET;
    this.apiToken = process.env.FRAGA_API_TOKEN;

    if (this.isConfigured() && this.apiUrl) {
      this.client = axios.create({
        baseURL: this.apiUrl,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiToken ? { Authorization: `Bearer ${this.apiToken}` } : {}),
        },
      });
    }
  }

  public isConfigured(): boolean {
    // A integração Fraga é considerada configurada se a URL e os tokens/chaves de API reais existirem no ambiente .env
    return Boolean(this.apiUrl && (this.apiToken || (this.clientId && this.clientSecret)));
  }

  public async searchPecas(filters: FragaSearchFilters): Promise<FragaProviderResult> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        message: 'Integração Fraga não configurada. Defina as variáveis de ambiente FRAGA_API_URL e FRAGA_API_TOKEN no backend para habilitar a consulta online.',
        data: [],
      };
    }

    try {
      // Exemplo de requisição real para o backend oficial do Fraga
      const response = await this.client!.get('/pecas/buscar', {
        params: {
          q: filters.q,
          codigo: filters.codigo,
          marca: filters.marcaVeiculo,
          modelo: filters.modeloVeiculo,
          versao: filters.versaoVeiculo,
          ano: filters.anoVeiculo,
          motorizacao: filters.motorizacaoVeiculo,
        },
      });

      const items: FragaPeca[] = (response.data?.items || response.data || []).map((item: any) => ({
        id: item.id || item.codigoFraga || String(Math.random()),
        codigoFraga: item.codigoFraga || item.id,
        codigoFabricante: item.codigoFabricante || item.referencia,
        referenciaFabricante: item.referenciaFabricante || item.referencia,
        codigoOEM: item.codigoOEM || item.oem,
        descricao: item.descricao || item.nome,
        descricaoTecnica: item.descricaoTecnica,
        marca: item.marca || item.fabricante,
        categoria: item.categoria || item.grupo,
        unidade: item.unidade || 'UN',
        aplicacoes: item.aplicacoes || [],
        equivalencias: item.equivalencias || [],
        imagemUrl: item.imagemUrl || item.foto,
        especificacoesTecnicas: item.especificacoesTecnicas,
      }));

      return {
        configured: true,
        data: items,
      };
    } catch (error: any) {
      console.error('Erro na requisição para a API Fraga:', error.message);
      return {
        configured: true,
        message: `Falha ao consultar API Fraga: ${error.response?.data?.message || error.message || 'Serviço temporariamente indisponível'}`,
        data: [],
      };
    }
  }

  public async getPecaById(id: string): Promise<FragaPeca | null> {
    if (!this.isConfigured()) return null;

    try {
      const response = await this.client!.get(`/pecas/${id}`);
      const item = response.data;
      if (!item) return null;

      return {
        id: item.id || item.codigoFraga,
        codigoFraga: item.codigoFraga || item.id,
        codigoFabricante: item.codigoFabricante,
        referenciaFabricante: item.referenciaFabricante,
        codigoOEM: item.codigoOEM,
        descricao: item.descricao,
        descricaoTecnica: item.descricaoTecnica,
        marca: item.marca,
        categoria: item.categoria,
        unidade: item.unidade || 'UN',
        aplicacoes: item.aplicacoes || [],
        equivalencias: item.equivalencias || [],
        imagemUrl: item.imagemUrl,
        especificacoesTecnicas: item.especificacoesTecnicas,
      };
    } catch (error: any) {
      console.error(`Erro ao buscar peça Fraga por ID (${id}):`, error.message);
      return null;
    }
  }
}
