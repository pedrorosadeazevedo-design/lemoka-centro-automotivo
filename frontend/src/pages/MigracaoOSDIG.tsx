import React, { useState } from 'react';
import { Database, Upload, FileCheck, AlertTriangle, ShieldAlert, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { migrationService } from '../services/migrationService';

export const MigracaoOSDIG: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setJsonText(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  };

  const handleRunDryRun = async () => {
    if (!jsonText) {
      alert("Selecione um arquivo de exportação OSDIG (JSON) ou cole os dados.");
      return;
    }

    setLoading(true);
    try {
      let parsed = {};
      try {
        parsed = JSON.parse(jsonText);
      } catch (e) {
        alert("Erro no formato JSON do arquivo.");
        setLoading(false);
        return;
      }

      const res = await migrationService.executeDryRun(parsed);
      setDryRunResult(res);
    } catch (err: any) {
      alert(err.response?.data?.error || "Erro ao executar Dry Run da migração.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Database className="text-primary" /> Motor de Prévia & Validação de Migração OSDIG
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Análise de integridade, deduplicação segura e Dry Run (Sem gravação definitiva nos dados reais)
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Card Upload / JSON Input */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Upload size={18} /> Carregar Exportação do OSDIG
          </h3>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Selecione o arquivo de dados (.json / export)
            </label>
            <input 
              type="file" 
              accept=".json,.txt"
              onChange={handleFileChange}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
            />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              ou Cole o JSON para análise prévia:
            </label>
            <textarea
              rows={8}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{ "clientes": [...], "produtos": [...], "ordensServico": [...] }'
              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.8rem' }}
            />
          </div>

          <button 
            className="btn-primary" 
            onClick={handleRunDryRun} 
            disabled={loading}
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
          >
            <FileCheck size={18} /> {loading ? 'Analisando Dados...' : 'Executar Análise & Dry Run (Sem Gravação)'}
          </button>
        </div>

        {/* Card Regras e Bloqueio de Segurança */}
        <div className="card" style={{ padding: '1.25rem', background: 'var(--bg-secondary)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '1rem', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={18} /> Protocolo de Segurança da Migração
          </h3>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem' }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Lock size={16} style={{ marginTop: '0.2rem', color: '#10B981' }} />
              <span><strong>Modo Somente Leitura (Dry Run):</strong> Esta etapa apenas simula e auditada o mapeamento sem gravar dados definitivos.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Lock size={16} style={{ marginTop: '0.2rem', color: '#10B981' }} />
              <span><strong>Preservação da Base Atual:</strong> Nenhum cliente, produto ou OS atual do Lemoka será apagado ou sobrescrito.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Lock size={16} style={{ marginTop: '0.2rem', color: '#10B981' }} />
              <span><strong>Rastreabilidade de Origem:</strong> Todo registro migrado recebe o campo <code>osdigId</code> para garantir deduplicação e idempotência.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <Lock size={16} style={{ marginTop: '0.2rem', color: '#EF4444' }} />
              <span><strong>Importação Definitiva Desabilitada:</strong> O botão de efetivação gravada permanecerá bloqueado até aprovação final.</span>
            </li>
          </ul>

          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              className="btn-secondary"
              onClick={async () => {
                if (!jsonText) return alert("Selecione um arquivo de dados primeiro.");
                if (!confirm("CONFIRMAÇÃO DE SEGURANÇA (Etapa 16 - Homologação Amostra):\n\nEsta ação executará o lote de migração controlada e gravativa no banco com logs e idempotência.\n\nDeseja continuar?")) return;
                setLoading(true);
                try {
                  const parsed = JSON.parse(jsonText);
                  const batchRes = await migrationService.executeBatch(parsed, 'HOMOLOGACAO_AMOSTRA');
                  alert(`Lote #${batchRes.id.substring(0,8)} executado com sucesso!\nCriados: ${batchRes.totalCriados} | Ignorados/Existentes: ${batchRes.totalIgnorados}`);
                  setDryRunResult(null);
                } catch (err: any) {
                  alert(err.response?.data?.error || "Erro ao executar lote de migração.");
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              style={{ width: '100%', background: '#10B981', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: '6px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <Database size={18} /> Executar Lote Controlado Amostra (Etapa 16)
            </button>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Protegido com logs e chave idempotente <code>osdigId</code>.
            </div>
          </div>
        </div>
      </div>

      {/* Resultados do Dry Run */}
      {dryRunResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Summary Table */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} className="text-success" /> Resumo da Análise de Migração (Dry Run)
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={{ padding: '0.6rem' }}>Entidade Mapeada</th>
                    <th style={{ padding: '0.6rem' }}>Total Origem (OSDIG)</th>
                    <th style={{ padding: '0.6rem', color: '#10B981' }}>Novos (Prontos)</th>
                    <th style={{ padding: '0.6rem', color: '#F59E0B' }}>Duplicados Detectados</th>
                    <th style={{ padding: '0.6rem', color: '#EF4444' }}>Conflitos / Bloqueados</th>
                    <th style={{ padding: '0.6rem' }}>Status Mapeamento</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.values(dryRunResult.resumoEntidades || {}).map((item: any) => (
                    <tr key={item.entidade} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem', fontWeight: 'bold' }}>{item.entidade}</td>
                      <td style={{ padding: '0.6rem' }}>{item.totalLinhasOrigem}</td>
                      <td style={{ padding: '0.6rem', fontWeight: 'bold', color: '#10B981' }}>{item.novosParaImportar}</td>
                      <td style={{ padding: '0.6rem', fontWeight: 'bold', color: '#F59E0B' }}>{item.duplicadosDetectados}</td>
                      <td style={{ padding: '0.6rem', fontWeight: 'bold', color: '#EF4444' }}>{item.conflitosCamposIncompletos}</td>
                      <td style={{ padding: '0.6rem' }}>
                        <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#10B98120', color: '#10B981', fontSize: '0.75rem', fontWeight: 600 }}>
                          PRONTO PARA ETAPA DE IMPORTAÇÃO
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ordem Recomendada de Importação Futura */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ArrowRight size={18} className="text-primary" /> Ordem Recomendada de Execução Futura
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {dryRunResult.ordemRecomendadaImportacao?.map((step: string, idx: number) => (
                <div key={idx} style={{ padding: '0.6rem 0.8rem', borderRadius: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600 }}>
                  {step}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
