import React, { useEffect, useState } from 'react';
import { Package, Plus, Search, DollarSign, Tag, Edit2, ArrowDownLeft, ArrowUpRight, RefreshCw, AlertTriangle, Layers, MapPin, History, XClose, Globe } from 'lucide-react';
import { produtoService, estoqueService } from '../services/osService';
import { Produto, MovimentacaoEstoque } from '../types';
import { ConsultaFragaModal } from '../components/ConsultaFragaModal';

export const Produtos: React.FC = () => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFragaModal, setShowFragaModal] = useState(false);

  // Modal / Form Cadastrar/Editar Produto
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [codigoInterno, setCodigoInterno] = useState('');
  const [codigoOEM, setCodigoOEM] = useState('');
  const [descricao, setDescricao] = useState('');
  const [marca, setMarca] = useState('');
  const [unidade, setUnidade] = useState('UN');
  const [precoCusto, setPrecoCusto] = useState(0);
  const [precoVenda, setPrecoVenda] = useState(0);
  const [estoqueFisico, setEstoqueFisico] = useState(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState(0);
  const [localizacao, setLocalizacao] = useState('');

  // Modal de Movimentação Manual (Entrada / Saída / Ajuste)
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [selectedProdutoMov, setSelectedProdutoMov] = useState<Produto | null>(null);
  const [tipoMov, setTipoMov] = useState<'ENTRADA' | 'SAIDA' | 'AJUSTE'>('ENTRADA');
  const [qtdMov, setQtdMov] = useState(1);
  const [obsMov, setObsMov] = useState('');
  const [submittingMov, setSubmittingMov] = useState(false);

  // Modal de Histórico de Movimentações de um Produto
  const [showHistoricoModal, setShowHistoricoModal] = useState(false);
  const [selectedProdutoHist, setSelectedProdutoHist] = useState<Produto | null>(null);
  const [movimentacoesHist, setMovimentacoesHist] = useState<MovimentacaoEstoque[]>([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const data = await produtoService.getProdutos(searchTerm);
      setProdutos(data);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProdutos();
  };

  const openNewForm = () => {
    setEditingId(null);
    setCodigoInterno('');
    setCodigoOEM('');
    setDescricao('');
    setMarca('');
    setUnidade('UN');
    setPrecoCusto(0);
    setPrecoVenda(0);
    setEstoqueFisico(0);
    setEstoqueMinimo(0);
    setLocalizacao('');
    setShowForm(true);
  };

  const openEditForm = (p: Produto) => {
    setEditingId(p.id);
    setCodigoInterno(p.codigoInterno || '');
    setCodigoOEM(p.codigoOEM || '');
    setDescricao(p.descricao);
    setMarca(p.marca || '');
    setUnidade(p.unidade || 'UN');
    setPrecoCusto(Number(p.precoCusto));
    setPrecoVenda(Number(p.precoVenda));
    setEstoqueFisico(Number(p.estoqueFisico));
    setEstoqueMinimo(Number(p.estoqueMinimo));
    setLocalizacao(p.localizacao || '');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || precoVenda <= 0) return alert('Descrição e Preço de Venda válidos são obrigatórios.');

    try {
      if (editingId) {
        await produtoService.updateProduto(editingId, {
          codigoInterno,
          codigoOEM,
          descricao,
          marca,
          unidade,
          precoCusto,
          precoVenda,
          estoqueFisico,
          estoqueMinimo,
          localizacao,
        });
      } else {
        await produtoService.createProduto({
          codigoInterno,
          codigoOEM,
          descricao,
          marca,
          unidade,
          precoCusto,
          precoVenda,
          estoqueFisico,
          estoqueMinimo,
          localizacao,
        });
      }
      setShowForm(false);
      fetchProdutos();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao salvar produto.');
    }
  };

  const openMovimentacao = (p: Produto) => {
    setSelectedProdutoMov(p);
    setTipoMov('ENTRADA');
    setQtdMov(1);
    setObsMov('');
    setShowMovimentacaoModal(true);
  };

  const handleSaveMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProdutoMov || qtdMov <= 0) return alert('Informe uma quantidade válida.');

    try {
      setSubmittingMov(true);
      await estoqueService.createMovimentacaoManual({
        produtoId: selectedProdutoMov.id,
        tipo: tipoMov,
        quantidade: qtdMov,
        observacao: obsMov,
      });
      setShowMovimentacaoModal(false);
      setSelectedProdutoMov(null);
      fetchProdutos();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao registrar movimentação.');
    } finally {
      setSubmittingMov(false);
    }
  };

  const openHistorico = async (p: Produto) => {
    setSelectedProdutoHist(p);
    setShowHistoricoModal(true);
    try {
      setLoadingHist(true);
      const data = await estoqueService.getMovimentacoes({ produtoId: p.id });
      setMovimentacoesHist(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingHist(false);
    }
  };

  const renderStockBadge = (p: Produto) => {
    const fisico = Number(p.estoqueFisico) || 0;
    const reservado = Number(p.estoqueReservado) || 0;
    const minimo = Number(p.estoqueMinimo) || 0;
    const disponivel = fisico - reservado;

    if (disponivel < 0) {
      return (
        <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 font-extrabold px-2.5 py-1 rounded-full text-xs" title="Estoque Negativo">
          <AlertTriangle className="w-3.5 h-3.5" /> {disponivel} {p.unidade}
        </span>
      );
    }

    if (disponivel <= minimo && minimo > 0) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-full text-xs" title="Estoque Baixo (Mínimo)">
          <AlertTriangle className="w-3.5 h-3.5" /> {disponivel} {p.unidade}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-xs">
        🟢 {disponivel} {p.unidade}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" />
            Gestão de Estoque & Catálogo de Peças
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Controle de estoque físico, unidades reservadas em OS e entradas/saídas operacionais.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFragaModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200"
          >
            <Globe className="w-4 h-4 text-blue-600" />
            Catálogo Online Fraga
          </button>

          <button
            onClick={openNewForm}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Cadastrar Nova Peça
          </button>
        </div>
      </div>

      {/* Form de Cadastro / Edição */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
            {editingId ? 'Editar Peça / Produto' : 'Cadastrar Peça / Produto'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição Comercial *</label>
              <input
                type="text"
                placeholder="Ex: Pastilha de Freio Dianteira"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Código Interno / SKU</label>
              <input
                type="text"
                placeholder="Ex: PAS-001"
                value={codigoInterno}
                onChange={(e) => setCodigoInterno(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Código OEM / Fabricante</label>
              <input
                type="text"
                placeholder="Ex: 5U0698151A"
                value={codigoOEM}
                onChange={(e) => setCodigoOEM(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Marca / Fabricante</label>
              <input
                type="text"
                placeholder="Ex: Fras-le / Cobreq"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Unidade de Medida</label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-700 font-semibold"
              >
                <option value="UN">UN (Unidade)</option>
                <option value="JG">JG (Jogo)</option>
                <option value="KIT">KIT</option>
                <option value="LT">LT (Litro)</option>
                <option value="KG">KG (Quilo)</option>
                <option value="PAR">PAR</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Localização na Prateleira</label>
              <input
                type="text"
                placeholder="Ex: Prat. A3 - Prat. B"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Preço Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={precoCusto || ''}
                onChange={(e) => setPrecoCusto(Number(e.target.value) || 0)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Preço Venda (R$) *</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={precoVenda || ''}
                onChange={(e) => setPrecoVenda(Number(e.target.value) || 0)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Estoque Físico Inicial</label>
              <input
                type="number"
                placeholder="0"
                value={estoqueFisico || ''}
                onChange={(e) => setEstoqueFisico(Number(e.target.value) || 0)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Estoque Mínimo (Alerta)</label>
              <input
                type="number"
                placeholder="0"
                value={estoqueMinimo || ''}
                onChange={(e) => setEstoqueMinimo(Number(e.target.value) || 0)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-amber-700"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md">
              Salvar Peça
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

      {/* Barra de Pesquisa */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Buscar por código, OEM, marca ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </form>
      </div>

      {/* Tabela de Produtos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando estoque...</div>
        ) : produtos.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Nenhuma peça encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
                  <th className="py-3.5 px-4">Código / OEM</th>
                  <th className="py-3.5 px-4">Descrição da Peça</th>
                  <th className="py-3.5 px-4">Marca / Loc.</th>
                  <th className="py-3.5 px-4 text-center">Físico</th>
                  <th className="py-3.5 px-4 text-center">Reservado</th>
                  <th className="py-3.5 px-4 text-center">Disponível</th>
                  <th className="py-3.5 px-4 text-right">Preço Venda</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {produtos.map((p) => {
                  const estFisico = Number(p.estoqueFisico) || 0;
                  const estRes = Number(p.estoqueReservado) || 0;
                  const estDisp = estFisico - estRes;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                        {p.codigoInterno || p.codigoOEM || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{p.descricao}</span>
                        {p.descricaoTecnica && <span className="text-xs text-slate-400 block">{p.descricaoTecnica}</span>}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <span className="font-semibold block">{p.marca || '-'}</span>
                        {p.localizacao && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-400" /> {p.localizacao}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-extrabold text-slate-800">
                        {estFisico} {p.unidade}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-700">
                        {estRes > 0 ? `${estRes} ${p.unidade}` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {renderStockBadge(p)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-emerald-600">
                        R$ {Number(p.precoVenda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openMovimentacao(p)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold transition-all"
                            title="Entrada / Saída Manual"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openHistorico(p)}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all"
                            title="Histórico de Movimentações"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openEditForm(p)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                            title="Editar Cadastro"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Movimentação Manual */}
      {showMovimentacaoModal && selectedProdutoMov && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Ajuste Manual de Estoque</h3>
            <p className="text-xs text-slate-500 mb-4">{selectedProdutoMov.descricao}</p>

            <form onSubmit={handleSaveMovimentacao} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Movimentação</label>
                <select
                  value={tipoMov}
                  onChange={(e) => setTipoMov(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800"
                >
                  <option value="ENTRADA">🟢 ENTRADA (Adicionar ao Físico)</option>
                  <option value="SAIDA">🔴 SAÍDA (Remover do Físico)</option>
                  <option value="AJUSTE">🔵 AJUSTE (Definir Novo Total Físico)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={qtdMov}
                  onChange={(e) => setQtdMov(Number(e.target.value) || 1)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Observação / Justificativa</label>
                <textarea
                  placeholder="Ex: Compra de balcão, peça danificada, balanço..."
                  value={obsMov}
                  onChange={(e) => setObsMov(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingMov}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {submittingMov ? 'Salvando...' : 'Confirmar Movimentação'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMovimentacaoModal(false)}
                  className="px-4 py-2.5 bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Histórico de Movimentações */}
      {showHistoricoModal && selectedProdutoHist && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl p-6 border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Auditoria de Movimentações</h3>
                <p className="text-xs text-slate-500">{selectedProdutoHist.descricao}</p>
              </div>
              <button
                onClick={() => setShowHistoricoModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 py-4">
              {loadingHist ? (
                <p className="text-center text-sm text-slate-500 py-6">Carregando histórico...</p>
              ) : movimentacoesHist.length === 0 ? (
                <p className="text-center text-sm text-slate-400 italic py-6">Nenhuma movimentação registrada para este produto.</p>
              ) : (
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase">
                      <th className="py-2.5 px-3">Data/Hora</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3 text-center">Qtd</th>
                      <th className="py-2.5 px-3 text-center">Antes → Depois</th>
                      <th className="py-2.5 px-3">Origem / Obs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movimentacoesHist.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(m.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-3 font-bold">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            m.tipo === 'ENTRADA' ? 'bg-emerald-100 text-emerald-800' :
                            m.tipo === 'SAIDA' ? 'bg-red-100 text-red-800' :
                            m.tipo === 'RESERVA' ? 'bg-amber-100 text-amber-800' :
                            m.tipo === 'LIBERACAO_RESERVA' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {m.tipo}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">{Number(m.quantidade)}</td>
                        <td className="py-2.5 px-3 text-center text-slate-600 font-mono">
                          {Number(m.estoqueAnterior)} → {Number(m.estoquePosterior)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <span className="font-semibold text-slate-800 block">{m.origem}</span>
                          {m.observacao && <span className="text-[11px] text-slate-400 block">{m.observacao}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {showFragaModal && (
        <ConsultaFragaModal
          onClose={() => {
            setShowFragaModal(false);
            fetchProdutos();
          }}
        />
      )}
    </div>
  );
};
