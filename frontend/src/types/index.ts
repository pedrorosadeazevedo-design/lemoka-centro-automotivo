export type Role = 'OPERACIONAL' | 'ADMIN';

export interface Usuario {
  id: string;
  email: string;
  papel: Role;
}

export interface Mecanico {
  id: string;
  nome: string;
  especialidade: string;
  totalComissoes?: number;
  totalFaturamento?: number;
  totalAtendimentos?: number;
}

export interface DespesaFixa {
  id: string;
  nome: string;
  categoria: string;
  valor: number;
  dataCadastro?: string;
}

export type FormaPagamento = 'PIX' | 'CREDITO' | 'DEBITO' | 'DINHEIRO';

export interface Atendimento {
  id: string;
  data: string;
  nomeCliente: string;
  telefoneCliente?: string;
  veiculo?: string;
  mecanicoId: string;
  mecanico?: Mecanico;
  descricaoServico: string;
  valorPecas: number;
  valorServico: number;
  valorTotal: number;
  percentualComissao: number;
  valorComissao: number;
  formaPagamento: FormaPagamento;

  // FASE 3: Dados Opcionais Tomador / Cliente
  clienteDocumento?: string;
  clienteEmail?: string;
  clienteCep?: string;
  clienteEndereco?: string;
  clienteNumero?: string;
  clienteComplemento?: string;
  clienteBairro?: string;
  clienteCidade?: string;
  clienteUf?: string;

  // FASE 4/5: Status Fiscal e Dados NFS-e
  statusFiscal?: string;
  numeroNfse?: string;
  chaveNfse?: string;
  dataEmissaoNfse?: string;
  protocoloNfse?: string;
  codigoServico?: string;
  codigoTributacao?: string;
  valorTributavel?: number;
  impostosRetidos?: number;
  xmlNfse?: string;
  pdfNfseUrl?: string;
  mensagemErroFiscal?: string;
  respostaApiFiscal?: string;
}

export interface EmpresaConfig {
  id?: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoMunicipal?: string;
  inscricaoEstadual?: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  logoUrl?: string;
  regimeTributario?: string;
  informacoesFiscaisAdicionais?: string;
}

export interface ConfiguracaoFiscal {
  id?: string;
  inscricaoMunicipal?: string;
  inscricaoEstadual?: string;
  regimeTributario?: string;
  enquadramentoTributario?: string;
  codigoServicoMunicipal?: string;
  codigoTributacao?: string;
  codigoTributacaoNacional?: string;
  descricaoPadraoServico?: string;
  aliquota?: number;
  retencoes?: string;
  ambiente?: string;
  statusIntegracao?: string;
}

export interface TrafegoSemanal {
  id: string;
  semanaReferencia: string;
  semanaInicio: string;
  semanaFim: string;
  mensagensRecebidas: number;
  valorInvestido: number;
  carrosAtendidos: number;
  faturamentoSemana: number;
  custoPorMensagem: number;
  custoPorCarro: number;
  roi: number;
}

export interface DashboardData {
  periodo: 'dia' | 'semana' | 'mes';
  datas: { inicio: string; fim: string };
  kpis: {
    faturamentoBruto: number;
    custoPecasTotais?: number;
    valorMaoDeObraTotal?: number;
    comissoesTotais: number;
    despesasTotais: number;
    lucroLiquido: number;
    carrosAtendidos: number;
    ticketMedio: number;
    margemLucroPercent: number;
  };
  indicadoresFiscais?: {
    nfseEmitidas: number;
    nfsePendentes: number;
    nfseErro: number;
    totalAtendimentos: number;
  };
  alertaMargem: {
    tipo: 'critico' | 'atencao' | 'sucesso' | 'info';
    mensagem: string;
  };
  graficoEvolucao: Array<{
    data: string;
    faturamento: number;
    carros: number;
  }>;
  graficoFormasPagamento: Array<{
    forma: string;
    valor: number;
  }>;
}

// ETAPA 1: NOVAS INTERFACES DE CLIENTE, VEÍCULO E ORDEM DE SERVIÇO (OS)

export interface Cliente {
  id: string;
  nome: string;
  tipoDocumento: 'CPF' | 'CNPJ';
  documento?: string;
  telefone?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  observacoes?: string;
  createdAt?: string;
  updatedAt?: string;
  veiculos?: Vehicle[];
}

