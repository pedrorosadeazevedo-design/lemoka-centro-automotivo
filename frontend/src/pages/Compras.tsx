import React, { useEffect, useState } from 'react';
import { ShoppingCart, Plus, Search, CheckCircle2, XCircle, FileText, ArrowRight, Truck, Package, Save, AlertCircle } from 'lucide-react';
import { compraService, fornecedorService, produtoService } from '../services/osService';
import { Compra, Fornecedor, Produto, StatusCompra } from '../types';

export const Compras: React.FC = () => {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [produtosCatalogo, setProdutosCatalogo] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Modal / Form de Nova Compra
  const [showForm, setShowForm] = useState(false);
  const [selectedFornecedorId, setSelectedFornecedorId] = useState('');
  const [numeroNotaFiscal, setNumeroNotaFiscal] = useState('');
  const [serieNotaFiscal, setSerieNotaFiscal] = useState('');
  const [chaveAcessoNfe, setChaveAcessoNfe] = useState('');
  const [condicaoPagamento, setCondicaoPagamento] = useState('30_DIAS');
  const [observacoes, setObservacoes] = useState('');

  // Itens da compra em rascunho
  const [itensCompra, setItensCompra] = useState<Array<{
    produtoId: string;
    produto?: Produto;
    codigoFornecedor: string;
    quantidade: number;
    custoUnitario: number;
    subtotal: number;
  }>>([]);

  // Seletor inline de produto para adicionar à compra
  const [produtoSearchText, setProdutoSearchText] = useState('');
  const [selectedProd, setSelectedProd] = useState<Produto | null>(null);
  const [qtdItem, setQtdItem] = useState(1);
  const [custoItem, setCustoItem] = useState(0);
  const [codFornecItem, setCodFornecItem] = useState('');

  // Modal de Detalhes da Compra
  const [selectedCompraDetalhes, setSelectedCompraDetalhes] = useState<Compra | null>(null);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchCompras = async () => {
    try {
      setLoading(true);
      const data = await compraService.getCompras({ status: filterStatus, q: searchTerm });
      setCompras(data);
    } catch (error) {
      console.error('Erro ao carregar compras:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompras();
    fornecedorService.getFornecedores().then(setFornecedores).catch(console.error);
    produtoService.getProdutos().then(setProdutosCatalogo).catch(console.error);
  }, [filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCompras();
  };

  const handleAddItemToForm = () => {
    if (!selectedProd) return alert('Selecione uma peça do catálogo.');
    if (qtdItem <= 0 || custoItem < 0) return alert('Informe quantidade e custo válidos.');

    const sub = qtdItem * custoItem;
    setItensCompra(prev => [
      ...prev,
      {
        produtoId: selectedProd.id,
        produto: selectedProd,
        codigoFornecedor: codFornecItem,
        quantidade: qtdItem,
        custoUnitario: custoItem,
        subtotal: sub,
      },
    ]);

    setSelectedProd(null);
    setProdutoSearchText('');
    setQtdItem(1);
    setCustoItem(0);
    setCodFornecItem('');
  };

  const handleRemoveItemFromForm = (index: number) => {
    setItensCompra(prev => prev.filter((_, i) => i !== index));
  };

  const calcularTotalForm = () => {
    return itensCompra.reduce((acc, item) => acc + item.subtotal, 0);
  };

  const handleSaveCompraRascunho = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFornecedorId) return alert('Selecione o fornecedor.');
    if (itensCompra.length === 0) return alert('Adicione pelo menos um item à compra.');

    try {
      setSubmittingAction(true);
      await compraService.createCompra({
        fornecedorId: selectedFornecedorId,
        numeroNotaFiscal,
        serieNotaFiscal,
        chaveAcessoNfe,
        condicaoPagamento,
        observacoes,
        itens: itensCompra.map(i => ({
          produtoId: i.produtoId,
          codigoFornecedor: i.codigoFornecedor,
          quantidade: i.quantidade,
          custoUnitario: i.custoUnitario,
        })),
      });

      setShowForm(false);
      setItensCompra([]);
      fetchCompras();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao criar rascunho de compra.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleConfirmarCompra = async (compraId: string) => {
    if (!window.confirm('Deseja confirmar esta compra? Esta ação dará entrada imediata das peças no estoque físico e atualizará o custo médio dos produtos.')) return;

    try {
      setSubmittingAction(true);
      await compraService.confirmarCompra(compraId);
      alert('Compra confirmada com sucesso! Peças adicionadas ao estoque.');
      setShowDetalhesModal(false);
      fetchCompras();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao confirmar compra.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCancelarCompra = async (compraId: string) => {
    const motivo = prompt('Informe o motivo do cancelamento da compra:');
    if (motivo === null) return;

    try {
      setSubmittingAction(true);
      await compraService.cancelarCompra(compraId, motivo);
      alert('Compra cancelada com sucesso. Estorno de estoque processado.');
      setShowDetalhesModal(false);
      fetchCompras();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao cancelar compra.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-blue-600" />
            Compras & Entrada de Mercadorias
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registre notas de compra, atualize o custo médio dos produtos e dê entrada no estoque físico.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedFornecedorId('');
            setNumeroNotaFiscal('');
            setSerieNotaFiscal('');
            setChaveAcessoNfe('');
            setObservacoes('');
            setItensCompra([]);
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all"
        >
          <Plus className="w-5 h-5" /> Nova Compra / Entrada
        </button>
      </div>

      {/* Form Nova Compra */}
      {showForm && (
        <form onSubmit={handleSaveCompraRascunho} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-6">
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
            Registrar Nova Compra / Entrada de Nota
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Fornecedor *</label>
              <select
                value={selectedFornecedorId}
                onChange={(e) => setSelectedFornecedorId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800"
              >
                <option value="">Selecione o Fornecedor...</option>
                {fornecedores.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.razaoSocial} ({f.documento || 'Sem doc'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Número da Nota Fiscal</label>
              <input
                type="text"
                placeholder="Ex: 001485"
                value={numeroNotaFiscal}
                onChange={(e) => setNumeroNotaFiscal(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Série da Nota</label>
              <input
                type="text"
                placeholder="Ex: 1"
                value={serieNotaFiscal}
                onChange={(e) => setSerieNotaFiscal(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Condição de Pagamento (Contas a Pagar)</label>
              <select
                value={condicaoPagamento}
                onChange={(e) => setCondicaoPagamento(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-700"
              >
                <option value="A_VISTA">À Vista (PIX / Dinheiro)</option>
                <option value="14_DIAS">14 Dias</option>
                <option value="30_DIAS">30 Dias</option>
                <option value="30_60_DIAS">30 / 60 Dias</option>
                <option value="PARCELADO">Parcelado</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Observações da Compra</label>
              <input
                type="text"
                placeholder="Ex: Entrega realizada via transportadora..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          {/* Lançamento Inline de Itens */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-700">Lançar Itens na Compra</h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-slate-500 font-semibold mb-1">Peça / Produto do Catálogo</label>
                <select
                  value={selectedProd?.id || ''}
                  onChange={(e) => {
                    const p = produtosCatalogo.find(x => x.id === e.target.value);
                    setSelectedProd(p || null);
                    if (p) setCustoItem(Number(p.precoCusto) || 0);
                  }}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800"
                >
                  <option value="">Selecione o produto...</option>
                  {produtosCatalogo.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.descricao} ({p.marca || 'Sem marca'}) - Custo Atual: R$ {Number(p.precoCusto).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1">Qtd Comprada</label>
                <input
                  type="number"
                  min="1"
                  value={qtdItem}
                  onChange={(e) => setQtdItem(Number(e.target.value) || 1)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1">Custo Unit. (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={custoItem || ''}
                  onChange={(e) => setCustoItem(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-blue-600"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddItemToForm}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Incluir Item
                </button>
              </div>
            </div>

            {/* Tabela de Itens Adicionados */}
            {itensCompra.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mt-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-600 border-b">
                      <th className="py-2 px-3">Produto</th>
                      <th className="py-2 px-3 text-center">Qtd</th>
                      <th className="py-2 px-3 text-right">Custo Unit.</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                      <th className="py-2 px-3 text-center">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itensCompra.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-slate-800">{item.produto?.descricao}</td>
                        <td className="py-2 px-3 text-center font-bold">{item.quantidade}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(item.custoUnitario)}</td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>
                        <td className="py-2 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItemFromForm(idx)}
                            className="text-red-500 hover:text-red-700 font-bold"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase">Total da Compra:</span>
              <p className="text-2xl font-black text-slate-900">{formatCurrency(calcularTotalForm())}</p>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submittingAction}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {submittingAction ? 'Salvando...' : 'Salvar Rascunho de Compra'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filtros e Pesquisa */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Pesquisar por fornecedor ou número de nota..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </form>

        <div className="flex gap-2">
          {['ALL', 'RASCUNHO', 'CONFIRMADA', 'CANCELADA'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === st
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st === 'ALL' ? 'Todas' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Compras */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando compras...</div>
        ) : compras.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Nenhuma compra encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
                  <th className="py-3.5 px-4">Compra #</th>
                  <th className="py-3.5 px-4">Fornecedor</th>
                  <th className="py-3.5 px-4">Nota Fiscal</th>
                  <th className="py-3.5 px-4">Data Entrada</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Valor Total</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compras.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      # {String(c.numeroCompra).padStart(4, '0')}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {c.fornecedor?.razaoSocial}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {c.numeroNotaFiscal || 'Sem Nota'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {new Date(c.dataEntrada).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase ${
                        c.status === 'CONFIRMADA' ? 'bg-emerald-100 text-emerald-800' :
                        c.status === 'CANCELADA' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      {formatCurrency(Number(c.valorTotal))}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedCompraDetalhes(c);
                          setShowDetalhesModal(true);
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all"
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detalhes da Compra */}
      {showDetalhesModal && selectedCompraDetalhes && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl p-6 border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">Compra # {String(selectedCompraDetalhes.numeroCompra).padStart(4, '0')}</span>
                <h3 className="text-xl font-black text-slate-900">{selectedCompraDetalhes.fornecedor?.razaoSocial}</h3>
              </div>
              <button
                onClick={() => setShowDetalhesModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="py-4 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
              <div>
                <span className="text-slate-500 font-semibold block">Nota Fiscal</span>
                <span className="font-mono font-bold text-slate-800">{selectedCompraDetalhes.numeroNotaFiscal || 'Sem Nota'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Condição de Pagamento</span>
                <span className="font-bold text-slate-800">{selectedCompraDetalhes.condicaoPagamento || 'A_VISTA'}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Status</span>
                <span className="font-extrabold text-blue-600">{selectedCompraDetalhes.status}</span>
              </div>
            </div>

            {/* Tabela de Itens da Compra */}
            <div className="overflow-y-auto flex-1 py-4">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Itens desta Compra</h4>
              <table className="w-full text-left text-xs divide-y divide-slate-100">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase">
                    <th className="py-2.5 px-3">Peça / Produto</th>
                    <th className="py-2.5 px-3 text-center">Qtd</th>
                    <th className="py-2.5 px-3 text-right">Custo Unit.</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedCompraDetalhes.itens?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{item.produto?.descricao}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{Number(item.quantidade)}</td>
                      <td className="py-2.5 px-3 text-right">{formatCurrency(Number(item.custoUnitario))}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(Number(item.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 font-semibold uppercase block">Valor Total da Compra</span>
                <span className="text-2xl font-black text-emerald-600">{formatCurrency(Number(selectedCompraDetalhes.valorTotal))}</span>
              </div>

              <div className="flex gap-2">
                {selectedCompraDetalhes.status === 'RASCUNHO' && (
                  <button
                    onClick={() => handleConfirmarCompra(selectedCompraDetalhes.id)}
                    disabled={submittingAction}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                  >
                    {submittingAction ? 'Confirmando...' : 'Confirmar & Dar Entrada no Estoque'}
                  </button>
                )}

                {selectedCompraDetalhes.status !== 'CANCELADA' && (
                  <button
                    onClick={() => handleCancelarCompra(selectedCompraDetalhes.id)}
                    disabled={submittingAction}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold text-xs rounded-xl transition-all disabled:opacity-50"
                  >
                    Cancelar / Estornar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
