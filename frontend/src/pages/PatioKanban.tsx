import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Search,
  User,
  Car,
  Clock,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  ChevronLeft,
  Filter,
} from 'lucide-react';
import { osService } from '../services/osService';
import { api } from '../services/api';
import { OrdemServico, StatusOS, Mecanico } from '../types';

interface OSWithAtraso extends OrdemServico {
  isAtrasada?: boolean;
}

interface ColumnConfig {
  id: string;
  title: string;
  statuses: StatusOS[];
  color: string;
  borderColor: string;
  badgeBg: string;
}

const KANBAN_COLUMNS: ColumnConfig[] = [
  {
    id: 'col-entrada',
    title: '1. Entrada / Orçamento',
    statuses: ['OPEN', 'AWAITING_APPROVAL'],
    color: 'bg-blue-50/70 text-blue-900',
    borderColor: 'border-blue-200',
    badgeBg: 'bg-blue-600 text-white',
  },
  {
    id: 'col-aprovado',
    title: '2. Aprovado / Diagnóstico',
    statuses: ['APPROVED'],
    color: 'bg-indigo-50/70 text-indigo-900',
    borderColor: 'border-indigo-200',
    badgeBg: 'bg-indigo-600 text-white',
  },
  {
    id: 'col-pecas',
    title: '3. Aguardando Peças',
    statuses: ['AWAITING_PARTS'],
    color: 'bg-amber-50/70 text-amber-900',
    borderColor: 'border-amber-200',
    badgeBg: 'bg-amber-600 text-white',
  },
  {
    id: 'col-manutencao',
    title: '4. Em Manutenção',
    statuses: ['IN_MAINTENANCE'],
    color: 'bg-purple-50/70 text-purple-900',
    borderColor: 'border-purple-200',
    badgeBg: 'bg-purple-600 text-white',
  },
  {
    id: 'col-pronto',
    title: '5. Pronto / Retirada',
    statuses: ['COMPLETED'],
    color: 'bg-teal-50/70 text-teal-900',
    borderColor: 'border-teal-200',
    badgeBg: 'bg-teal-600 text-white',
  },
  {
    id: 'col-finalizado',
    title: '6. Finalizado / Entregue',
    statuses: ['BILLED'],
    color: 'bg-emerald-50/70 text-emerald-900',
    borderColor: 'border-emerald-200',
    badgeBg: 'bg-emerald-600 text-white',
  },
];

export const PatioKanban: React.FC = () => {
  const navigate = useNavigate();

  const [ordens, setOrdens] = useState<OSWithAtraso[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMecanicoId, setSelectedMecanicoId] = useState<string>('ALL');
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);

  const fetchKanban = async () => {
    try {
      setLoading(true);
      const data = await osService.getPatioKanban({
        q: searchTerm,
        mecanicoId: selectedMecanicoId,
      });
      setOrdens(data);
    } catch (error) {
      console.error('Erro ao carregar Pátio Kanban:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKanban();
    api.get('/mecanicos').then((res) => setMecanicos(res.data)).catch(console.error);
  }, [selectedMecanicoId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKanban();
  };

  const handleStatusChange = async (osId: string, newStatus: StatusOS) => {
    try {
      // Atualização otimista na tela
      setOrdens((prev) =>
        prev.map((os) => (os.id === osId ? { ...os, status: newStatus } : os))
      );
      await osService.updateStatusOS(osId, newStatus);
      fetchKanban();
    } catch (error) {
      console.error('Erro ao mudar status da OS:', error);
      alert('Não foi possível alterar a etapa do veículo.');
      fetchKanban();
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Topo do Pátio */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutGrid className="w-7 h-7 text-blue-600" />
            Pátio da Oficina (Kanban Operacional)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Acompanhe o fluxo de manutenção dos veículos em tempo real.
          </p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Buscar por placa, cliente ou nº da OS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedMecanicoId}
            onChange={(e) => setSelectedMecanicoId(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos os Mecânicos</option>
            {mecanicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome} ({m.especialidade})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* QUADRO KANBAN (6 COLUNAS) */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium">Carregando pátio da oficina...</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 min-h-[650px] items-start">
          {KANBAN_COLUMNS.map((col) => {
            const osNaColuna = ordens.filter((os) => col.statuses.includes(os.status));

            return (
              <div
                key={col.id}
                className="w-80 shrink-0 bg-slate-100/70 border border-slate-200 rounded-2xl p-4 space-y-4 flex flex-col max-h-[800px]"
              >
                {/* Header da Coluna */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <h3 className="font-bold text-slate-800 text-sm">{col.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${col.badgeBg}`}>
                    {osNaColuna.length}
                  </span>
                </div>

                {/* Lista de Cards da Coluna */}
                <div className="space-y-3 overflow-y-auto pr-1 flex-1">
                  {osNaColuna.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-xl">
                      Nenhum veículo nesta etapa
                    </div>
                  ) : (
                    osNaColuna.map((os) => (
                      <div
                        key={os.id}
                        onClick={() => navigate(`/ordens-servico/${os.id}`)}
                        className={`bg-white rounded-xl p-4 border shadow-sm hover:shadow-md transition-all cursor-pointer space-y-3 relative ${
                          os.isAtrasada ? 'border-red-400 ring-1 ring-red-400/30' : 'border-slate-200'
                        }`}
                      >
                        {/* Topo do Card: Número OS & Alerta Atraso */}
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-sm text-slate-900">
                            OS #{os.numeroOs}
                          </span>
                          {os.isAtrasada && (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <AlertTriangle className="w-3 h-3 text-red-600" /> Atrasada
                            </span>
                          )}
                        </div>

                        {/* Veículo & Placa */}
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-xs px-2 py-0.5 bg-slate-900 text-white rounded">
                            {os.veiculo?.placa || 'Sem placa'}
                          </span>
                          <span className="font-bold text-slate-800 text-xs truncate">
                            {os.veiculo?.marca} {os.veiculo?.modelo}
                          </span>
                        </div>

                        {/* Cliente */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{os.cliente?.nome}</span>
                        </div>

                        {/* Mecânico Responsável */}
                        {os.mecanico && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-semibold text-slate-700">{os.mecanico.nome}</span>
                          </div>
                        )}

                        {/* Rodapé do Card: Seletor de Status Mobile/Ação Rápida + Valor Total */}
                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center gap-2">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valor</span>
                            <span className="font-extrabold text-slate-900 text-sm">
                              R$ {Number(os.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          <select
                            value={os.status}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => handleStatusChange(os.id, e.target.value as StatusOS)}
                            className="bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold px-2 py-1 text-slate-700 cursor-pointer focus:outline-none max-w-[120px] truncate"
                          >
                            <option value="OPEN">Aberta</option>
                            <option value="AWAITING_APPROVAL">Aguardando Aprov.</option>
                            <option value="APPROVED">Aprovada</option>
                            <option value="AWAITING_PARTS">Ag. Peças</option>
                            <option value="IN_MAINTENANCE">Manutenção</option>
                            <option value="COMPLETED">Pronta</option>
                            <option value="BILLED">Finalizada</option>
                          </select>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