export interface Vehicle {
  id: string;
  clienteId: string;
  cliente?: Cliente;
  placa: string;
  marca: string;
  modelo: string;
  versao?: string;
  anoFabricacao?: number;
  anoModelo?: number;
  motorizacao?: string;
  combustivel?: string;
  chassi?: string;
  renavam?: string;
  cor?: string;
  quilometragemAtual?: number;
  proximaRevisaoKm?: number;
  proximaRevisaoData?: string;
  observacoesTecnicas?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type StatusOS =
  | 'OPEN'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'IN_MAINTENANCE'
  | 'AWAITING_PARTS'
  | 'COMPLETED'
  | 'BILLED'
  | 'CANCELLED';

export interface Produto {
  id: string;
  codigoInterno?: string;
  ean?: string;
  referenciaFabricante?: string;
  codigoOEM?: string;
  descricao: string;
  descricaoTecnica?: string;
  marca?: string;
  categoria?: string;
  unidade: string;
  precoCusto: number;
  precoVenda: number;
  precoPromocional?: number;
  estoqueFisico: number;
  estoqueReservado: number;
  estoqueMinimo: number;
  estoqueMaximo?: number;
  localizacao?: string;
  status: boolean;
}

export type TipoMovimentacao =
  | 'ENTRADA'
  | 'SAIDA'
  | 'RESERVA'
  | 'LIBERACAO_RESERVA'
  | 'AJUSTE'
  | 'ESTORNO';

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  produto?: Produto;
  tipo: TipoMovimentacao;
  quantidade: number;
  estoqueAnterior: number;
  estoquePosterior: number;
  usuarioId?: string;
  origem: string;
  ordemServicoId?: string;
  observacao?: string;
  createdAt: string;
}

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
    motorizacao?: string;
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

export interface Fornecedor {
  id: string;
  tipoPessoa: 'PF' | 'PJ';
  documento?: string;
  razaoSocial: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  telefone?: string;
  celular?: string;
  whatsapp?: string;
  email?: string;
  contato?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  observacoes?: string;
  status: boolean;
  totalComprado?: number;
  totalComprasRealizadas?: number;
  ultimaCompra?: string;
  createdAt?: string;
}

export type StatusCompra = 'RASCUNHO' | 'CONFIRMADA' | 'CANCELADA';

export interface ItemCompra {
  id?: string;
  compraId?: string;
  produtoId: string;
  produto?: Produto;
  codigoFornecedor?: string;
  referencia?: string;
  quantidade: number;
  unidade?: string;
  custoUnitario: number;
  desconto?: number;
  acrescimo?: number;
  subtotal: number;
}

export interface Compra {
  id: string;
  numeroCompra: number;
  fornecedorId: string;
  fornecedor: Fornecedor;
  numeroNotaFiscal?: string;
  serieNotaFiscal?: string;
  chaveAcessoNfe?: string;
  dataEmissao?: string;
  dataEntrada: string;
  status: StatusCompra;
  condicaoPagamento?: string;
  subtotal: number;
  desconto: number;
  acrescimo: number;
  valorTotal: number;
  observacoes?: string;
  usuarioId?: string;
  itens?: ItemCompra[];
  createdAt?: string;
}

export interface Servico {
  id: string;
  codigo?: string;
  descricao: string;
  precoPadrao: number;
  tempoEstimadoMinutos?: number;
  categoria?: string;
  garantiaDias?: number;
  status: boolean;
}

export interface OSItemProduct {
  id?: string;
  ordemServicoId?: string;
  productId?: string;
  produto?: Produto;
  codigoInterno?: string;
  descricao: string;
  marca?: string;
  unidade?: string;
  quantidade: number;
  precoUnitario: number;
  custoUnitario?: number;
  custoTotal?: number;
  desconto?: number;
  acrescimo?: number;
  margemBruta?: number;
  subtotal: number;
  aprovado?: boolean;
}

export interface OSItemService {
  id?: string;
  ordemServicoId?: string;
  serviceId?: string;
  servico?: Servico;
  descricao: string;
  mecanicoId?: string;
  mecanico?: Mecanico;
  quantidade: number;
  precoUnitario: number;
  custoMaoDeObra?: number;
  desconto?: number;
  acrescimo?: number;
  garantiaDias?: number;
  subtotal: number;
  aprovado?: boolean;
}

