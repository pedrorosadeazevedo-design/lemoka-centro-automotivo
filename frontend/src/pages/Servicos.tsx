import React, { useEffect, useState } from 'react';
import { Wrench, Plus, Search } from 'lucide-react';
import { servicoService } from '../services/osService';
import { Servico } from '../types';

export const Servicos: React.FC = () => {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [precoPadrao, setPrecoPadrao] = useState(0);
  const [tempoEstimado, setTempoEstimado] = useState(60);

  const fetchServicos = async () => {
    try {
      setLoading(true);
      const data = await servicoService.getServicos(searchTerm);
      setServicos(data);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicos();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || precoPadrao <= 0) return alert('Descrição e Preço Padrão são obrigatórios.');

    try {
      if (editingId) {
        await servicoService.updateServico(editingId, {
          codigo,
          descricao,
          precoPadrao,
          tempoEstimadoMinutos: tempoEstimado,
        });
      } else {
        await servicoService.createServico({
          codigo,
          descricao,
          precoPadrao,
          tempoEstimadoMinutos: tempoEstimado,
        });
      }
      setShowForm(false);
      setEditingId(null);
      setCodigo('');
      setDescricao('');
      setPrecoPadrao(0);
      fetchServicos();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao salvar serviço.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="w-7 h-7 text-blue-600" />
            Catálogo de Serviços da Oficina
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre os serviços e valores padrão de mão de obra prestados na oficina.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-md transition-all"
        >
          <Plus className="w-5 h-5" /> Cadastrar Serviço
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800">
            {editingId ? 'Editar Serviço' : 'Novo Serviço'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Descrição do Serviço *"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm"
            />
            <input
              type="text"
              placeholder="Código Interno"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Preço Padrão (R$) *"
              value={precoPadrao || ''}
              onChange={(e) => setPrecoPadrao(Number(e.target.value) || 0)}
              className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-blue-600"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md">
              Salvar Serviço
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando catálogo...</div>
        ) : servicos.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Nenhum serviço cadastrado.</div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
                <th className="py-3.5 px-6">Código</th>
                <th className="py-3.5 px-6">Descrição</th>
                <th className="py-3.5 px-6 text-right">Preço Padrão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {servicos.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80">
                  <td className="py-3.5 px-6 font-mono text-xs text-slate-600">{s.codigo || '-'}</td>
                  <td className="py-3.5 px-6 font-semibold text-slate-800">{s.descricao}</td>
                  <td className="py-3.5 px-6 text-right font-bold text-blue-600">
                    R$ {Number(s.precoPadrao).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
