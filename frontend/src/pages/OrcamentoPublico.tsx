import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { osService } from '../services/osService';
import { CheckCircle2, XCircle, Wrench, Package, ShieldCheck, Car, Calendar, User, Phone, MapPin, Send } from 'lucide-react';

export const OrcamentoPublico: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [orcamento, setOrcamento] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados locais para guardar intenção do cliente de aprovação/recusa de cada item
  const [statusProdutos, setStatusProdutos] = useState<{ [id: string]: boolean }>({});
  const [statusServicos, setStatusServicos] = useState<{ [id: string]: boolean }>({});
  const [submitting, setSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const carregarOrcamento = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await osService.getOrcamentoPublico(token);
      setOrcamento(data);

      // Preencher mapa inicial de aprovação com o que vem do banco
      const mapProd: { [id: string]: boolean } = {};
      data.produtos?.forEach((p: any) => {
        mapProd[p.id] = p.aprovado !== false;
      });
      setStatusProdutos(mapProd);

      const mapServ: { [id: string]: boolean } = {};
      data.servicos?.forEach((s: any) => {
        mapServ[s.id] = s.aprovado !== false;
      });
      setStatusServicos(mapServ);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Não foi possível carregar o orçamento. Verifique se o link está correto.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarOrcamento();
  }, [token]);

  const toggleProduto = (id: string, aprovar: boolean) => {
    setStatusProdutos(prev => ({ ...prev, [id]: aprovar }));
  };

  const toggleServico = (id: string, aprovar: boolean) => {
    setStatusServicos(prev => ({ ...prev, [id]: aprovar }));
  };

  // Calcular em tempo real o total dos itens selecionados (aprovados) pelo cliente na tela
  const calcularTotaisDinamicos = () => {
    if (!orcamento) return { subtotalServicos: 0, subtotalProdutos: 0, totalGeral: 0 };

    let totalServ = 0;
    orcamento.servicos?.forEach((s: any) => {
      if (statusServicos[s.id]) {
        totalServ += Number(s.subtotal);
      }
    });

    let totalProd = 0;
    orcamento.produtos?.forEach((p: any) => {
      if (statusProdutos[p.id]) {
        totalProd += Number(p.subtotal);
      }
    });

    const subtotal = totalServ + totalProd;
    const desc = Number(orcamento.desconto) || 0;
    const acr = Number(orcamento.acrescimo) || 0;
    const totalGeral = Math.max(0, subtotal - desc + acr);

    return { subtotalServicos: totalServ, subtotalProdutos: totalProd, totalGeral };
  };

  const handleEnviarDecisao = async (acaoFinal: 'SALVAR_DECISOES' | 'APROVAR_TUDO') => {
    if (!token) return;
    try {
      setSubmitting(true);
      setFeedbackMsg(null);

      const decisoesProdutos = Object.entries(statusProdutos).map(([id, aprovado]) => ({ id, aprovado }));
      const decisoesServicos = Object.entries(statusServicos).map(([id, aprovado]) => ({ id, aprovado }));

      await osService.decidirOrcamentoPublico(token, {
        decisoesProdutos,
        decisoesServicos,
        acaoFinal,
      });

      setFeedbackMsg('Sua resposta foi enviada com sucesso para a oficina!');
      await carregarOrcamento();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Erro ao enviar aprovação. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Carregando seu orçamento...</p>
        </div>
      </div>
    );
  }

  if (error || !orcamento) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Orçamento não encontrado</h2>
          <p className="text-slate-500 text-sm mb-6">{error || 'Verifique se o link compartilhado está correto.'}</p>
        </div>
      </div>
    );
  }

  const { empresa, cliente, veiculo, produtos = [], servicos = [] } = orcamento;
  const totais = calcularTotaisDinamicos();
  const osEncerrada = orcamento.status === 'BILLED' || orcamento.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-16 font-sans">
      {/* Cabeçalho Oficina */}
      <header className="bg-slate-900 text-white pt-8 pb-12 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto text-center">
          {empresa?.logoUrl ? (
            <img src={empresa.logoUrl} alt={empresa.nomeFantasia} className="h-16 mx-auto mb-4 object-contain" />
          ) : (
            <div className="inline-flex items-center justify-center bg-blue-600 text-white p-3 rounded-2xl mb-3 shadow-md">
              <Wrench className="w-8 h-8" />
            </div>
          )}
          <h1 className="text-2xl font-black uppercase tracking-wider">{empresa?.nomeFantasia || 'Centro Automotivo'}</h1>
          <p className="text-slate-400 text-xs mt-1 flex items-center justify-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {empresa?.endereco}, {empresa?.numero} - {empresa?.bairro}, {empresa?.cidade}/{empresa?.uf}
          </p>
          {empresa?.whatsapp && (
            <p className="text-slate-400 text-xs mt-1 flex items-center justify-center gap-1">
              <Phone className="w-3.5 h-3.5" /> WhatsApp: {empresa.whatsapp}
            </p>
          )}
        </div>
      </header>

      {/* Cartão Principal */}
      <main className="max-w-2xl mx-auto px-4 -mt-6">
        {/* Banner de Identificação do Orçamento */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200/80 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-4">
            <div>
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Orçamento Digital</span>
              <h2 className="text-2xl font-extrabold text-slate-900"># {String(orcamento.numeroOs).padStart(4, '0')}</h2>
            </div>
            <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase ${
              orcamento.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
              orcamento.status === 'AWAITING_APPROVAL' ? 'bg-amber-100 text-amber-700' :
              'bg-blue-100 text-blue-700'
            }`}>
              {orcamento.status === 'APPROVED' ? 'Aprovado' :
               orcamento.status === 'AWAITING_APPROVAL' ? 'Aguardando Sua Aprovação' :
               orcamento.status === 'OPEN' ? 'Em Orçamento' : orcamento.status}
            </span>
          </div>

          {/* Dados do Cliente e Veículo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 rounded-xl p-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-slate-600 mt-0.5">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Cliente</p>
                <p className="font-bold text-slate-800">{cliente?.nome || 'Não informado'}</p>
                {cliente?.telefone && <p className="text-xs text-slate-600">{cliente.telefone}</p>}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600 mt-0.5">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Veículo</p>
                <p className="font-bold text-slate-800">{veiculo?.marca} {veiculo?.modelo}</p>
                <p className="text-xs font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded inline-block mt-0.5">
                  PLACA: {veiculo?.placa}
                </p>
              </div>
            </div>
          </div>

          {orcamento.observacoes && (
            <div className="mt-4 text-xs text-slate-600 bg-amber-50/60 border border-amber-100 rounded-lg p-3">
              <span className="font-bold text-amber-800">Observações da oficina:</span> {orcamento.observacoes}
            </div>
          )}
        </div>

        {/* Mensagem de Feedback */}
        {feedbackMsg && (
          <div className="bg-emerald-600 text-white rounded-xl p-4 mb-6 text-center font-semibold text-sm shadow-md flex items-center justify-center gap-2 animate-bounce">
            <CheckCircle2 className="w-5 h-5" />
            {feedbackMsg}
          </div>
        )}

        {/* Bloco de Serviços */}
        {servicos.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-200/80 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-900">Serviços Propostos</h3>
            </div>

            <div className="space-y-4">
              {servicos.map((serv: any) => {
                const estaAprovado = statusServicos[serv.id] !== false;
                return (
                  <div
                    key={serv.id}
                    className={`p-4 rounded-xl border transition-all ${
                      estaAprovado
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{serv.descricao}</h4>
                        <p className="text-xs text-slate-500">Qtd: {Number(serv.quantidade)} un × {formatCurrency(Number(serv.precoUnitario))}</p>
                      </div>
                      <span className="font-extrabold text-slate-900 text-base">
                        {formatCurrency(Number(serv.subtotal))}
                      </span>
                    </div>

                    {!osEncerrada && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => toggleServico(serv.id, true)}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            estaAprovado
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-200 text-slate-700 hover:bg-emerald-100 hover:text-emerald-700'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleServico(serv.id, false)}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            !estaAprovado
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-slate-200 text-slate-700 hover:bg-red-100 hover:text-red-700'
                          }`}
                        >
                          <XCircle className="w-4 h-4" /> Recusar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bloco de Peças / Produtos */}
        {produtos.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-200/80 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-bold text-slate-900">Peças e Peças de Reposição</h3>
            </div>

            <div className="space-y-4">
              {produtos.map((prod: any) => {
                const estaAprovado = statusProdutos[prod.id] !== false;
                return (
                  <div
                    key={prod.id}
                    className={`p-4 rounded-xl border transition-all ${
                      estaAprovado
                        ? 'border-emerald-200 bg-emerald-50/30'
                        : 'border-slate-200 bg-slate-50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{prod.descricao}</h4>
                        {prod.marca && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{prod.marca}</span>}
                        <p className="text-xs text-slate-500 mt-1">Qtd: {Number(prod.quantidade)} {prod.unidade || 'UN'} × {formatCurrency(Number(prod.precoUnitario))}</p>
                      </div>
                      <span className="font-extrabold text-slate-900 text-base">
                        {formatCurrency(Number(prod.subtotal))}
                      </span>
                    </div>

                    {!osEncerrada && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => toggleProduto(prod.id, true)}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            estaAprovado
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-200 text-slate-700 hover:bg-emerald-100 hover:text-emerald-700'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleProduto(prod.id, false)}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            !estaAprovado
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'bg-slate-200 text-slate-700 hover:bg-red-100 hover:text-red-700'
                          }`}
                        >
                          <XCircle className="w-4 h-4" /> Recusar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Resumo Financeiro & Botão de Confirmação */}
        <div className="bg-slate-900 text-white rounded-2xl shadow-xl p-6 mb-8 border border-slate-800">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Resumo dos Itens Selecionados</h3>

          <div className="space-y-2 text-sm text-slate-300 border-b border-slate-800 pb-4 mb-4">
            <div className="flex justify-between">
              <span>Subtotal Serviços Aprovados:</span>
              <span className="font-semibold text-white">{formatCurrency(totais.subtotalServicos)}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal Peças Aprovadas:</span>
              <span className="font-semibold text-white">{formatCurrency(totais.subtotalProdutos)}</span>
            </div>

            {Number(orcamento.desconto) > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Desconto Aplicado:</span>
                <span className="font-semibold">- {formatCurrency(Number(orcamento.desconto))}</span>
              </div>
            )}
            {Number(orcamento.acrescimo) > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Acréscimo:</span>
                <span className="font-semibold">+ {formatCurrency(Number(orcamento.acrescimo))}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-6">
            <span className="text-base font-bold text-slate-200">TOTAL DOS ITENS APROVADOS</span>
            <span className="text-3xl font-black text-emerald-400">{formatCurrency(totais.totalGeral)}</span>
          </div>

          {!osEncerrada && (
            <div className="space-y-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleEnviarDecisao('APROVAR_TUDO')}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-base rounded-xl shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 uppercase tracking-wide disabled:opacity-50"
              >
                <ShieldCheck className="w-6 h-6" />
                {submitting ? 'Enviando resposta...' : 'Aprovar Orçamento'}
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleEnviarDecisao('SALVAR_DECISOES')}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700"
              >
                <Send className="w-4 h-4" />
                Enviar Seleção de Itens Modificada
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