export interface OrdemServico {
  id: string;
  numeroOs: number;
  publicToken?: string;
  clienteId: string;
  cliente: Cliente;
  veiculoId: string;
  veiculo: Vehicle;
  atendenteId: string;
  atendente?: { id: string; email: string };
  mecanicoId?: string;
  mecanico?: Mecanico;
  status: StatusOS;
  dataAbertura: string;
  previsaoEntrega?: string;
  dataFechamento?: string;
  observacoes?: string;
  subtotal: number;
  desconto: number;
  acrescimo: number;
  valorTotal: number;
  formaPagamento?: string;
  produtos?: OSItemProduct[];
  servicos?: OSItemService[];
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// ETAPA 9 — TYPES FINANCEIROS
// ==========================================

export type StatusTitulo = 'ABERTO' | 'PARCIAL' | 'VENCIDO' | 'LIQUIDADO' | 'CANCELADO';
export type TipoMovimentacaoFinanceira = 'ENTRADA' | 'SAIDA' | 'SUPRIMENTO' | 'RETIRADA' | 'TRANSFERENCIA';

export interface PlanoContas {
  id: string;
  codigo?: string;
  descricao: string;
  tipo: 'RECEITA' | 'DESPESA';
  categoriaPaiId?: string;
  status: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContaBancaria {
  id: string;
  nome: string;
  banco?: string;
  agencia?: string;
  conta?: string;
  tipo: string; // CORRENTE | POUPANCA | CARTEIRA_DIGITAL | CAIXA_FISICO
  saldoInicial: number;
  saldoAtual: number;
  status: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SessaoCaixa {
  id: string;
  usuarioId: string;
  dataAbertura: string;
  dataFechamento?: string;
  saldoInicial: number;
  saldoCalculado: number;
  saldoInformado?: number;
  diferenca?: number;
  status: 'ABERTO' | 'FECHADO';
  observacoes?: string;
  movimentacoes?: MovimentacaoFinanceira[];
  totais?: {
    entradas: number;
    saidas: number;
    saldoInicial: number;
    saldoCalculado: number;
  };
}

export interface ContaReceber {
  id: string;
  numeroTitulo: number;
  titulo: string;
  origem: string;
  ordemServicoId?: string;
  ordemServico?: OrdemServico;
  clienteId?: string;
  cliente?: Cliente;
  planoContasId?: string;
  planoContas?: PlanoContas;
  parcelaAtual: number;
  totalParcelas: number;
  dataEmissao: string;
  dataVencimento: string;
  valorBruto: number;
  desconto: number;
  acrescimo: number;
  jurosMulta: number;
  valorLiquido: number;
  valorPago: number;
  valorEmAberto: number;
  status: StatusTitulo;
  statusCalculado?: StatusTitulo;
  formaPagamento?: string;
  dataBaixa?: string;
  observacoes?: string;
  movimentacoes?: MovimentacaoFinanceira[];
  createdAt?: string;
}

export interface ContaPagar {
  id: string;
  numeroTitulo: number;
  titulo: string;
  origem: string;
  compraId?: string;
  compra?: any;
  fornecedorId?: string;
  fornecedor?: Fornecedor;
  planoContasId?: string;
  planoContas?: PlanoContas;
  parcelaAtual: number;
  totalParcelas: number;
  dataEmissao: string;
  dataVencimento: string;
  valorBruto: number;
  desconto: number;
  acrescimo: number;
  jurosMulta: number;
  valorLiquido: number;
  valorPago: number;
  valorEmAberto: number;
  status: StatusTitulo;
  statusCalculado?: StatusTitulo;
  formaPagamento?: string;
  dataBaixa?: string;
  observacoes?: string;
  movimentacoes?: MovimentacaoFinanceira[];
  createdAt?: string;
}

export interface MovimentacaoFinanceira {
  id: string;
  tipo: TipoMovimentacaoFinanceira;
  descricao: string;
  valor: number;
  dataMovimentacao: string;
  formaPagamento: string;
  origem: string;
  contaReceberId?: string;
  contaPagarId?: string;
  contaBancariaId?: string;
  contaBancaria?: ContaBancaria;
  sessaoCaixaId?: string;
  planoContasId?: string;
  planoContas?: PlanoContas;
  isEstorno?: boolean;
  estornado?: boolean;
  motivoEstorno?: string;
  dataEstorno?: string;
  observacao?: string;
  usuarioId?: string;
  createdAt?: string;
}

export interface DashboardFinanceiroData {
  saldoCaixaTotal: number;
  saldoBancosTotal: number;
  saldoDisponivelTotal: number;
  totalAReceber: number;
  vencidoAReceber: number;
  totalAPagar: number;
  vencidoAPagar: number;
  entradasPeriodo: number;
  saidasPeriodo: number;
  resultadoPeriodo: number;
}

// ==========================================
// ETAPA 10 — TYPES FISCAIS
// ==========================================

export type TipoDocumentoFiscal = 'NFE' | 'NFCE' | 'NFSE';
export type StatusDocumentoFiscal =
  | 'RASCUNHO'
  | 'PENDENTE'
  | 'PROCESSANDO'
  | 'AUTORIZADA'
  | 'REJEITADA'
  | 'CANCELADA'
  | 'DENEGADA'
  | 'INUTILIZADA'
  | 'ERRO';

export interface HistoricoFiscal {
  id: string;
  documentoFiscalId: string;
  statusAnterior?: StatusDocumentoFiscal;
  statusNovo: StatusDocumentoFiscal;
  mensagem?: string;
  protocolo?: string;
  usuarioId?: string;
  createdAt: string;
}

export interface DocumentoFiscal {
  id: string;
  tipo: TipoDocumentoFiscal;
  numero?: number;
  serie: string;
  chave?: string;
  protocolo?: string;
  status: StatusDocumentoFiscal;
  ambiente: string;
  dataEmissao: string;
  dataAutorizacao?: string;
  dataCancelamento?: string;
  valorTotal: number;
  valorProdutos: number;
  valorServicos: number;
  valorImpostos: number;
  xmlEnviado?: string;
  xmlAutorizado?: string;
  motivo?: string;
  mensagemFiscal?: string;
  protocoloCancelamento?: string;
  ordemServicoId?: string;
  ordemServico?: OrdemServico;
  clienteId?: string;
  cliente?: Cliente;
  usuarioId?: string;
  createdAt?: string;
  updatedAt?: string;
  historico?: HistoricoFiscal[];
}

export interface ValidacaoFiscalResult {
  valido: boolean;
  erros: string[];
  alertas: string[];
}

// ==========================================
// ETAPA 11 — TYPES CRM E FIDELIZAÇÃO
// ==========================================

export interface Tag {
  id: string;
  nome: string;
  cor: string;
  descricao?: string;
  createdAt?: string;
}

export interface ClienteTag {
  id: string;
  clienteId: string;
  tagId: string;
  tag?: Tag;
  createdAt?: string;
}

export interface ObservacaoCliente {
  id: string;
  clienteId: string;
  usuarioId?: string;
  usuario?: { id: string; email: string };
  conteudo: string;
  createdAt: string;
}

export interface PrevisaoRetorno {
  id: string;
  clienteId: string;
  cliente?: Cliente;
  veiculoId: string;
  veiculo?: Vehicle;
  servicoId?: string;
  servico?: Servico;
  ordemServicoId?: string;
  ordemServico?: OrdemServico;
  dataBase: string;
  kmBase?: number;
  dataPrevista?: string;
  kmPrevisto?: number;
  motivo: string;
  status: string; // PREVISTO | PROXIMO | DEVIDO | ATRASADO | CONCLUIDO | IGNORADO
  statusCalculado?: string;
  concluidoEm?: string;
  observacoes?: string;
  usuarioId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TarefaFollowUp {
  id: string;
  clienteId: string;
  cliente?: Cliente;
  veiculoId?: string;
  veiculo?: Vehicle;
  ordemServicoId?: string;
  ordemServico?: OrdemServico;
  titulo: string;
  descricao?: string;
  dataAgendada: string;
  responsavelId?: string;
  responsavel?: { id: string; email: string };
  status: string; // PENDENTE | EM_ANDAMENTO | CONCLUIDO | CANCELADO
  origem: string;
  concluidoEm?: string;
  observacaoConclusao?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CRMDashboardData {
  totalClientes: number;
  clientesNovos: number;
  clientesRecorrentes: number;
  clientesInativos: number;
  retornosHoje: number;
  retornosProximos: number;
  retornosAtrasados: number;
  revisoesDevidas: number;
  aniversariantesHoje: number;
  aniversariantesProximos: number;
  orcamentosNaoAprovados: number;
  followUpsPendentes: number;
}




