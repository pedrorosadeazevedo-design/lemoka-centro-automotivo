import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  User,
  Car,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Wrench,
  Package,
  DollarSign,
  ArrowLeft,
  Search,
  CheckCircle,
  Save,
  Printer,
  Share2,
  Copy,
  Check,
  Send,
  ShieldCheck,
  XCircle,
  Globe,
} from 'lucide-react';
import { osService, produtoService, servicoService } from '../services/osService';
import { api } from '../services/api';
import { OrdemServico, StatusOS, Produto, Servico, Mecanico, FragaPeca } from '../types';
import { ConsultaFragaModal } from '../components/ConsultaFragaModal';

export const OrdemServicoDetalhes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [os, setOs] = useState<OrdemServico | null>(null);
  const [loading, setLoading] = useState(true);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [converting, setConverting] = useState(false);
  const [showFragaModal, setShowFragaModal] = useState(false);

  const handleDownloadPDF = async () => {
    if (!os) return;
    try {
      setLoadingPdf(true);
      await osService.downloadOSPDF(os.id, os.numeroOs);
    } catch (error) {
      console.error('Erro ao baixar PDF:', error);
      alert('Erro ao gerar PDF da Ordem de Serviço.');
    } finally {
      setLoadingPdf(false);
    }
  };

  const getPublicLink = () => {
    if (!os?.publicToken) return '';
    return `${window.location.origin}/orcamento/${os.publicToken}`;
  };

  const handleCopyLink = () => {
    const link = getPublicLink();
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const link = getPublicLink();
    if (!link || !os) return;
    const nomeCliente = os.cliente?.nome || 'Cliente';
    const textoMsg = `Olá, ${nomeCliente}! Seu orçamento da Lemoka Centro Automotivo referente ao veículo ${os.veiculo?.marca} ${os.veiculo?.modelo} (Placa ${os.veiculo?.placa}) está disponível para aprovação online:\n\n${link}\n\nAcesse o link para visualizar os valores e aprovar os serviços e peças!`;
    const phone = os.cliente?.telefone?.replace(/\D/g, '') || '';
    const url = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(textoMsg)}` : `https://wa.me/?text=${encodeURIComponent(textoMsg)}`;
    window.open(url, '_blank');
  };

  const handleConverterEmOS = async () => {
    if (!os) return;
    if (!window.confirm('Deseja aprovar este orçamento e convertê-lo em Ordem de Serviço de Execução?')) return;
    try {
      setConverting(true);
      const updated = await osService.converterOrcamentoEmOS(os.id);
      setOs(updated);
      alert('Orçamento convertido em Ordem de Serviço com sucesso!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao converter orçamento.');
    } finally {
      setConverting(false);
    }
  };

  // Estados de Adição/Busca de Peça
  const [showAddProduto, setShowAddProduto] = useState(false);
  const [produtoSearch, setProdutoSearch] = useState('');
  const [produtosCatalogo, setProdutosCatalogo] = useState<Produto[]>([]);
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [customProdDesc, setCustomProdDesc] = useState('');
  const [customProdPreco, setCustomProdPreco] = useState(0);
  const [customProdQtd, setCustomProdQtd] = useState(1);
  const [customProdDescVal, setCustomProdDescVal] = useState(0);

  // Estados de Adição/Busca de Serviço
  const [showAddServico, setShowAddServico] = useState(false);
  const [servicoSearch, setServicoSearch] = useState('');
  const [servicosCatalogo, setServicosCatalogo] = useState<Servico[]>([]);
  const [selectedServico, setSelectedServico] = useState<Servico | null>(null);
  const [customServDesc, setCustomServDesc] = useState('');
  const [customServPreco, setCustomServPreco] = useState(0);
  const [customServQtd, setCustomServQtd] = useState(1);
  const [customServMecanicoId, setCustomServMecanicoId] = useState('');

  // Desconto / Acréscimo Geral
  const [descontoGeral, setDescontoGeral] = useState(0);
  const [acrescimoGeral, setAcrescimoGeral] = useState(0);

  const fetchOS = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await osService.getOrdemServicoById(id);
      setOs(data);
      setDescontoGeral(Number(data.desconto) || 0);
      setAcrescimoGeral(Number(data.acrescimo) || 0);
    } catch (error) {
      console.error('Erro ao carregar OS:', error);
      alert('Ordem de serviço não encontrada.');
      navigate('/ordens-servico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOS();
    api.get('/mecanicos').then((res) => setMecanicos(res.data)).catch(console.error);
  }, [id]);

  // Pesquisar produtos no catálogo
  useEffect(() => {
    if (produtoSearch.trim().length >= 2) {
      produtoService.getProdutos(produtoSearch).then(setProdutosCatalogo).catch(console.error);
    } else {
      setProdutosCatalogo([]);
    }
  }, [produtoSearch]);

  // Pesquisar serviços no catálogo
  useEffect(() => {
    if (servicoSearch.trim().length >= 2) {
      servicoService.getServicos(servicoSearch).then(setServicosCatalogo).catch(console.error);
    } else {
      setServicosCatalogo([]);
    }
  }, [servicoSearch]);

  const handleStatusChange = async (newStatus: StatusOS) => {
    if (!os) return;
    try {
      const updated = await osService.updateStatusOS(os.id, newStatus);
      setOs(updated);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao alterar status');
    }
  };

  const handleAddProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!os) return;
    const desc = selectedProduto ? selectedProduto.descricao : customProdDesc;
    const preco = selectedProduto ? selectedProduto.precoVenda : customProdPreco;

    if (!desc) return alert('Informe a descrição da peça/produto.');

    try {
      const updated = await osService.addItemProduto(os.id, {
        productId: selectedProduto?.id,
        descricao: desc,
        quantidade: customProdQtd,
        precoUnitario: preco,
        desconto: customProdDescVal,
      });
      setOs(updated);
      setShowAddProduto(false);
      setSelectedProduto(null);
      setProdutoSearch('');
      setCustomProdDesc('');
      setCustomProdPreco(0);
      setCustomProdQtd(1);
      setCustomProdDescVal(0);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao adicionar peça à OS.');
    }
  };

  const handleAddServico = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!os) return;
    const desc = selectedServico ? selectedServico.descricao : customServDesc;
    const preco = selectedServico ? selectedServico.precoPadrao : customServPreco;

    if (!desc) return alert('Informe a descrição do serviço.');

    try {
      const updated = await osService.addItemServico(os.id, {
        serviceId: selectedServico?.id,
        descricao: desc,
        mecanicoId: customServMecanicoId || undefined,
        quantidade: customServQtd,
        precoUnitario: preco,
      });
      setOs(updated);
      setShowAddServico(false);
      setSelectedServico(null);
      setServicoSearch('');
      setCustomServDesc('');
      setCustomServPreco(0);
      setCustomServQtd(1);
      setCustomServMecanicoId('');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao adicionar serviço à OS.');
    }
  };

  const handleDeleteItem = async (tipo: 'produto' | 'servico', itemId: string) => {
    if (!os) return;
    if (!window.confirm('Deseja remover este item da Ordem de Serviço?')) return;

    try {
      const updated = await osService.deleteItem(os.id, tipo, itemId);
      setOs(updated);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao remover item.');
    }
  };

  const handleSaveTotaisGerais = async () => {
    if (!os) return;
    try {
      const updated = await osService.updateStatusOS(
        os.id,
        undefined,
        undefined,
        descontoGeral,
        acrescimoGeral
      );
      setOs(updated);
      alert('Totais da OS atualizados com sucesso!');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao salvar totais da OS.');
    }
  };

  if (loading || !os) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium">Carregando Ordem de Serviço...</p>
      </div>
    );
  }

  const isClosed = os.status === 'BILLED' || os.status === 'CANCELLED';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header / Voltar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/ordens-servico')}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Ordem de Serviço #{os.numeroOs}
              </h1>
              <select
                value={os.status}
                onChange={(e) => handleStatusChange(e.target.value as StatusOS)}
                className="px-3 py-1 rounded-full text-xs font-semibold border bg-blue-50 border-blue-200 text-blue-800 cursor-pointer"
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
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Aberta em{' '}
              {new Date(os.dataAbertura).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {os.publicToken && (
            <>
              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all border border-slate-200"
                title="Copiar Link Público do Orçamento"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                {copiedLink ? 'Link Copiado!' : 'Copiar Link Público'}
              </button>

              <button
                onClick={handleShareWhatsApp}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                title="Compartilhar Orçamento via WhatsApp"
              >
                <Send className="w-4 h-4" />
                WhatsApp
              </button>
            </>
          )}

          {os.status !== 'APPROVED' && os.status !== 'IN_MAINTENANCE' && os.status !== 'BILLED' && os.status !== 'CANCELLED' && (
            <button
              onClick={handleConverterEmOS}
              disabled={converting}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {converting ? 'Convertendo...' : 'Aprovar & Converter em OS'}
            </button>
          )}

          <button
            onClick={handleDownloadPDF}
            disabled={loadingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            {loadingPdf ? 'Gerando...' : 'PDF / Imprimir'}
          </button>

          <div className="text-right ml-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">Valor Total da OS</p>
            <h2 className="text-3xl font-extrabold text-slate-900">
              R$ {Number(os.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h2>
          </div>
        </div>
      </div>

      {/* Cards de Cliente e Veículo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-slate-500 font-semibold text-xs uppercase">
            <User className="w-4 h-4 text-blue-600" />
            Dados do Cliente
          </div>
          <h3 className="text-lg font-bold text-slate-900">{os.cliente?.nome}</h3>
          <p className="text-xs text-slate-600">
            Telefone: <span className="font-semibold">{os.cliente?.telefone || 'Não informado'}</span>
          </p>
          <p className="text-xs text-slate-600">
            CPF/CNPJ: <span className="font-semibold">{os.cliente?.documento || 'Não informado'}</span>
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center gap-2 text-slate-500 font-semibold text-xs uppercase">
            <Car className="w-4 h-4 text-blue-600" />
            Veículo Atendido
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-extrabold text-sm px-2.5 py-1 bg-slate-900 text-white rounded">
              {os.veiculo?.placa}
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              {os.veiculo?.marca} {os.veiculo?.modelo}
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            Quilometragem: <span className="font-semibold">{os.veiculo?.quilometragemAtual || 0} KM</span>
          </p>
        </div>
      </div>

      {/* SEÇÃO 1: SERVIÇOS DA OS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-blue-600" />
            Serviços Prestados ({os.servicos?.length || 0})
          </h2>
          {!isClosed && (
            <button
              onClick={() => setShowAddServico(!showAddServico)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> Adicionar Serviço
            </button>
          )}
        </div>

        {/* Form Inline Adicionar Serviço */}
        {showAddServico && (
          <form onSubmit={handleAddServico} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-700">Novo Serviço na OS</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar no catálogo de serviços ou digitar descrição livre..."
                value={servicoSearch}
                onChange={(e) => {
                  setServicoSearch(e.target.value);
                  setCustomServDesc(e.target.value);
                }}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {servicosCatalogo.length > 0 && (
              <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 max-h-36 overflow-y-auto">
                {servicosCatalogo.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedServico(s);
                      setServicoSearch(s.descricao);
                      setCustomServPreco(Number(s.precoPadrao));
                      setServicosCatalogo([]);
                    }}
                    className="p-2 hover:bg-slate-50 cursor-pointer flex justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-800">{s.descricao}</span>
                    <span className="font-bold text-blue-600">R$ {Number(s.precoPadrao).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1">Preço Unitário (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={customServPreco || ''}
                  onChange={(e) => setCustomServPreco(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1">Qtd / Horas</label>
                <input
                  type="number"
                  value={customServQtd}
                  onChange={(e) => setCustomServQtd(Number(e.target.value) || 1)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1">Mecânico Executor</label>
                <select
                  value={customServMecanicoId}
                  onChange={(e) => setCustomServMecanicoId(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700"
                >
                  <option value="">Selecione o Mecânico...</option>
                  {mecanicos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">
                Salvar Serviço
              </button>
              <button
                type="button"
                onClick={() => setShowAddServico(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Tabela de Serviços */}
        {os.servicos && os.servicos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 font-bold uppercase border-b">
                  <th className="py-3 px-4">Descrição do Serviço</th>
                  <th className="py-3 px-4">Mecânico</th>
                  <th className="py-3 px-4 text-center">Qtd</th>
                  <th className="py-3 px-4 text-right">Valor Unit.</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  {!isClosed && <th className="py-3 px-4 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {os.servicos.map((s) => (
                  <tr key={s.id} className={s.aprovado === false ? 'opacity-50 bg-slate-50' : ''}>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        {s.descricao}
                        {s.aprovado === false ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">Recusado pelo cliente</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">Aprovado</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {s.mecanico ? (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-xs font-semibold">
                          <User className="w-3 h-3 text-slate-500" /> {s.mecanico.nome}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Não atribuído</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">{Number(s.quantidade)}</td>
                    <td className="py-3 px-4 text-right">
                      R$ {Number(s.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      R$ {Number(s.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    {!isClosed && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => s.id && handleDeleteItem('servico', s.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Nenhum serviço lançado nesta OS até o momento.</p>
        )}
      </div>

      {/* SEÇÃO 2: PEÇAS E PRODUTOS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Peças e Produtos Aplicados ({os.produtos?.length || 0})
          </h2>
          {!isClosed && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFragaModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors border border-slate-200"
              >
                <Globe className="w-4 h-4 text-blue-600" /> Catálogo Fraga
              </button>

              <button
                onClick={() => setShowAddProduto(!showAddProduto)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition-colors"
              >
                <Plus className="w-4 h-4" /> Adicionar Peça
              </button>
            </div>
          )}
        </div>

        {/* Form Inline Adicionar Peça */}
        {showAddProduto && (
          <form onSubmit={handleAddProduto} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-700">Nova Peça na OS</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar peça por código, OEM ou descrição..."
                value={produtoSearch}
                onChange={(e) => {
                  setProdutoSearch(e.target.value);
                  setCustomProdDesc(e.target.value);
                }}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {produtosCatalogo.length > 0 && (
              <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 max-h-36 overflow-y-auto">
                {produtosCatalogo.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProduto(p);
                      setProdutoSearch(p.descricao);
                      setCustomProdPreco(Number(p.precoVenda));
                      setProdutosCatalogo([]);
                    }}
                    className="p-2 hover:bg-slate-50 cursor-pointer flex justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{p.descricao}</span>
                      <span className="text-slate-400 ml-2">({p.marca || 'Sem marca'})</span>
                    </div>
                    <span className="font-bold text-blue-600">R$ {Number(p.precoVenda).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1">Preço Unitário (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={customProdPreco || ''}
                  onChange={(e) => setCustomProdPreco(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1">Quantidade</label>
                <input
                  type="number"
                  value={customProdQtd}
                  onChange={(e) => setCustomProdQtd(Number(e.target.value) || 1)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 font-semibold mb-1">Desconto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={customProdDescVal || ''}
                  onChange={(e) => setCustomProdDescVal(Number(e.target.value) || 0)}
                  className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">
                Salvar Peça
              </button>
              <button
                type="button"
                onClick={() => setShowAddProduto(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Tabela de Produtos */}
        {os.produtos && os.produtos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 font-bold uppercase border-b">
                  <th className="py-3 px-4">Descrição da Peça</th>
                  <th className="py-3 px-4 text-center">Qtd</th>
                  <th className="py-3 px-4 text-right">Valor Unit.</th>
                  <th className="py-3 px-4 text-right">Desconto</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  {!isClosed && <th className="py-3 px-4 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {os.produtos.map((p) => {
                  const estFisico = Number(p.produto?.estoqueFisico || 0);
                  const estRes = Number(p.produto?.estoqueReservado || 0);
                  const estDisp = estFisico - estRes;

                  return (
                    <tr key={p.id} className={p.aprovado === false ? 'opacity-50 bg-slate-50' : ''}>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{p.descricao}</span>
                          {p.aprovado === false ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 uppercase">Recusado pelo cliente</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">Aprovado</span>
                          )}
                        </div>
                        {p.marca && <span className="text-xs text-slate-400 block">{p.marca}</span>}
                        {p.produto && (
                          <span className="text-[11px] text-slate-500 block mt-0.5 font-semibold">
                            Estoque Atual: {estFisico} | Reservado nesta OS: {p.aprovado !== false && (os.status === 'APPROVED' || os.status === 'IN_MAINTENANCE' || os.status === 'AWAITING_PARTS' || os.status === 'COMPLETED') ? Number(p.quantidade) : 0} | Disponível: {estDisp}
                          </span>
                        )}
                      </td>
                    <td className="py-3 px-4 text-center font-bold">{Number(p.quantidade)}</td>
                    <td className="py-3 px-4 text-right">
                      R$ {Number(p.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right text-red-600">
                      - R$ {Number(p.desconto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      R$ {Number(p.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                      {!isClosed && (
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => p.id && handleDeleteItem('produto', p.id)}
                            className="text-slate-400 hover:text-red-600 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Nenhuma peça ou produto lançado nesta OS.</p>
        )}
      </div>

      {/* PAINEL DE FECHAMENTO FINANCEIRO */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          Resumo Financeiro da OS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Subtotal da OS</span>
            <p className="text-xl font-bold text-slate-800 mt-1">
              R$ {Number(os.subtotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Desconto Geral (R$)
            </label>
            <input
              type="number"
              step="0.01"
              disabled={isClosed}
              value={descontoGeral}
              onChange={(e) => setDescontoGeral(Number(e.target.value) || 0)}
              className="p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-red-600 w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
              Acréscimo Geral (R$)
            </label>
            <input
              type="number"
              step="0.01"
              disabled={isClosed}
              value={acrescimoGeral}
              onChange={(e) => setAcrescimoGeral(Number(e.target.value) || 0)}
              className="p-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-blue-600 w-full"
            />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase">Valor Final Liquidador</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">
              R$ {Number(os.valorTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {!isClosed && (
          <div className="flex justify-end">
            <button
              onClick={handleSaveTotaisGerais}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all"
            >
              <Save className="w-4 h-4" /> Recalcular & Salvar Totais
            </button>
          </div>
        )}
      </div>

      {showFragaModal && (
        <ConsultaFragaModal
          onClose={() => setShowFragaModal(false)}
          veiculoIdContexto={os?.veiculoId}
          osIdContexto={os?.id}
          onSelectPecaForOS={async (peca) => {
            const precoStr = prompt(`Informe o Preço de Venda (R$) para lançar a peça "${peca.descricao}" na OS:`, '0.00');
            if (!precoStr) return;
            const preco = parseFloat(precoStr.replace(',', '.'));
            if (isNaN(preco) || preco <= 0) return alert('Preço de venda inválido.');

            try {
              const updated = await osService.addItemProduto(os.id, {
                descricao: peca.descricao,
                quantidade: 1,
                precoUnitario: preco,
              });
              setOs(updated);
              alert(`Peça "${peca.descricao}" lançada na OS com sucesso!`);
            } catch (err: any) {
              alert(err.response?.data?.error || 'Erro ao lançar peça na OS.');
            }
          }}
        />
      )}
    </div>
  );
};
