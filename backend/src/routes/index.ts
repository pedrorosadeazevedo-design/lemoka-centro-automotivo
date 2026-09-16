import { Router } from 'express';
import { login, getMe } from '../controllers/authController';
import { getDashboardData } from '../controllers/dashboardController';
import {
  createAtendimento,
  getAtendimentos,
  getAtendimentoById,
  updateAtendimento,
  deleteAtendimento,
  downloadPDF
} from '../controllers/atendimentoController';
import {
  getMecanicos,
  createMecanico,
  updateMecanico,
  deleteMecanico
} from '../controllers/mecanicoController';
import {
  getDespesas,
  createDespesa,
  updateDespesa,
  deleteDespesa
} from '../controllers/despesaController';
import {
  getTrafegoSemanal,
  createOrUpdateTrafego,
  deleteTrafego
} from '../controllers/trafegoController';
import {
  subscribePush,
  getVapidPublicKey,
  triggerScheduledReminder
} from '../controllers/pushController';
import {
  getEmpresaConfig,
  updateEmpresaConfig
} from '../controllers/empresaController';
import {
  getClientes,
  getClienteById,
  createCliente,
  updateCliente
} from '../controllers/clienteController';
import {
  getVeiculos,
  getVeiculoById,
  createVeiculo,
  updateVeiculo
} from '../controllers/veiculoController';
import {
  getOrdensServico,
  getOrdemServicoById,
  createOrdemServico,
  updateStatusOrdemServico,
  addItemProdutoToOS,
  addItemServicoToOS,
  updateItemInOS,
  deleteItemFromOS,
  downloadOSPDF,
  getPatioKanban,
  getOSStatusHistory
} from '../controllers/osController';
import {
  getOrcamentoPublico,
  decidirOrcamentoPublico,
  converterOrcamentoEmOS
} from '../controllers/orcamentoController';
import {
  getProdutos,
  createProduto,
  updateProduto
} from '../controllers/produtoController';
import {
  getMovimentacoesEstoque,
  createMovimentacaoManual
} from '../controllers/estoqueController';
import {
  getFornecedores,
  getFornecedorById,
  createFornecedor,
  updateFornecedor
} from '../controllers/fornecedorController';
import {
  getCompras,
  getCompraById,
  createCompra,
  confirmarCompra,
  cancelarCompra
} from '../controllers/compraController';
import {
  buscarPecasFraga,
  importarPecaFraga
} from '../controllers/fragaController';
import {
  getServicos,
  createServico,
  updateServico
} from '../controllers/servicoController';
import {
  getPlanoContas,
  createPlanoContas,
  updatePlanoContas,
  getContasBancarias,
  createContaBancaria,
  updateContaBancaria,
  getSessaoCaixaAtual,
  abrirCaixa,
  fecharCaixa,
  suprimentoCaixa,
  retiradaCaixa,
  getHistoricoCaixa,
  getContasReceber,
  createContaReceber,
  receberTitulo,
  estornarRecebimento,
  getContasPagar,
  createContaPagar,
  pagarTitulo,
  estornarPagamento,
  transferirFundos,
  getDashboardFinanceiro,
  getFluxoCaixa,
} from '../controllers/financeiroController';
import {
  getConfiguracaoFiscal,
  updateConfiguracaoFiscal,
  getDocumentosFiscais,
  getDocumentoFiscalById,
  gerarRascunhoFiscal,
  validarDocumentoFiscal,
  emitirDocumentoFiscal,
  cancelarDocumentoFiscal,
  inutilizarNumeracao,
  downloadXML,
  renderDANFE,
} from '../controllers/fiscalController';
import {
  getCRMDashboard,
  getPerfilCRMCliente,
  getHistoricoVeiculo,
  getRetornos,
  concluirPrevisaoRetorno,
  getClientesInativos,
  getAniversariantes,
  getOrcamentosNaoAprovados,
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  getTags,
  createTag,
  associarTagCliente,
  removerTagCliente,
  addObservacaoCliente,
} from '../controllers/crmController';
import {
  getSalesReport,
  getServicesReport,
  getProductsReport,
  getPurchasesReport,
  getFinancialReport,
  getDREReport,
  getCustomersReport,
  getMechanicsReport,
  getExecutiveDashboardReport
} from '../controllers/reportsController';
import {
  getPeriodosFiscais,
  createPeriodoFiscal,
  processarPeriodoFiscal,
  gerarArquivoSped,
  fecharPeriodoFiscal
} from '../controllers/spedController';
import { executeMigrationDryRun, executeMigrationBatch, getMigrationBatches } from '../controllers/migrationController';
import {
  runMigrationAudit,
  getMigrationAuditRecords,
  updateAuditRecordStatus
} from '../controllers/auditController';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router = Router();

