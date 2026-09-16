import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  MessageSquare,
  Plus,
  Search,
  Filter,
  Eye,
  Tag as TagIcon,
  Award,
  UserX,
  FileText,
  UserCheck,
  Building,
  Wrench,
  Activity,
  History,
} from 'lucide-react';
import { crmService } from '../services/crmService';
import { clienteService } from '../services/osService';
import {
  CRMDashboardData,
  PrevisaoRetorno,
  TarefaFollowUp,
  Cliente,
  Tag,
  OrdemServico,
} from '../types';

export const CRM: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'retornos' | 'followups' | 'inativos' | 'aniversariantes' | 'orcamentos' | 'tags'>('dashboard');
  const [loading, setLoading] = useState(true);

  // Data States
  const [dashboardData, setDashboardData] = useState<CRMDashboardData | null>(null);
  const [retornos, setRetornos] = useState<PrevisaoRetorno[]>([]);
  const [followUps, setFollowUps] = useState<TarefaFollowUp[]>([]);
  const [inativos, setInativos] = useState<Cliente[]>([]);
  const [aniversariantes, setAniversariantes] = useState<Cliente[]>([]);
  const [orcamentosPendentes, setOrcamentosPendentes] = useState<OrdemServico[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  // Filter States
  const [filterRetorno, setFilterRetorno] = useState<string>('HOJE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [diasInativo, setDiasInativo] = useState<number>(90);

  // Modal States
  const [modalNovoFollowUp, setModalNovoFollowUp] = useState<Partial<TarefaFollowUp> | null>(null);
  const [modalNovaTag, setModalNovaTag] = useState(false);
  const [modalPerfilCliente, setModalPerfilCliente] = useState<any | null>(null);
  const [modalNovaObs, setModalNovaObs] = useState<string | null>(null);

  // Form States
  const [formFollowUp, setFormFollowUp] = useState({
    clienteId: '',
    veiculoId: '',
    titulo: '',
    descricao: '',
    dataAgendada: new Date().toISOString().split('T')[0],
  });

  const [formTag, setFormTag] = useState({
    nome: '',
    cor: '#3B82F6',
    descricao: '',
  });

  const [obsConteudo, setObsConteudo] = useState('');

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [dash, retList, folList, inatList, anivList, orcList, tagList, cliList] = await Promise.all([
        crmService.getDashboard(),
        crmService.getRetornos({ filtro: filterRetorno, q: searchQuery }),
        crmService.getFollowUps(),
        crmService.getClientesInativos(diasInativo),
        crmService.getAniversariantes(30),
        crmService.getOrcamentosPendentes(),
        crmService.getTags(),
        clienteService.getClientes(),
      ]);

      setDashboardData(dash);
      setRetornos(retList);
      setFollowUps(folList);
      setInativos(inatList);
      setAniversariantes(anivList);
      setOrcamentosPendentes(orcList);
      setTags(tagList);
      setClientes(cliList);
    } catch (err) {
      console.error('Erro ao carregar módulo CRM:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, [activeTab, filterRetorno, diasInativo]);

  const handleCriarFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmService.createFollowUp(formFollowUp);
      setModalNovoFollowUp(null);
      setFormFollowUp({
        clienteId: '',
        veiculoId: '',
        titulo: '',
        descricao: '',
        dataAgendada: new Date().toISOString().split('T')[0],
      });
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao criar follow-up');
    }
  };

  const handleConcluirFollowUp = async (id: string) => {
    try {
      await crmService.updateFollowUp(id, { status: 'CONCLUIDO' });
      carregarDados();
    } catch (err: any) {
      alert('Erro ao concluir tarefa');
    }
  };

  const handleConcluirRetorno = async (id: string, status: string) => {
    try {
      await crmService.concluirRetorno(id, { status });
      carregarDados();
    } catch (err: any) {
      alert('Erro ao atualizar retorno');
    }
  };

  const handleCriarTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crmService.createTag(formTag);
      setModalNovaTag(false);
      setFormTag({ nome: '', cor: '#3B82F6', descricao: '' });
      carregarDados();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao criar tag');
    }
  };

  const handleAbrirPerfil = async (clienteId: string) => {
    try {
      const perfil = await crmService.getPerfilCliente(clienteId);
      setModalPerfilCliente(perfil);
    } catch (err: any) {
      alert('Erro ao carregar perfil do cliente');
    }
  };

  const handleAddObservacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalNovaObs || !obsConteudo) return;
    try {
      await crmService.addObservacao(modalNovaObs, obsConteudo);
      setModalNovaObs(null);
      setObsConteudo('');
      if (modalPerfilCliente) {
        handleAbrirPerfil(modalPerfilCliente.id);
      }
      carregarDados();
    } catch (err: any) {
      alert('Erro ao salvar observação');
    }
  };

  const formatCurrency = (val: number | undefined) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="main-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            CRM, Fidelização e Retorno de Clientes
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
            Revisões Preventivas, Pós-Venda, Follow-ups, Clientes Inativos e Aniversariantes
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => setModalNovaTag(true)}>
            <TagIcon size={16} /> Nova Tag
          </button>
          <button className="btn btn-primary" onClick={() => setModalNovoFollowUp({})}>
            <Plus size={16} /> Novo Follow-up
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="kanban-tabs" style={{ marginBottom: '1.5rem' }}>
        <button className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <Activity size={16} /> Painel CRM
        </button>
        <button className={`tab-btn ${activeTab === 'retornos' ? 'active' : ''}`} onClick={() => setActiveTab('retornos')}>
          <Wrench size={16} /> Central de Retornos
        </button>
        <button className={`tab-btn ${activeTab === 'followups' ? 'active' : ''}`} onClick={() => setActiveTab('followups')}>
          <Clock size={16} /> Follow-ups
        </button>
        <button className={`tab-btn ${activeTab === 'inativos' ? 'active' : ''}`} onClick={() => setActiveTab('inativos')}>
          <UserX size={16} /> Clientes Inativos
        </button>
        <button className={`tab-btn ${activeTab === 'aniversariantes' ? 'active' : ''}`} onClick={() => setActiveTab('aniversariantes')}>
          <Calendar size={16} /> Aniversariantes
        </button>
        <button className={`tab-btn ${activeTab === 'orcamentos' ? 'active' : ''}`} onClick={() => setActiveTab('orcamentos')}>
          <FileText size={16} /> Orçamentos Pendentes
        </button>
        <button className={`tab-btn ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => setActiveTab('tags')}>
          <TagIcon size={16} /> Tags
        </button>
      </div>

      {/* TAB 1: DASHBOARD CRM */}
      {activeTab === 'dashboard' && (
        <>
          <div className="metrics-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="metric-card">
              <div className="metric-icon blue">
                <Users size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Total de Clientes</span>
                <span className="metric-value">{dashboardData?.totalClientes || 0}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>
                  +{dashboardData?.clientesNovos || 0} novos neste mês
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon green">
                <UserCheck size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Recorrentes / VIPs</span>
                <span className="metric-value">{dashboardData?.clientesRecorrentes || 0}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Clientes com 2+ visitas
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon red">
                <UserX size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Clientes Inativos</span>
                <span className="metric-value">{dashboardData?.clientesInativos || 0}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)' }}>
                  Sem visitas há &gt; 90 dias
                </span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon purple">
                <Wrench size={24} />
              </div>
              <div className="metric-info">
                <span className="metric-label">Revisões Devidas / Hoje</span>
                <span className="metric-value">{dashboardData?.revisoesDevidas || 0}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)' }}>
                  {dashboardData?.retornosProximos || 0} nos próximos 7 dias
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Próximas Tarefas de Follow-up */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Follow-ups de Relacionamento Pendentes</h3>
                <button className="btn btn-sm btn-primary" onClick={() => setActiveTab('followups')}>Ver Todos</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {followUps.filter((f) => f.status === 'PENDENTE').slice(0, 5).map((fol) => (
                  <div key={fol.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: '6px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{fol.titulo}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Cliente: {fol.cliente?.nome} | Data: {new Date(fol.dataAgendada).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <a
                        href={crmService.getWhatsAppLink(fol.cliente?.telefone, `Olá ${fol.cliente?.nome}, tudo bem? Estamos entrando em contato referente a: ${fol.titulo}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-success"
                        title="Enviar mensagem via WhatsApp"
                      >
                        <MessageSquare size={14} /> WhatsApp
                      </a>
                      <button className="btn btn-sm btn-secondary" onClick={() => handleConcluirFollowUp(fol.id)}>
                        <CheckCircle size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Aniversariantes da Semana */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Aniversariantes da Semana</h3>
                <button className="btn btn-sm btn-primary" onClick={() => setActiveTab('aniversariantes')}>Ver Todos</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {aniversariantes.slice(0, 5).map((cli) => (
                  <div key={cli.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: '6px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{cli.nome}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Aniversário: {cli.dataNascimento ? new Date(cli.dataNascimento).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </div>
                    <a
                      href={crmService.getWhatsAppLink(cli.telefone, `Parabéns ${cli.nome}! A equipe Lemoka Centro Automotivo lhe deseja um feliz aniversário!`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-success"
                    >
                      <MessageSquare size={14} /> Dar Parabéns
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: CENTRAL DE RETORNOS E REVISÕES */}
      {activeTab === 'retornos' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className={`btn btn-sm ${filterRetorno === 'HOJE' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterRetorno('HOJE')}>
                Devidos / Hoje
              </button>
              <button className={`btn btn-sm ${filterRetorno === 'PROXIMOS_7' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterRetorno('PROXIMOS_7')}>
                Próximos 7 Dias
              </button>
              <button className={`btn btn-sm ${filterRetorno === 'ATRASADOS' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterRetorno('ATRASADOS')}>
                Atrasados
              </button>
              <button className={`btn btn-sm ${filterRetorno === 'CONCLUIDOS' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilterRetorno('CONCLUIDOS')}>
                Concluídos
              </button>
            </div>

            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar por cliente, placa ou serviço..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Veículo / Placa</th>
                  <th>Motivo / Serviço</th>
                  <th>Data Prevista</th>
                  <th>KM Previsto</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {retornos.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      Nenhum retorno previsto para este filtro.
                    </td>
                  </tr>
                ) : (
                  retornos.map((ret) => (
                    <tr key={ret.id}>
                      <td style={{ fontWeight: 600 }}>
                        <span style={{ cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => handleAbrirPerfil(ret.clienteId)}>
                          {ret.cliente?.nome}
                        </span>
                      </td>
                      <td>{ret.veiculo ? `${ret.veiculo.modelo} (${ret.veiculo.placa})` : '-'}</td>
                      <td>{ret.motivo}</td>
                      <td>{ret.dataPrevista ? new Date(ret.dataPrevista).toLocaleDateString('pt-BR') : '-'}</td>
                      <td>{ret.kmPrevisto ? `${ret.kmPrevisto.toLocaleString()} km` : '-'}</td>
                      <td>
                        <span className={`status-badge ${ret.statusCalculado === 'DEVIDO' ? 'status-danger' : ret.statusCalculado === 'ATRASADO' ? 'status-warning' : 'status-completed'}`}>
                          {ret.statusCalculado || ret.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                          <a
                            href={crmService.getWhatsAppLink(ret.cliente?.telefone, `Olá ${ret.cliente?.nome}! Lembramos que o seu veículo ${ret.veiculo?.modelo} (${ret.veiculo?.placa}) está próximo da revisão: ${ret.motivo}. Podemos agendar?`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-success"
                            title="Enviar lembrete via WhatsApp"
                          >
                            <MessageSquare size={14} /> WhatsApp
                          </a>
                          <button className="btn btn-sm btn-primary" onClick={() => handleConcluirRetorno(ret.id, 'CONCLUIDO')}>
                            <CheckCircle size={14} /> Concluir
                          </button>
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

      {/* TAB 3: FOLLOW-UPS */}
      {activeTab === 'followups' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Tarefas de Relacionamento (Follow-up)</h3>
            <button className="btn btn-primary" onClick={() => setModalNovoFollowUp({})}>
              <Plus size={16} /> Nova Tarefa
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Cliente</th>
                  <th>Data Agendada</th>
                  <th>Origem</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {followUps.map((fol) => (
                  <tr key={fol.id}>
                    <td style={{ fontWeight: 600 }}>{fol.titulo}</td>
                    <td>{fol.cliente?.nome}</td>
                    <td>{new Date(fol.dataAgendada).toLocaleDateString('pt-BR')}</td>
                    <td>{fol.origem}</td>
                    <td>
                      <span className={`status-badge ${fol.status === 'CONCLUIDO' ? 'status-completed' : 'status-warning'}`}>
                        {fol.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <a
                          href={crmService.getWhatsAppLink(fol.cliente?.telefone, `Olá ${fol.cliente?.nome}! Contato referente a: ${fol.titulo}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-success"
                        >
                          <MessageSquare size={14} /> WhatsApp
                        </a>
                        {fol.status !== 'CONCLUIDO' && (
                          <button className="btn btn-sm btn-primary" onClick={() => handleConcluirFollowUp(fol.id)}>
                            <CheckCircle size={14} /> Concluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: CLIENTES INATIVOS */}
      {activeTab === 'inativos' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Segmentação de Clientes Inativos</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 0' }}>
                Clientes sem ordem de serviço registrada dentro da janela selecionada.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sem visitas há:</span>
              <select className="form-select" value={diasInativo} onChange={(e) => setDiasInativo(Number(e.target.value))}>
                <option value={30}>30 Dias</option>
                <option value={60}>60 Dias</option>
                <option value={90}>90 Dias</option>
                <option value={180}>180 Dias</option>
                <option value={365}>365 Dias (1 Ano)</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Telefone</th>
                  <th>Veículo(s)</th>
                  <th>Última OS</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {inativos.map((cli) => (
                  <tr key={cli.id}>
                    <td style={{ fontWeight: 600 }}>
                      <span style={{ cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => handleAbrirPerfil(cli.id)}>
                        {cli.nome}
                      </span>
                    </td>
                    <td>{cli.telefone || '-'}</td>
                    <td>{cli.veiculos?.map((v) => `${v.modelo} (${v.placa})`).join(', ') || '-'}</td>
                    <td>{cli.ordensServico && cli.ordensServico[0] ? new Date(cli.ordensServico[0].createdAt).toLocaleDateString('pt-BR') : 'Sem histórico'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <a
                          href={crmService.getWhatsAppLink(cli.telefone, `Olá ${cli.nome}, tudo bem? Sentimos sua falta na Lemoka Centro Automotivo! Seu veículo precisa de alguma revisão preventiva?`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-success"
                        >
                          <MessageSquare size={14} /> Reativar WhatsApp
                        </a>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setFormFollowUp({
                              clienteId: cli.id,
                              veiculoId: cli.veiculos && cli.veiculos[0] ? cli.veiculos[0].id : '',
                              titulo: `Reativação de Cliente Inativo: ${cli.nome}`,
                              descricao: 'Contato para agendamento de retorno',
                              dataAgendada: new Date().toISOString().split('T')[0],
                            });
                            setModalNovoFollowUp({});
                          }}
                        >
                          + Follow-up
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ANIVERSARIANTES */}
      {activeTab === 'aniversariantes' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Aniversariantes do Mês</h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Data de Nascimento</th>
                  <th>Telefone</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {aniversariantes.map((cli) => (
                  <tr key={cli.id}>
                    <td style={{ fontWeight: 600 }}>{cli.nome}</td>
                    <td>{cli.dataNascimento ? new Date(cli.dataNascimento).toLocaleDateString('pt-BR') : '-'}</td>
                    <td>{cli.telefone || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <a
                        href={crmService.getWhatsAppLink(cli.telefone, `Parabéns ${cli.nome}! Desejamos a você um feliz aniversário em nome de toda a equipe Lemoka Centro Automotivo!`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-success"
                      >
                        <MessageSquare size={14} /> Enviar Parabéns via WhatsApp
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: ORÇAMENTOS PENDENTES */}
      {activeTab === 'orcamentos' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Orçamentos Digitais Pendentes de Aprovação</h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nº OS</th>
                  <th>Cliente</th>
                  <th>Veículo</th>
                  <th>Valor Total</th>
                  <th>Data do Envio</th>
                  <th style={{ textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {orcamentosPendentes.map((os) => (
                  <tr key={os.id}>
                    <td style={{ fontWeight: 600 }}>#{os.numeroOs}</td>
                    <td>{os.cliente?.nome}</td>
                    <td>{os.veiculo ? `${os.veiculo.modelo} (${os.veiculo.placa})` : '-'}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(os.valorTotal)}</td>
                    <td>{new Date(os.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td style={{ textAlign: 'center' }}>
                      <a
                        href={crmService.getWhatsAppLink(os.cliente?.telefone, `Olá ${os.cliente?.nome}, tudo bem? Passando para saber se conseguiu analisar o orçamento da OS #${os.numeroOs}? Podemos tirar alguma dúvida?`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-success"
                      >
                        <MessageSquare size={14} /> Fazer Follow-up
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: TAGS */}
      {activeTab === 'tags' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Gerenciamento de Tags e Categorizações</h3>
            <button className="btn btn-primary" onClick={() => setModalNovaTag(true)}>
              <Plus size={16} /> Nova Tag
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {tags.map((t) => (
              <div key={t.id} style={{ borderLeft: `4px solid ${t.cor}`, padding: '1rem', background: 'var(--bg-main)', borderRadius: '6px' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{t.nome}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{t.descricao || 'Sem descrição'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: NOVO FOLLOW-UP */}
      {modalNovoFollowUp && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Agendar Follow-up / Tarefa</h3>
              <button className="modal-close" onClick={() => setModalNovoFollowUp(null)}>×</button>
            </div>
            <form onSubmit={handleCriarFollowUp}>
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <select
                  className="form-select"
                  required
                  value={formFollowUp.clienteId}
                  onChange={(e) => setFormFollowUp({ ...formFollowUp, clienteId: e.target.value })}
                >
                  <option value="">Selecione o cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Título da Tarefa *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Ex: Ligar para confirmar revisão de 10.000 km"
                  value={formFollowUp.titulo}
                  onChange={(e) => setFormFollowUp({ ...formFollowUp, titulo: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Data Agendada *</label>
                <input
                  type="date"
                  className="form-input"
                  required
                  value={formFollowUp.dataAgendada}
                  onChange={(e) => setFormFollowUp({ ...formFollowUp, dataAgendada: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descrição / Observações</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={formFollowUp.descricao}
                  onChange={(e) => setFormFollowUp({ ...formFollowUp, descricao: e.target.value })}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalNovoFollowUp(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA TAG */}
      {modalNovaTag && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Nova Tag</h3>
              <button className="modal-close" onClick={() => setModalNovaTag(false)}>×</button>
            </div>
            <form onSubmit={handleCriarTag}>
              <div className="form-group">
                <label className="form-label">Nome da Tag *</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="Ex: VIP, Uber, Frota"
                  value={formTag.nome}
                  onChange={(e) => setFormTag({ ...formTag, nome: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Cor de Identificação</label>
                <input
                  type="color"
                  className="form-input"
                  style={{ height: '40px', padding: 0, cursor: 'pointer' }}
                  value={formTag.cor}
                  onChange={(e) => setFormTag({ ...formTag, cor: e.target.value })}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalNovaTag(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Criar Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PERFIL 360º DO CLIENTE */}
      {modalPerfilCliente && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <h3>Perfil CRM 360º: {modalPerfilCliente.nome}</h3>
              <button className="modal-close" onClick={() => setModalPerfilCliente(null)}>×</button>
            </div>
            <div>
              {/* Badges e Resumo LTV */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
                <span className="status-badge status-completed" style={{ fontSize: '0.9rem' }}>
                  Classificação: {modalPerfilCliente.classificacaoCalculada}
                </span>
                {modalPerfilCliente.telefone && (
                  <a
                    href={crmService.getWhatsAppLink(modalPerfilCliente.telefone, `Olá ${modalPerfilCliente.nome}, tudo bem?`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-success"
                  >
                    <MessageSquare size={14} /> WhatsApp Direct
                  </a>
                )}
                <button className="btn btn-sm btn-secondary" onClick={() => setModalNovaObs(modalPerfilCliente.id)}>
                  + Observação Interna
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: 'var(--bg-main)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Gasto (LTV)</span>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-success)' }}>
                    {formatCurrency(modalPerfilCliente.resumoCRM?.totalGasto)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ticket Médio</span>
                  <div style={{ fontWeight: 600 }}>{formatCurrency(modalPerfilCliente.resumoCRM?.ticketMedio)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total de Visitas</span>
                  <div style={{ fontWeight: 600 }}>{modalPerfilCliente.resumoCRM?.totalOS} OS</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Veículos</span>
                  <div style={{ fontWeight: 600 }}>{modalPerfilCliente.resumoCRM?.totalVeiculos}</div>
                </div>
              </div>

              {/* Timeline de Histórico */}
              <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} /> Timeline Histórica Unificada
              </h4>
              <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.75rem' }}>
                {modalPerfilCliente.timeline?.map((ev: any) => (
                  <div key={ev.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                      <span>{new Date(ev.data).toLocaleString('pt-BR')}</span>
                      <strong style={{ color: 'var(--color-primary)' }}>{ev.tipo}</strong>
                    </div>
                    <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{ev.titulo}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{ev.descricao}</div>
                  </div>
                ))}
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setModalPerfilCliente(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA OBSERVAÇÃO INTERNA */}
      {modalNovaObs && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Adicionar Observação Interna</h3>
              <button className="modal-close" onClick={() => setModalNovaObs(null)}>×</button>
            </div>
            <form onSubmit={handleAddObservacao}>
              <div className="form-group">
                <label className="form-label">Conteúdo da Observação *</label>
                <textarea
                  className="form-textarea"
                  required
                  rows={3}
                  placeholder="Ex: Cliente solicita ligar no período da tarde. Prefere peças originais."
                  value={obsConteudo}
                  onChange={(e) => setObsConteudo(e.target.value)}
                />
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setModalNovaObs(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Salvar Observação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
