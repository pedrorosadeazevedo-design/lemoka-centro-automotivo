import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  DollarSign,
  XCircle,
  Car,
  User,
  Calendar,
} from 'lucide-react';
import { osService } from '../services/osService';
import { OrdemServico, StatusOS } from '../types';

const STATUS_CONFIG: Record<
  StatusOS,
  { label: string; bg: string; text: string; icon: React.ReactNode }
> = {
  OPEN: {
    label: 'Aberta',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    icon: <Clock className="w-4 h-4 text-blue-600" />,
  },
  AWAITING_APPROVAL: {
    label: 'Aguardando Aprovação',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
  },
  APPROVED: {
    label: 'Aprovada',
    bg: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-700',
    icon: <CheckCircle2 className="w-4 h-4 text-indigo-600" />,
  },
  IN_MAINTENANCE: {
    label: 'Em Manutenção',
    bg: 'bg-purple-50 border-purple-200',
    text: 'text-purple-700',
    icon: <Wrench className="w-4 h-4 text-purple-600" />,
  },
  AWAITING_PARTS: {
    label: 'Aguardando Peças',
    bg: 'bg-orange-50 border-orange-200',
    text: 'text-orange-700',
    icon: <Clock className="w-4 h-4 text-orange-600" />,
  },
  COMPLETED: {
    label: 'Pronta / Retirada',
    bg: 'bg-teal-50 border-teal-200',
    text: 'text-teal-700',
    icon: <CheckCircle2 className="w-4 h-4 text-teal-600" />,
  },
  BILLED: {
    label: 'Faturada / Encerrada',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    icon: <DollarSign className="w-4 h-4 text-emerald-600" />,
  },
  CANCELLED: {
    label: 'Cancelada',
    bg: 'bg-slate-100 border-slate-300',
    text: 'text-slate-600',
    icon: <XCircle className="w-4 h-4 text-slate-500" />,
  },
};

export const OrdemServicoList: React.FC = () => {
  const navigate = useNavigate();
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchOrdens = async () => {
    try {
      setLoading(true);
      const data = await osService.getOrdensServico({
        q: searchTerm,
        status: statusFilter,
      });
      setOrdens(data);
    } catch (error) {
      console.error('Erro ao carregar Ordens de Serviço:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdens();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrdens();
  };

  const handleStatusChange = async (id: string, newStatus: StatusOS) => {
    try {
      await osService.updateStatusOS(id, newStatus);
      fetchOrdens();
    } catch (error) {
      console.error('Erro ao atualizar status da OS:', error);
      alert('Não foi possível alterar o status da OS.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Ação Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            Ordens de Serviço (OS)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gerencie a abertura, manutenção e encerramento de OS da oficina.
          </p>
        </div>

        <button
          onClick={() => navigate('/ordens-servico/nova')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-all duration-150 hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Nova Ordem de Serviço
        </button>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Buscar por nº da OS, cliente ou placa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <span className="text-xs font-semibold uppercase text-slate-400 whitespace-nowrap">
            Status:
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos os Status</option>
            <option value="OPEN">Aberta</option>
            <option value="AWAITING_APPROVAL">Aguardando Aprovação</option>
            <option value="APPROVED">Aprovada</option>
            <option value="IN_MAINTENANCE">Em Manutenção</option>
            <option value="AWAITING_PARTS">Aguardando Peças</option>
            <option value="COMPLETED">Pronta / Retirada</option>
            <option value="BILLED">Faturada / Encerrada</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Tabela de Resultados */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium">Carregando ordens de serviço...</p>
          </div>
        ) : ordens.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">Nenhuma Ordem de Serviço encontrada</h3>
            <p className="text-sm text-slate-500 mt-1">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Tente alterar os filtros de busca.'
                : 'Abra a primeira Ordem de Serviço para iniciar o fluxo operacional.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">OS Nº</th>
                  <th className="py-4 px-6">Cliente & Contato</th>
                  <th className="py-4 px-6">Veículo / Placa</th>
                  <th className="py-4 px-6">Data Abertura</th>
                  <th className="py-4 px-6">Status Atual</th>
                  <th className="py-4 px-6 text-right">Valor Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {ordens.map((os) => {
                  const statusInfo = STATUS_CONFIG[os.status] || STATUS_CONFIG.OPEN;
                  return (
                    <tr
                      key={os.id}
                      onClick={() => navigate(`/ordens-servico/${os.id}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6 font-bold text-slate-900">
                        #{os.numeroOs}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="font-semibold text-slate-800">{os.cliente?.nome}</p>
                            <p className="text-xs text-slate-500">{os.cliente?.telefone || os.cliente?.documento || 'Sem telefone'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-slate-400" />
                          <div>
                            <span className="inline-block bg-slate-100 text-slate-800 text-xs font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                              {os.veiculo?.placa}
                            </span>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {os.veiculo?.marca} {os.veiculo?.modelo}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(os.dataAbertura).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <select
                          value={os.status}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStatusChange(os.id, e.target.value as StatusOS)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.bg} ${statusInfo.text} cursor-pointer focus:outline-none`}
                        >
                          <option value="OPEN">Aberta</option>
                          <option value="AWAITING_APPROVAL">Aguardando Aprovação</option>
                          <option value="APPROVED">Aprovada</option>
                          <option value="IN_MAINTENANCE">Em Manutenção</option>
                          <option value="AWAITING_PARTS">Aguardando Peças</option>
                          <option value="COMPLETED">Pronta / Retirada</option>
                          <option value="BILLED">Faturada / Encerrada</option>
                          <option value="CANCELLED">Cancelada</option>
                        </select>
                      </td>
                      <td className="py-4 px-6 text-right font-extrabold text-slate-900">
                        R$ {Number(os.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