// Public Auth, Push & Digital Budget Routes
router.post('/auth/login', login);
router.get('/push/vapid-key', getVapidPublicKey);
router.get('/orcamento/publico/:token', getOrcamentoPublico);
router.post('/orcamento/publico/:token/aprovar', decidirOrcamentoPublico);

// Protected Routes (Authenticate required)
router.use(authenticate);

// Profile
router.get('/auth/me', getMe);

// Dashboard
router.get('/dashboard', getDashboardData);

// Empresa & Configurações Fiscais
router.get('/empresa', getEmpresaConfig);
router.put('/empresa', requireAdmin, updateEmpresaConfig);

router.get('/fiscal', getConfiguracaoFiscal);
router.put('/fiscal', requireAdmin, updateConfiguracaoFiscal);

// Clientes
router.get('/clientes', getClientes);
router.post('/clientes', createCliente);
router.get('/clientes/:id', getClienteById);
router.put('/clientes/:id', updateCliente);

// Veículos
router.get('/veiculos', getVeiculos);
router.post('/veiculos', createVeiculo);
router.get('/veiculos/:id', getVeiculoById);
router.put('/veiculos/:id', updateVeiculo);

// Catálogo de Produtos / Peças & Movimentações de Estoque
router.get('/produtos', getProdutos);
router.post('/produtos', createProduto);
router.put('/produtos/:id', updateProduto);

router.get('/estoque/movimentacoes', getMovimentacoesEstoque);
router.post('/estoque/movimentacoes', createMovimentacaoManual);

// Módulo de Fornecedores
router.get('/fornecedores', getFornecedores);
router.post('/fornecedores', createFornecedor);
router.get('/fornecedores/:id', getFornecedorById);
router.put('/fornecedores/:id', updateFornecedor);

// Módulo de Compras & Entrada de Mercadorias
router.get('/compras', getCompras);
router.post('/compras', createCompra);
router.get('/compras/:id', getCompraById);
router.post('/compras/:id/confirmar', confirmarCompra);
router.post('/compras/:id/cancelar', cancelarCompra);

// Integração com Catálogo de Peças Online Fraga
router.get('/fraga/buscar', buscarPecasFraga);
router.post('/fraga/importar', importarPecaFraga);

// Catálogo de Serviços
router.get('/servicos', getServicos);
router.post('/servicos', createServico);
router.put('/servicos/:id', updateServico);

// Ordens de Serviço (OS), Pátio Kanban & Gestão de Itens
router.get('/ordens-servico', getOrdensServico);
router.get('/ordens-servico/patio', getPatioKanban);
router.post('/ordens-servico', createOrdemServico);
router.get('/ordens-servico/:id', getOrdemServicoById);
router.get('/ordens-servico/:id/pdf', downloadOSPDF);
router.get('/ordens-servico/:id/historico', getOSStatusHistory);
router.patch('/ordens-servico/:id/status', updateStatusOrdemServico);
router.post('/ordens-servico/:id/converter-os', converterOrcamentoEmOS);
router.post('/ordens-servico/:id/itens/produto', addItemProdutoToOS);
router.post('/ordens-servico/:id/itens/servico', addItemServicoToOS);
router.put('/ordens-servico/:id/itens/:tipo/:itemId', updateItemInOS);
router.delete('/ordens-servico/:id/itens/:tipo/:itemId', deleteItemFromOS);

