import React, { useEffect, useState } from 'react';
import { 
  FileCheck2, 
  Plus, 
  RefreshCw, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Lock, 
  Download, 
  Calendar,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { spedService, PeriodoFiscal } from '../services/spedService';

export const SpedFiscal: React.FC = () => {
  const [periodos, setPeriodos] = useState<PeriodoFiscal[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<PeriodoFiscal | null>(null);
  const [newCompetencia, setNewCompetencia] = useState('');
  const [layoutVersao, setLayoutVersao] = useState('017');

  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchPeriodos = async () => {
    setLoading(true);
    try {
      const list = await spedService.getPeriodos();
      setPeriodos(list);
      if (list.length > 0 && !selectedPeriodo) {
        setSelectedPeriodo(list[0]);
      }
    } catch (err: any) {
      console.error("Erro ao buscar períodos SPED:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeriodos();
  }, []);

  const handleCreatePeriodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompetencia) return;
    try {
      const created = await spedService.createPeriodo(newCompetencia, layoutVersao);
      setShowModal(false);
      setNewCompetencia('');
      fetchPeriodos();
      setSelectedPeriodo(created);
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao criar período fiscal.");
    }
  };

  const handleProcessar = async () => {
    if (!selectedPeriodo) return;
    setProcessing(true);
    try {
      const updated = await spedService.processarPeriodo(selectedPeriodo.id);
      setSelectedPeriodo(updated);
      fetchPeriodos();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao processar período fiscal.");
    } finally {
      setProcessing(false);
    }
  };

  const handleGerarArquivo = async () => {
    if (!selectedPeriodo) return;
    setProcessing(true);
    try {
      const fileRes = await spedService.gerarArquivo(selectedPeriodo.id);
      alert(`Arquivo SPED ${fileRes.nomeArquivo} gerado com sucesso!`);
      
      // Download TXT
      const element = document.createElement("a");
      const file = new Blob([fileRes.conteudoTxt], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      element.download = fileRes.nomeArquivo;
      document.body.appendChild(element);
      element.click();
      element.remove();

      fetchPeriodos();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao gerar arquivo SPED.");
    } finally {
      setProcessing(false);
    }
  };

  const handleFecharPeriodo = async () => {
    if (!selectedPeriodo) return;
    if (!confirm(`Tem certeza que deseja FECHAR o período ${selectedPeriodo.competencia}? Não será possível alterar ou reprocessar os dados sem intervenção administrativa.`)) return;
    try {
      const closed = await spedService.fecharPeriodo(selectedPeriodo.id);
      setSelectedPeriodo(closed);
      fetchPeriodos();
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao fechar período fiscal.");
    }
  };

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileCheck2 className="text-primary" /> SPED Fiscal EFD ICMS/IPI — Lemoka Centro Automotivo
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Preparação, validação de consistência e exportação de dados para apuração fiscal
          </p>
        </div>

        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Plus size={16} /> Nova Competência (YYYY-MM)
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        {/* Painel Lateral: Competências */}
        <div className="card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} /> Competências Fiscais
          </h3>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>Carregando...</div>
          ) : periodos.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
              Nenhum período criado. Clique em Nova Competência.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {periodos.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPeriodo(p)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: selectedPeriodo?.id === p.id ? 'var(--primary-color)' : 'var(--bg-secondary)',
                    color: selectedPeriodo?.id === p.id ? '#fff' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{p.competencia}</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Status: {p.status}</div>
                  </div>
                  {p.status === 'FECHADO' && <Lock size={16} />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conteúdo Principal: Detalhes do Período */}
        <div>
          {!selectedPeriodo ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Selecione ou crie um período fiscal na barra lateral.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Header do Período */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Período Fiscal Competência: {selectedPeriodo.competencia}</h2>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Layout SPED: EFD ICMS/IPI Versão <strong>v{selectedPeriodo.layoutVersao}</strong> | Status: <strong style={{ color: selectedPeriodo.status === 'VALIDADO' || selectedPeriodo.status === 'EXPORTADO' ? '#10B981' : '#F59E0B' }}>{selectedPeriodo.status}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedPeriodo.status !== 'FECHADO' && (
                      <>
                        <button className="btn-secondary" onClick={handleProcessar} disabled={processing} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <RefreshCw size={16} className={processing ? 'spin' : ''} /> {processing ? 'Auditando...' : 'Processar & Validar'}
                        </button>
                        <button className="btn-primary" onClick={handleGerarArquivo} disabled={processing} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Download size={16} /> Gerar & Exportar TXT
                        </button>
                        <button className="btn-secondary" onClick={handleFecharPeriodo} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#EF4444' }}>
                          <Lock size={16} /> Fechar Período
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Cards de Resumo */}
              <div className="grid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Entradas (Compras)</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#3B82F6', marginTop: '0.25rem' }}>
                    R$ {Number(selectedPeriodo.totalEntradas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Saídas (Vendas/OS)</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#10B981', marginTop: '0.25rem' }}>
                    R$ {Number(selectedPeriodo.totalSaidas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Documentos Processados</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                    {selectedPeriodo.totalDocumentos || 0}
                  </div>
                </div>

                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Inconsistências Encontradas</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: (selectedPeriodo.totalInconsistencias || 0) > 0 ? '#EF4444' : '#10B981', marginTop: '0.25rem' }}>
                    {selectedPeriodo.totalInconsistencias || 0}
                  </div>
                </div>
              </div>

              {/* Inconsistências & Motor de Validação */}
              {selectedPeriodo.inconsistencias && selectedPeriodo.inconsistencias.length > 0 && (
                <div className="card" style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#EF4444', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={18} /> Motor de Validação Fiscal — Inconsistências Detectadas
                  </h3>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                          <th style={{ padding: '0.5rem' }}>Tipo</th>
                          <th style={{ padding: '0.5rem' }}>Entidade</th>
                          <th style={{ padding: '0.5rem' }}>Campo</th>
                          <th style={{ padding: '0.5rem' }}>Motivo</th>
                          <th style={{ padding: '0.5rem' }}>Ação Recomendada</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPeriodo.inconsistencias.map((inc: any, idx: number) => (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '0.5rem', fontWeight: 'bold', color: inc.tipo === 'ERRO' ? '#EF4444' : '#F59E0B' }}>
                              {inc.tipo}
                            </td>
                            <td style={{ padding: '0.5rem' }}>{inc.entidade}</td>
                            <td style={{ padding: '0.5rem', fontFamily: 'monospace' }}>{inc.campo || '-'}</td>
                            <td style={{ padding: '0.5rem' }}>{inc.motivo}</td>
                            <td style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>{inc.acaoRecomendada || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Criar Período */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Nova Competência Fiscal</h3>
            <form onSubmit={handleCreatePeriodo}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Competência (YYYY-MM) *</label>
                <input
                  type="month"
                  value={newCompetencia}
                  onChange={(e) => setNewCompetencia(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Layout SPED Versão</label>
                <select
                  value={layoutVersao}
                  onChange={(e) => setLayoutVersao(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="017">v017 (EFD ICMS/IPI Atual)</option>
                  <option value="016">v016 (Versão Anterior)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Criar Competência</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
