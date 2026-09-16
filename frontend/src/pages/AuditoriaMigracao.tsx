import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Download, 
  FileText 
} from 'lucide-react';
import { auditService, MigrationAuditRecord, AuditSummary } from '../services/auditService';

export const AuditoriaMigracao: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [records, setRecords] = useState<MigrationAuditRecord[]>([]);
  const [summary, setSummary] = useState<AuditSummary>({
    total: 0,
    alertas: 0,
    erros: 0,
    fatales: 0,
    pendentes: 0,
    ignorados: 0,
    resolvidos: 0
  });

  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [filtroSeveridade, setFiltroSeveridade] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await auditService.getRecords({
        categoria: filtroCategoria || undefined,
        severidade: filtroSeveridade || undefined,
        status: filtroStatus || undefined
      });
      setRecords(data.records);
      setSummary(data.summary);
    } catch (err) {
      console.error('Erro ao carregar auditoria pós-migração', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filtroCategoria, filtroSeveridade, filtroStatus]);

  const handleRunAudit = async () => {
    setRunning(true);
    try {
      await auditService.runAudit();
      await loadData();
    } catch (err) {
      console.error('Erro ao executar auditoria', err);
      alert('Erro ao executar a varredura de auditoria.');
    } finally {
      setRunning(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'PENDENTE' | 'IGNORADO' | 'RESOLVIDO') => {
    try {
      await auditService.updateStatus(id, status);
      await loadData();
    } catch (err) {
      console.error('Erro ao atualizar status do registro', err);
    }
  };

  const exportCSV = () => {
    if (records.length === 0) return;

    const headers = ['Categoria', 'Severidade', 'Mensagem', 'Status', 'ID OSDIG', 'ID Lemoka', 'Data'];
    const rows = records.map(r => [
      r.categoria,
      r.severidade,
      `"${r.mensagem.replace(/"/g, '""')}"`,
      r.status,
      r.osdigId || '',
      r.lemokaId || '',
      new Date(r.createdAt).toLocaleString('pt-BR')
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `auditoria_migracao_lemoka_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Auditoria Pós-Migração OSDIG</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Painel de Conciliação, Integridade Operacional e Rastreabilidade do LEMOKA CENTRO AUTOMOTIVO
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            disabled={records.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>
          <button
            onClick={handleRunAudit}
            disabled={running}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Auditando Banco...' : 'Executar Varredura'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Total de Ocorrências</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">{summary.total}</h3>
          </div>
          <div className="p-3 bg-gray-50 text-gray-600 rounded-lg">
            <FileText className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase">Alertas</p>
            <h3 className="text-2xl font-bold text-amber-700 mt-1">{summary.alertas}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Info className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-orange-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-orange-600 uppercase">Erros de Regra</p>
            <h3 className="text-2xl font-bold text-orange-700 mt-1">{summary.erros}</h3>
          </div>
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase">Erros Fatais</p>
            <h3 className="text-2xl font-bold text-red-700 mt-1">{summary.fatales}</h3>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertOctagon className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-gray-500 font-medium text-sm">
          <Filter className="w-4 h-4" />
          Filtros de Auditoria:
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filtroCategoria}
            onChange={e => setFiltroCategoria(e.target.value)}
            className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as Categorias</option>
            <option value="CLIENTES">Clientes</option>
            <option value="VEICULOS">Veículos</option>
            <option value="PRODUTOS">Produtos / Estoque</option>
            <option value="SERVICOS">Serviços</option>
            <option value="OS">Ordens de Serviço</option>
            <option value="FINANCEIRO">Financeiro</option>
          </select>

          <select
            value={filtroSeveridade}
            onChange={e => setFiltroSeveridade(e.target.value)}
            className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as Severidades</option>
            <option value="ALERTA">Alerta</option>
            <option value="ERRO">Erro</option>
            <option value="FATAL">Fatal</option>
          </select>

          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="IGNORADO">Ignorado</option>
            <option value="RESOLVIDO">Resolvido</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Carregando registros de auditoria...
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-gray-800">Nenhuma incoerência encontrada nos filtros selecionados!</p>
            <p className="text-xs text-gray-400 mt-1">Clique em "Executar Varredura" para atualizar o diagnóstico do banco.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-semibold uppercase text-xs">
                  <th className="py-3 px-4">Severidade</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Mensagem de Ocorrência</th>
                  <th className="py-3 px-4">OSDIG ID / Lemoka ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map(record => (
                  <tr key={record.id} className="hover:bg-gray-50/50 transition">
                    <td className="py-3 px-4">
                      {record.severidade === 'FATAL' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          <AlertOctagon className="w-3.5 h-3.5" /> Fatal
                        </span>
                      )}
                      {record.severidade === 'ERRO' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                          <AlertTriangle className="w-3.5 h-3.5" /> Erro
                        </span>
                      )}
                      {record.severidade === 'ALERTA' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                          <Info className="w-3.5 h-3.5" /> Alerta
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {record.categoria}
                    </td>
                    <td className="py-3 px-4 text-gray-700 max-w-md">
                      <div>{record.mensagem}</div>
                      {record.detalhes && (
                        <details className="mt-1">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:underline">Ver detalhes técnicos</summary>
                          <pre className="text-xs bg-gray-900 text-gray-100 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(record.detalhes, null, 2)}
                          </pre>
                        </details>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-gray-500">
                      {record.osdigId && <div>OSDIG: {record.osdigId}</div>}
                      {record.lemokaId && <div className="text-blue-600">LEMOKA: {record.lemokaId.slice(0, 8)}...</div>}
                    </td>
                    <td className="py-3 px-4">
                      {record.status === 'PENDENTE' && (
                        <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 font-medium">Pendente</span>
                      )}
                      {record.status === 'IGNORADO' && (
                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 font-medium">Ignorado</span>
                      )}
                      {record.status === 'RESOLVIDO' && (
                        <span className="px-2 py-0.5 rounded text-xs bg-emerald-100 text-emerald-800 font-medium">Resolvido</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {record.status !== 'RESOLVIDO' && (
                          <button
                            onClick={() => handleStatusChange(record.id, 'RESOLVIDO')}
                            title="Marcar como Resolvido"
                            className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {record.status !== 'IGNORADO' && (
                          <button
                            onClick={() => handleStatusChange(record.id, 'IGNORADO')}
                            title="Ignorar Alerta"
                            className="p-1 hover:bg-gray-100 text-gray-500 rounded transition"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