// Atendimentos (Legado / Compatibilidade)
router.get('/atendimentos', getAtendimentos);
router.post('/atendimentos', createAtendimento);
router.get('/atendimentos/:id', getAtendimentoById);
router.put('/atendimentos/:id', updateAtendimento);
router.delete('/atendimentos/:id', deleteAtendimento);
router.get('/atendimentos/:id/pdf', downloadPDF);

// Mecânicos
router.get('/mecanicos', getMecanicos);
router.post('/mecanicos', createMecanico);
router.put('/mecanicos/:id', updateMecanico);
router.delete('/mecanicos/:id', requireAdmin, deleteMecanico);

// Despesas Fixas
router.get('/despesas', getDespesas);
router.post('/despesas', createDespesa);
router.put('/despesas/:id', updateDespesa);
router.delete('/despesas/:id', requireAdmin, deleteDespesa);

// Tráfego Semanal (Anúncios)
router.get('/trafego', getTrafegoSemanal);
router.post('/trafego', createOrUpdateTrafego);
router.delete('/trafego/:id', requireAdmin, deleteTrafego);

// Push Notifications
router.post('/push/subscribe', subscribePush);
router.post('/push/send-scheduled', triggerScheduledReminder);

// ==========================================
// ETAPA 9 — FINANCEIRO COMPLETO
// ==========================================

// Plano de Contas
router.get('/financeiro/plano-contas', getPlanoContas);
router.post('/financeiro/plano-contas', createPlanoContas);
router.put('/financeiro/plano-contas/:id', updatePlanoContas);

// Contas Bancárias / Cofres
router.get('/financeiro/contas-bancarias', getContasBancarias);
router.post('/financeiro/contas-bancarias', createContaBancaria);
router.put('/financeiro/contas-bancarias/:id', updateContaBancaria);

// Operações de Caixa
router.get('/financeiro/caixa/atual', getSessaoCaixaAtual);
router.get('/financeiro/caixa/historico', getHistoricoCaixa);
router.post('/financeiro/caixa/abrir', abrirCaixa);
router.post('/financeiro/caixa/:id/fechar', fecharCaixa);
router.post('/financeiro/caixa/suprimento', suprimentoCaixa);
router.post('/financeiro/caixa/retirada', retiradaCaixa);

// Contas a Receber
router.get('/financeiro/contas-receber', getContasReceber);
router.post('/financeiro/contas-receber', createContaReceber);
router.post('/financeiro/contas-receber/:id/receber', receberTitulo);
router.post('/financeiro/contas-receber/:id/estornar', estornarRecebimento);

// Contas a Pagar
router.get('/financeiro/contas-pagar', getContasPagar);
router.post('/financeiro/contas-pagar', createContaPagar);
router.post('/financeiro/contas-pagar/:id/pagar', pagarTitulo);
router.post('/financeiro/contas-pagar/:id/estornar', estornarPagamento);

// Transferências
router.post('/financeiro/transferencias', transferirFundos);

// Dashboard Financeiro & Fluxo de Caixa
router.get('/financeiro/dashboard', getDashboardFinanceiro);
router.get('/financeiro/fluxo-caixa', getFluxoCaixa);

// ==========================================
// ETAPA 10 — MÓDULO FISCAL COMPLETO
// ==========================================
router.get('/fiscal/config', getConfiguracaoFiscal);
router.put('/fiscal/config', requireAdmin, updateConfiguracaoFiscal);

