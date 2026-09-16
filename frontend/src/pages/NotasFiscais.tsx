import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Search,
  Filter,
  Plus,
  Printer,
  Download,
  Eye,
  Settings,
  Ban,
  Building,
  RefreshCw,
  Info,
} from 'lucide-react';
import { fiscalService } from '../services/fiscalService';
import { osService } from '../services/osService';
import {
  DocumentoFiscal,
  TipoDocumentoFiscal,
  StatusDocumentoFiscal,
  ValidacaoFiscalResult,
  EmpresaConfig,
  ConfiguracaoFiscal,
  OrdemServico,
} from '../types';

export const NotasFiscais: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'todas' | 'nfe' | 'nfce' | 'nfse' | 'configuracao'>('todas');
  const [loading, setLoading] = useState(true);

  const [documentos, setDocumentos] = useState<DocumentoFiscal[]>([]);
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig | null>(null);
  const [fiscalConfig, setFiscalConfig] = useState<ConfiguracaoFiscal | null>(null);
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([]);

  // Filter States
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal States
  const [modalNovaNota, setModalNovaNota] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState<DocumentoFiscal | null>(null);
  const [modalValidacao, setModalValidacao] = useState<{ doc: DocumentoFiscal; result: ValidacaoFiscalResult } | null>(null);
  const [modalCancelar, setModalCancelar] = useState<DocumentoFiscal | null>(null);
  const [modalInutilizar, setModalInutilizar] = useState(false);

  // Form States
  const [formNovaNota, setFormNovaNota] = useState({
    ordemServicoId: '',
    tipo: 'NFSE' as TipoDocumentoFiscal,
  });

  const [motivoCancelamentoText, setMotivoCancelamentoText] = useState('');

  const [formInutilizar, setFormInutilizar] = useState({
    tipo: 'NFE',
    serie: '1',
    numeroInicial: '',
    numeroFinal: '',
    justificativa: '',
  });

  const [formConfig, setFormConfig] = useState({
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    inscricaoMunicipal: '',
    inscricaoEstadual: '',
    regimeTributario: 'Simples Nacional',
    crt: '1',
    codigoIbge: '3304557',
    provedorFiscal: 'Padrão Nacional',
    ambiente: 'HOMOLOGACAO',
    serieNfe: '1',
    serieNfce: '1',
    serieNfse: '1',
    certificadoDigitalConfigurado: false,
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const tipoFilter = activeTab === 'nfe' ? 'NFE' : activeTab === 'nfce' ? 'NFCE' : activeTab === 'nfse' ? 'NFSE' : 'ALL';
      const [docs, confData, osList] = await Promise.all([
        fiscalService.getDocumentos({ tipo: tipoFilter, status: filterStatus }),
        fiscalService.getConfig(),
        osService.getOrdensServico(),
      ]);

      setDocumentos(docs);
      setEmpresaConfig(confData.empresa);
      setFiscalConfig(confData.config);
      setOrdensServico(osList);

      if (confData.empresa && confData.config) {
        setFormConfig({
          razaoSocial: confData.empresa.razaoSocial || '',
          nomeFantasia: confData.empresa.nomeFantasia || '',
          cnpj: confData.empresa.cnpj || '',
          inscricaoMunicipal: confData.empresa.inscricaoMunicipal || '',
          inscricaoEstadual: confData.empresa.inscricaoEstadual || '',
          regimeTributario: confData.empresa.regimeTributario || 'Simples Nacional',
          crt: confData.empresa.crt || '1',
          codigoIbge: confData.empresa.codigoIbge || '3304557',
          provedorFiscal: confData.config.provedorFiscal || 'Padrão Nacional',
          ambiente: confData.config.ambiente || 'HOMOLOGACAO',
          serieNfe: confData.config.serieNfe || '1',
          serieNfce: confData.config.serieNfce || '1',
          serieNfse: confData.config.serieNfse || '1',
          certificadoDigitalConfigurado: Boolean(confData.config.certificadoDigitalConfigurado),
        });
      }
    } catch (err) {
      console.error('Erro ao carregar módulo fiscal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [activeTab, filterStatus]);

  const handleGerarRascunho = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const doc = await fiscalService.gerarRascunho(formNovaNota.ordemServicoId, formNovaNota.tipo);
      setModalNovaNota(false);
      setFormNovaNota({ ordemServicoId: '', tipo: 'NFSE' });
      carregarDados();
      // Validar imediatamente
      const val = await fiscalService.validarDocumento(doc.id);
      setModalValidacao({ doc, result: val });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao gerar documento fiscal');
    }
  };

  const handleValidar = async (doc: DocumentoFiscal) => {
    try {
      const val = await fiscalService.validarDocumento(doc.id);
      setModalValidacao({ doc, result: val });
    } catch (err: any) {
      alert('Erro ao validar documento fiscal');
    }
  };

  const handleEmitir = async (docId: string) => {
    try {
      const res = await fiscalService.emitirDocumento(docId);
      alert(res.mensagem);
      setModalValidacao(null);
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao emitir documento fiscal');
    }
  };

  const handleCancelar = async () => {
    if (!modalCancelar || !motivoCancelamentoText) return;
    try {
      await fiscalService.cancelarDocumento(modalCancelar.id, motivoCancelamentoText);
      setModalCancelar(null);
      setMotivoCancelamentoText('');
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao cancelar nota fiscal');
    }
  };

  const handleInutilizar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fiscalService.inutilizarNumeracao({
        tipo: formInutilizar.tipo,
        serie: formInutilizar.serie,
        numeroInicial: Number(formInutilizar.numeroInicial),
        numeroFinal: Number(formInutilizar.numeroFinal),
        justificativa: formInutilizar.justificativa,
      });
      setModalInutilizar(false);
      setFormInutilizar({ tipo: 'NFE', serie: '1', numeroInicial: '', numeroFinal: '', justificativa: '' });
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao inutilizar faixa numérica');
    }
  };

  const handleSalvarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fiscalService.updateConfig(formConfig);
      alert('Configurações fiscais atualizadas com sucesso!');
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao salvar configurações fiscais');
    }
  };

  const formatCurrency = (val: number | undefined) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const getStatusBadge = (status: StatusDocumentoFiscal) => {
    switch (status) {
      case 'AUTORIZADA':
        return <span className="status-badge status-completed"><CheckCircle size={12} /> Autorizada</span>;
      case 'RASCUNHO':
        return <span className="status-badge status-open"><Clock size={12} /> Rascunho</span>;
      case 'PROCESSANDO':
        return <span className="status-badge status-warning"><RefreshCw size={12} /> Processando</span>;
      case 'REJEITADA':
      case 'ERRO':
        return <span className="status-badge status-danger"><AlertTriangle size={12} /> {status}</span>;
      case 'CANCELADA':
      case 'INUTILIZADA':
        return <span className="status-badge status-cancelled"><XCircle size={12} /> {status}</span>;
      default:
        return <span className="status-badge status-open">{status}</span>;
    }
  };

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Módulo Fiscal Completo
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Gestão de NF-e, NFC-e, NFS-e, DANFE, DANFSE, XML e Histórico de Transmissões
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setModalInutilizar(true)}>
            <Ban size={16} /> Inutilizar Faixa
          </button>
          <button className="btn btn-primary" onClick={() => setModalNovaNota(true)}>
            <Plus size={16} /> Gerar Nota Fiscal da OS
          </button>
        </div>
      </div>

      {/* Banner de Aviso: Provedor / Certificado Pendente */}
      {fiscalConfig && !fiscalConfig.certificadoDigitalConfigurado && (
        <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <ShieldAlert size={28} color="#d48806" />
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, color: '#873800', fontWeight: 700 }}>Emissão Fiscal Pendente de Configuração do Provedor / Certificado Digital Real</h4>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#612500' }}>
              A arquitetura completa do sistema fiscal está pronta. Para autorização oficial na SEFAZ / Prefeitura, instale o Certificado Digital A1/A3 e configure o provedor em Configurações.
            </p>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={() => setActiveTab('configuracao')}>
            <Settings size={14} /> Configurar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="kanban-tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab-btn ${activeTab === 'todas' ? 'active' : ''}`}
          onClick={() => setActiveTab('todas')}
        >
          <FileText size={16} /> Todos os Documentos
        </button>
        <button
          className={`tab-btn ${activeTab === 'nfe' ? 'active' : ''}`}
          onClick={() => setActiveTab('nfe')}
        >
          <Building size={16} /> NF-e (Produtos)
        </button>
        <button
          className={`tab-btn ${activeTab === 'nfce' ? 'active' : ''}`}
          onClick={() => setActiveTab('nfce')}
        >
          <Printer size={16} /> NFC-e (Balcão)
        </button>
        <button
          className={`tab-btn ${activeTab === 'nfse' ? 'active' : ''}`}
          onClick={() => setActiveTab('nfse')}
        >
          <FileText size={16} /> NFS-e (Serviços)
        </button>
        <button
          className={`tab-btn ${activeTab === 'configuracao' ? 'active' : ''}`}
          onClick={() => setActiveTab('configuracao')}
        >
          <Settings size={16} /> Configuração Fiscal
        </button>
      </div>

      {/* LISTAGEM DE NOTAS (TABS: TODAS, NFE, NFCE, NFSE) */}
      {activeTab !== 'configuracao' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar por cliente, chave ou número..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Filter size={16} color="var(--text-secondary)" />
              <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="ALL">Todos os Status</option>
                <option value="RASCUNHO">Rascunho</option>
                <option value="PROCESSANDO">Processando</option>
                <option value="AUTORIZADA">Autorizada</option>
                <option value="REJEITADA">Rejeitada</option>
                <option value="CANCELADA">Cancelada</option>
                <option value="INUTILIZADA">Inutilizada</option>
                <option value="ERRO">Erro</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nº / Série</th>
                  <th>Cliente</th>
                  <th>OS Origem</th>
                  <th>Data Emissão</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Valor Total</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {documentos.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      Nenhum documento fiscal encontrado nesta categoria.
                    </td>
                  </tr>
                ) : (
                  documentos.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <span className="status-badge status-completed" style={{ fontWeight: 700 }}>
                          {doc.tipo}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {doc.numero ? `#${doc.numero}` : 'RASCUNHO'} (Série {doc.serie})
                      </td>
                      <td>{doc.cliente?.nome || 'Consumidor Final'}</td>
                      <td>{doc.ordemServico ? `OS #${doc.ordemServico.numeroOs}` : '-'}</td>
                      <td>{new Date(doc.dataEmissao).toLocaleDateString('pt-BR')}</td>
                      <td>{getStatusBadge(doc.status)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(doc.valorTotal)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            title="Ver Detalhes"
                            onClick={() => setModalDetalhes(doc)}
                          >
                            <Eye size={14} />
                          </button>

                          <button
                            className="btn btn-sm btn-primary"
                            title="Validar / Emitir"
                            onClick={() => handleValidar(doc)}
                          >
                            <ShieldAlert size={14} />
                          </button>

                          <a
                            href={fiscalService.getDANFEUrl(doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-secondary"
                            title="Visualizar DANFE / DANFSE"
                          >
                            <Printer size={14} />
                          </a>

                          <a
                            href={fiscalService.getXMLUrl(doc.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-secondary"
                            title="Baixar XML"
                          >
                            <Download size={14} />
                          </a>

                          {doc.status !== 'CANCELADA' && (
                            <button
                              className="btn btn-sm btn-danger"
                              title="Cancelar Nota Fiscal"
                              onClick={() => setModalCancelar(doc)}
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONFIGURAÇÃO FISCAL DA EMPRESA */}
      {activeTab === 'configuracao' && (
        <div className="card" style={{ padding: '1.5rem', maxWidth: '900px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={20} color="var(--color-primary)" /> Dados Fiscais da Empresa Emitente
          </h3>

          <form onSubmit={handleSalvarConfig}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Razão Social *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={formConfig.razaoSocial}
                  onChange={(e) => setFormConfig({ ...formConfig, razaoSocial: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nome Fantasia</label>
                <input
                  type="text"
                  className="form-input"
                  value={formConfig.nomeFantasia}
                  onChange={(e) => setFormConfig({ ...formConfig, nomeFantasia: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">CNPJ *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={formConfig.cnpj}
                  onChange={(e) => setFormConfig({ ...formConfig, cnpj: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Inscrição Estadual (IE)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formConfig.inscricaoEstadual}
                  onChange={(e) => setFormConfig({ ...formConfig, inscricaoEstadual: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Inscrição Municipal (IM)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formConfig.inscricaoMunicipal}
                  onChange={(e) => setFormConfig({ ...formConfig, inscricaoMunicipal: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Regime Tributário</label>
                <select
                  className="form-select"
                  value={formConfig.regimeTributario}
                  onChange={(e) => setFormConfig({ ...formConfig, regimeTributario: e.target.value })}
                >
                  <option value="Simples Nacional">Simples Nacional</option>
                  <option value="Lucro Presumido">Lucro Presumido</option>
                  <option value="Lucro Real">Lucro Real</option>
                  <option value="MEI">MEI (Microempreendedor)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">CRT (Código Regime Tributário)</label>
                <select
                  className="form-select"
                  value={formConfig.crt}
                  onChange={(e) => setFormConfig({ ...formConfig, crt: e.target.value })}
                >
                  <option value="1">1 - Simples Nacional</option>
                  <option value="2">2 - Simples Nacional (Excesso Sublimite)</option>
                  <option value="3">3 - Regime Normal</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Código IBGE do Município</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: 3304557 (Rio de Janeiro)"
                  value={formConfig.codigoIbge}
                  onChange={(e) => setFormConfig({ ...formConfig, codigoIbge: e.target.value })}
                />
              </div>
            </div>

            <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border-color)' }} />

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={20} color="var(--color-primary)" /> Parâmetros de Emissão & Provedor
            </h3>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Ambiente Fiscal SEFAZ</label>
                <select
                  className="form-select"
                  value={formConfig.ambiente}
                  onChange={(e) => setFormConfig({ ...formConfig, ambiente: e.target.value })}
                >
                  <option value="HOMOLOGACAO">Homologação (Testes)</option>
                  <option value="PRODUCAO">Produção (Validade Jurídica Real)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Provedor NFS-e / NF-e</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Padrão Nacional, FocusNFe, PlugNotas"
                  value={formConfig.provedorFiscal}
                  onChange={(e) => setFormConfig({ ...formConfig, provedorFiscal: e.target.value })}
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Série NF-e (Mercadorias)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formConfig.serieNfe}
                  onChange={(e) => setFormConfig({ ...formConfig, serieNfe: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Série NFC-e (Balcão)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formConfig.serieNfce}
                  onChange={(e) => setFormConfig({ ...formConfig, serieNfce: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Série NFS-e (Serviços)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formConfig.serieNfse}
                  onChange={(e) => setFormConfig({ ...formConfig, serieNfse: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formConfig.certificadoDigitalConfigurado}
                  onChange={(e) => setFormConfig({ ...formConfig, certificadoDigitalConfigurado: e.target.checked })}
                />
                Certificado Digital A1/A3 instalado e configurado no servidor
              </label>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary">
                Salvar Configurações Fiscais
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: GERAR RASCUNHO FISCAL DA OS */}
      {modalNovaNota && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Gerar Documento Fiscal da OS</h3>
              <button className="modal-close" onClick={() => setModalNovaNota(false)}>×</button>
            </div>
            <form onSubmit={handleGerarRascunho}>
              <div className="form-group">
                <label className="form-label">Selecione a Ordem de Serviço *</label>
                <select
                  className="form-select"
                  required
                  value={formNovaNota.ordemServicoId}
                  onChange={(e) => setFormNovaNota({ ...formNovaNota, ordemServicoId: e.target.value })}
                >
                  <option value="">Selecione uma OS encerrada ou concluída...</option>
                  {ordensServico.map((os) => (
                    <option key={os.id} value={os.id}>
                      OS #{os.numeroOs} - {os.cliente?.nome} ({formatCurrency(os.valorTotal)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de Documento Fiscal *</label>
                <select
                  className="form-select"
                  value={formNovaNota.tipo}
                  onChange={(e) => setFormNovaNota({ ...formNovaNota, tipo: e.target.value as TipoDocumentoFiscal })}
                >
                  <option value="NFSE">NFS-e (Nota Fiscal de Serviços Eletrônica)</option>
                  <option value="NFE">NF-e (Nota Fiscal Eletrônica de Peças/Produtos)</option>
                  <option value="NFCE">NFC-e (Nota Fiscal de Consumidor Eletrônica)</option>
                </select>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-main)', padding: '0.75rem', borderRadius: '6px' }}>
                <Info size={14} inline /> A emissão fiscal não duplicará o faturamento financeiro nem criará movimentações repetidas de estoque.
              </p>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalNovaNota(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Gerar Rascunho & Validar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VALIDAÇÃO FISCAL */}
      {modalValidacao && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3>Validação Fiscal: {modalValidacao.doc.tipo} #{modalValidacao.doc.numero || 'RASCUNHO'}</h3>
              <button className="modal-close" onClick={() => setModalValidacao(null)}>×</button>
            </div>
            <div>
              {modalValidacao.result.valido ? (
                <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#52c41a', fontWeight: 700 }}>
                    <CheckCircle size={20} /> Validação Aprovada com Sucesso!
                  </div>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#237804' }}>
                    Todos os campos obrigatórios (emitente, destinatário, impostos e itens) foram preenchidos corretamente.
                  </p>
                </div>
              ) : (
                <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ff4d4f', fontWeight: 700 }}>
                    <AlertTriangle size={20} /> Pendências Identificadas ({modalValidacao.result.erros.length})
                  </div>
                  <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#a8071a' }}>
                    {modalValidacao.result.erros.map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {modalValidacao.result.alertas.length > 0 && (
                <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <strong style={{ color: '#d48806', fontSize: '0.85rem' }}>Alertas de Atenção:</strong>
                  <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#873800' }}>
                    {modalValidacao.result.alertas.map((a, idx) => (
                      <li key={idx}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setModalValidacao(null)}>
                  Fechar
                </button>
                <button
                  className="btn btn-success"
                  disabled={!modalValidacao.result.valido}
                  onClick={() => handleEmitir(modalValidacao.doc.id)}
                >
                  Transmitir para SEFAZ / Prefeitura
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALHES & HISTÓRICO FISCAL */}
      {modalDetalhes && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3>Detalhes do Documento Fiscal: {modalDetalhes.tipo}</h3>
              <button className="modal-close" onClick={() => setModalDetalhes(null)}>×</button>
            </div>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status Atual</span>
                  <div>{getStatusBadge(modalDetalhes.status)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ambiente</span>
                  <div style={{ fontWeight: 600 }}>{modalDetalhes.ambiente}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Cliente / Destinatário</span>
                  <div style={{ fontWeight: 600 }}>{modalDetalhes.cliente?.nome || '-'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Valor Total</span>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{formatCurrency(modalDetalhes.valorTotal)}</div>
                </div>
              </div>

              {modalDetalhes.mensagemFiscal && (
                <div style={{ background: '#fff2f0', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem', color: '#a8071a' }}>
                  <strong>Mensagem do Provedor:</strong> {modalDetalhes.mensagemFiscal}
                </div>
              )}

              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>Histórico de Transmissões & Auditoria</h4>
              <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.5rem' }}>
                {modalDetalhes.historico && modalDetalhes.historico.length > 0 ? (
                  modalDetalhes.historico.map((h) => (
                    <div key={h.id} style={{ borderBottom: '1px solid var(--border-color)', padding: '0.5rem 0', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>{new Date(h.createdAt).toLocaleString('pt-BR')}</span>
                        <span>{h.statusNovo}</span>
                      </div>
                      <div style={{ fontWeight: 500, marginTop: '0.2rem' }}>{h.mensagem}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
                    Sem eventos registrados no histórico.
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setModalDetalhes(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CANCELAR NOTA FISCAL */}
      {modalCancelar && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Cancelar Documento Fiscal #{modalCancelar.numero || 'RASCUNHO'}</h3>
              <button className="modal-close" onClick={() => setModalCancelar(null)}>×</button>
            </div>
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                O cancelamento fiscal registrará o evento oficialmente no histórico e informará o provedor de transmissão.
              </p>
              <div className="form-group">
                <label className="form-label">Justificativa / Motivo do Cancelamento *</label>
                <textarea
                  className="form-textarea"
                  required
                  rows={3}
                  placeholder="Mínimo 15 caracteres para SEFAZ..."
                  value={motivoCancelamentoText}
                  onChange={(e) => setMotivoCancelamentoText(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setModalCancelar(null)}>
                  Voltar
                </button>
                <button className="btn btn-danger" onClick={handleCancelar}>
                  Confirmar Cancelamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INUTILIZAR FAIXA NUMÉRICA */}
      {modalInutilizar && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Inutilizar Faixa Numérica Fiscal</h3>
              <button className="modal-close" onClick={() => setModalInutilizar(false)}>×</button>
            </div>
            <form onSubmit={handleInutilizar}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Tipo *</label>
                  <select
                    className="form-select"
                    value={formInutilizar.tipo}
                    onChange={(e) => setFormInutilizar({ ...formInutilizar, tipo: e.target.value })}
                  >
                    <option value="NFE">NF-e</option>
                    <option value="NFCE">NFC-e</option>
                    <option value="NFSE">NFS-e</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Série *</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={formInutilizar.serie}
                    onChange={(e) => setFormInutilizar({ ...formInutilizar, serie: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Número Inicial *</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    value={formInutilizar.numeroInicial}
                    onChange={(e) => setFormInutilizar({ ...formInutilizar, numeroInicial: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Número Final *</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    value={formInutilizar.numeroFinal}
                    onChange={(e) => setFormInutilizar({ ...formInutilizar, numeroFinal: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Justificativa *</label>
                <textarea
                  className="form-textarea"
                  required
                  rows={2}
                  placeholder="Ex: Quebra de sequência numérica por falha no emissor"
                  value={formInutilizar.justificativa}
                  onChange={(e) => setFormInutilizar({ ...formInutilizar, justificativa: e.target.value })}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalInutilizar(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-danger">
                  Registrar Inutilização
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
