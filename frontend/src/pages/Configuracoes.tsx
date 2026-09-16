import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { EmpresaConfig, ConfiguracaoFiscal } from '../types';
import { api } from '../services/api';
import { Building2, FileCode, Shield, Server, CheckCircle2, AlertCircle, Save } from 'lucide-react';

export const Configuracoes: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'empresa' | 'fiscal' | 'usuarios' | 'sistema'>('empresa');

  // Estados dos formulários
  const [empresa, setEmpresa] = useState<EmpresaConfig>({
    razaoSocial: 'Lemoka Centro Automotivo LTDA',
    nomeFantasia: 'Lemoka Centro Automotivo',
    cnpj: '37.912.027/0001-60',
    cep: '26290-600',
    endereco: 'Av. Abilio Augusto Távora',
    numero: '4505',
    bairro: 'Valverde',
    cidade: 'Nova Iguaçu',
    uf: 'RJ'
  });

  const [fiscal, setFiscal] = useState<ConfiguracaoFiscal>({
    statusIntegracao: 'Pendente de configuração',
    ambiente: 'HOMOLOGACAO'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msgSucesso, setMsgSucesso] = useState('');
  const [msgErro, setMsgErro] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resEmpresa, resFiscal] = await Promise.all([
        api.get('/empresa').catch(() => null),
        api.get('/fiscal').catch(() => null)
      ]);

      if (resEmpresa?.data) setEmpresa(resEmpresa.data);
      if (resFiscal?.data) setFiscal(resFiscal.data);
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsgSucesso('');
    setMsgErro('');

    try {
      const res = await api.put('/empresa', empresa);
      setEmpresa(res.data);
      setMsgSucesso('Dados da empresa salvos com sucesso!');
    } catch (err: any) {
      setMsgErro(err.response?.data?.error || 'Erro ao salvar dados da empresa.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFiscal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsgSucesso('');
    setMsgErro('');

    try {
      const res = await api.put('/fiscal', fiscal);
      setFiscal(res.data);
      setMsgSucesso('Configurações fiscais salvas com sucesso!');
    } catch (err: any) {
      setMsgErro(err.response?.data?.error || 'Erro ao salvar configurações fiscais.');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="card alert-critico" style={{ margin: '2rem auto', maxWidth: '600px', textAlign: 'center' }}>
        <AlertCircle size={32} style={{ margin: '0 auto 0.5rem auto' }} />
        <h3>Acesso Restrito</h3>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          A área administrativa de configurações é exclusiva para usuários com perfil <strong>ADMIN</strong>.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Configurações Administrativas</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Gestão empresarial, parametrização fiscal para NFS-e e diagnóstico do sistema Lemoka Centro Automotivo.
        </p>
      </div>

      {msgSucesso && (
        <div className="alert alert-sucesso">
          <CheckCircle2 size={18} /> {msgSucesso}
        </div>
      )}

      {msgErro && (
        <div className="alert alert-critico">
          <AlertCircle size={18} /> {msgErro}
        </div>
      )}

      {/* Tabs de Navegação */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'empresa' ? 'btn-gold' : 'btn-secondary'}`}
          onClick={() => setActiveTab('empresa')}
        >
          <Building2 size={16} /> Dados da Empresa
        </button>
        <button
          className={`btn ${activeTab === 'fiscal' ? 'btn-gold' : 'btn-secondary'}`}
          onClick={() => setActiveTab('fiscal')}
        >
          <FileCode size={16} /> Configuração Fiscal (NFS-e)
        </button>
        <button
          className={`btn ${activeTab === 'usuarios' ? 'btn-gold' : 'btn-secondary'}`}
          onClick={() => setActiveTab('usuarios')}
        >
          <Shield size={16} /> Usuários & Permissões
        </button>
        <button
          className={`btn ${activeTab === 'sistema' ? 'btn-gold' : 'btn-secondary'}`}
          onClick={() => setActiveTab('sistema')}
        >
          <Server size={16} /> Diagnóstico do Sistema
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Carregando configurações...
        </div>
      ) : (
        <>
          {/* TAB 1: DADOS DA EMPRESA */}
          {activeTab === 'empresa' && (
            <form onSubmit={handleSaveEmpresa} className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                1. Cadastro Empresarial (Lemoka Centro Automotivo)
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Razão Social *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={empresa.razaoSocial}
                    onChange={(e) => setEmpresa({ ...empresa, razaoSocial: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nome Fantasia *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={empresa.nomeFantasia}
                    onChange={(e) => setEmpresa({ ...empresa, nomeFantasia: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">CNPJ *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={empresa.cnpj}
                    onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Inscrição Municipal</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Pendente do contador"
                    value={empresa.inscricaoMunicipal || ''}
                    onChange={(e) => setEmpresa({ ...empresa, inscricaoMunicipal: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Inscrição Estadual</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Pendente de confirmação"
                    value={empresa.inscricaoEstadual || ''}
                    onChange={(e) => setEmpresa({ ...empresa, inscricaoEstadual: e.target.value })}
                  />
                </div>
              </div>

              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', margin: '1rem 0 0.5rem 0' }}>
                Endereço Oficial
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">CEP</label>
                  <input
                    type="text"
                    className="form-input"
                    value={empresa.cep}
                    onChange={(e) => setEmpresa({ ...empresa, cep: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Logradouro / Endereço</label>
                  <input
                    type="text"
                    className="form-input"
                    value={empresa.endereco}
                    onChange={(e) => setEmpresa({ ...empresa, endereco: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Número</label>
                  <input
                    type="text"
                    className="form-input"
                    value={empresa.numero}
                    onChange={(e) => setEmpresa({ ...empresa, numero: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Bairro</label>
                  <input
                    type="text"
                    className="form-input"
                    value={empresa.bairro}
                    onChange={(e) => setEmpresa({ ...empresa, bairro: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cidade</label>
                  <input
                    type="text"
                    className="form-input"
                    value={empresa.cidade}
                    onChange={(e) => setEmpresa({ ...empresa, cidade: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">UF</label>
                  <input
                    type="text"
                    className="form-input"
                    value={empresa.uf}
                    onChange={(e) => setEmpresa({ ...empresa, uf: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Telefone de Atendimento</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Não informado"
                    value={empresa.telefone || ''}
                    onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Não informado"
                    value={empresa.whatsapp || ''}
                    onChange={(e) => setEmpresa({ ...empresa, whatsapp: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail da Empresa</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Não informado"
                    value={empresa.email || ''}
                    onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-gold" style={{ marginTop: '1.5rem' }} disabled={saving}>
                <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Alterações Empresariais'}
              </button>
            </form>
          )}

          {/* TAB 2: CONFIGURAÇÃO FISCAL NFS-e (FASE 6) */}
          {activeTab === 'fiscal' && (
            <form onSubmit={handleSaveFiscal} className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                2. Parâmetros Fiscais (NFS-e Nacional — Preparação)
              </h3>

              <div className="alert alert-info">
                <AlertCircle size={20} />
                <span>
                  <strong>Nota:</strong> Esta área está preparada para receber os códigos e tributações fornecidos posteriormente pelo contador da Lemoka Centro Automotivo. Os campos não configurados permanecem como <em>"Pendente de configuração"</em>.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Status da Integração Fiscal</label>
                  <input
                    type="text"
                    className="form-input"
                    value={fiscal.statusIntegracao || 'Pendente de configuração'}
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ambiente de Emissão</label>
                  <select
                    className="form-select"
                    value={fiscal.ambiente || 'HOMOLOGACAO'}
                    onChange={(e) => setFiscal({ ...fiscal, ambiente: e.target.value })}
                  >
                    <option value="HOMOLOGACAO">Homologação / Testes</option>
                    <option value="PRODUCAO">Produção Oficial</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Regime Tributário</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Pendente do contador (ex: Simples Nacional)"
                    value={fiscal.regimeTributario || ''}
                    onChange={(e) => setFiscal({ ...fiscal, regimeTributario: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Código de Serviço Municipal</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Pendente do contador (ex: 14.01)"
                    value={fiscal.codigoServicoMunicipal || ''}
                    onChange={(e) => setFiscal({ ...fiscal, codigoServicoMunicipal: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Código de Tributação Nacional</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Pendente de configuração"
                    value={fiscal.codigoTributacaoNacional || ''}
                    onChange={(e) => setFiscal({ ...fiscal, codigoTributacaoNacional: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Alíquota Padrão (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    placeholder="Pendente (ex: 2.0)"
                    value={fiscal.aliquota ?? ''}
                    onChange={(e) => setFiscal({ ...fiscal, aliquota: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descrição Padrão dos Serviços Fiscais</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Descrição padrão que acompanhará a emissão de nota fiscal de serviços automotivos..."
                  value={fiscal.descricaoPadraoServico || ''}
                  onChange={(e) => setFiscal({ ...fiscal, descricaoPadraoServico: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-gold" style={{ marginTop: '1rem' }} disabled={saving}>
                <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Parâmetros Fiscais'}
              </button>
            </form>
          )}

          {/* TAB 3: USUÁRIOS E PERMISSÕES (FASE 1 e 8) */}
          {activeTab === 'usuarios' && (
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                3. Estrutura de Níveis de Acesso e Permissões
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--green)', fontWeight: 700, marginBottom: '0.5rem' }}>
                    <Shield size={18} /> OPERACIONAL
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Utilizado pela equipe no dia a dia da oficina e pelo contador conforme a necessidade.
                  </p>
                  <ul style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '0.75rem', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                    <li>Visualizar Dashboard e Indicadores</li>
                    <li>Cadastrar e Editar Atendimentos</li>
                    <li>Consultar Histórico e Baixar Documentos Internos</li>
                    <li>Acessar Mecânicos e Comissões</li>
                    <li>Registrar Despesas Fixas e Tráfego</li>
                  </ul>
                </div>

                <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-sm)', padding: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--gold)', fontWeight: 700, marginBottom: '0.5rem' }}>
                    <Shield size={18} /> ADMIN
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Uso exclusivo do administrador/desenvolvedor do sistema com acesso completo.
                  </p>
                  <ul style={{ fontSize: '0.78rem', color: 'var(--text-primary)', marginTop: '0.75rem', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                    <li>Todas as permissões do perfil Operacional</li>
                    <li>Exclusão de Registros de Mecânicos, Despesas e Tráfego</li>
                    <li>Configurações Empresariais do Lemoka</li>
                    <li>Parametrização Fiscal para NFS-e</li>
                    <li>Acesso às Configurações de Sistema</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DIAGNÓSTICO DO SISTEMA (FASE 8) */}
          {activeTab === 'sistema' && (
            <div className="card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                4. Integridade e Diagnóstico Técnico
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                  <span>Empresa Ativa:</span>
                  <strong>LEMOKA CENTRO AUTOMOTIVO (CNPJ: 37.912.027/0001-60)</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                  <span>Banco de Dados:</span>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>PostgreSQL Supabase (Online)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                  <span>Sessões Simultâneas:</span>
                  <span style={{ color: 'var(--green)', fontWeight: 600 }}>Permitido (2 a 4 dispositivos)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}>
                  <span>Status NFS-e Nacional:</span>
                  <span style={{ color: 'var(--gold)', fontWeight: 600 }}>Estrutura Preparada (Pendente do Contador)</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