router.get('/fiscal/documentos', getDocumentosFiscais);
router.post('/fiscal/gerar-rascunho', gerarRascunhoFiscal);
router.get('/fiscal/documentos/:id', getDocumentoFiscalById);
router.post('/fiscal/documentos/:id/validar', validarDocumentoFiscal);
router.post('/fiscal/documentos/:id/emitir', emitirDocumentoFiscal);
router.post('/fiscal/documentos/:id/cancelar', cancelarDocumentoFiscal);
router.post('/fiscal/inutilizar', inutilizarNumeracao);
router.get('/fiscal/documentos/:id/xml', downloadXML);
router.get('/fiscal/documentos/:id/danfe', renderDANFE);

// ==========================================
// ETAPA 11 — CRM, FIDELIZAÇÃO E RETORNO DE CLIENTES
// ==========================================
router.get('/crm/dashboard', getCRMDashboard);
router.get('/crm/cliente/:id', getPerfilCRMCliente);
router.get('/crm/veiculo/:id', getHistoricoVeiculo);
router.get('/crm/retornos', getRetornos);
router.post('/crm/retornos/:id/concluir', concluirPrevisaoRetorno);
router.get('/crm/inativos', getClientesInativos);
router.get('/crm/aniversariantes', getAniversariantes);
router.get('/crm/orcamentos-pendentes', getOrcamentosNaoAprovados);

router.get('/crm/followups', getFollowUps);
router.post('/crm/followups', createFollowUp);
router.put('/crm/followups/:id', updateFollowUp);

router.get('/crm/tags', getTags);
router.post('/crm/tags', createTag);
router.post('/crm/tags/associar', associarTagCliente);
router.post('/crm/tags/remover', removerTagCliente);
router.post('/crm/observacoes', addObservacaoCliente);

// ==========================================
// ETAPA 12 — RELATÓRIOS GERENCIAIS AVANÇADOS + DRE
// ==========================================
router.get('/reports/sales', getSalesReport);
router.get('/reports/services', getServicesReport);
router.get('/reports/products', getProductsReport);
router.get('/reports/purchases', getPurchasesReport);
router.get('/reports/financial', requireAdmin, getFinancialReport);
router.get('/reports/dre', requireAdmin, getDREReport);
router.get('/reports/customers', getCustomersReport);
router.get('/reports/mechanics', getMechanicsReport);
router.get('/reports/executive', requireAdmin, getExecutiveDashboardReport);

// ==========================================
// ETAPA 13 — SPED FISCAL / PREPARAÇÃO E EXPORTAÇÃO
// ==========================================
router.get('/sped/periodos', requireAdmin, getPeriodosFiscais);
router.post('/sped/periodos', requireAdmin, createPeriodoFiscal);
router.post('/sped/periodos/:id/processar', requireAdmin, processarPeriodoFiscal);
router.post('/sped/periodos/:id/gerar-arquivo', requireAdmin, gerarArquivoSped);
router.post('/sped/periodos/:id/fechar', requireAdmin, fecharPeriodoFiscal);

// ==========================================
// ETAPA 15 e 16 — PREPARAÇÃO E EXECUÇÃO CONTROLADA DE MIGRAÇÃO OSDIG
// ==========================================
router.post('/migration/dry-run', requireAdmin, executeMigrationDryRun);
router.post('/migration/execute-batch', requireAdmin, executeMigrationBatch);
router.get('/migration/batches', requireAdmin, getMigrationBatches);

// ==========================================
// ETAPA 18 — VALIDAÇÃO PÓS-MIGRAÇÃO, CONCILIAÇÃO E INTEGRIDADE OPERACIONAL
// ==========================================
router.post('/migration/audit/run', requireAdmin, runMigrationAudit);
router.get('/migration/audit/records', requireAdmin, getMigrationAuditRecords);
router.patch('/migration/audit/records/:id/status', requireAdmin, updateAuditRecordStatus);

export default router;
