import React, { useState, useEffect } from 'react';
import { Search, Car, Globe, Plus, Check, Info, AlertTriangle, ArrowRight, ShieldAlert, PackageCheck } from 'lucide-react';
import { fragaService, osService } from '../services/osService';
import { FragaPeca, Vehicle } from '../types';

interface ConsultaFragaModalProps {
  onClose: () => void;
  veiculoIdContexto?: string; // Se aberto dentro de uma OS, passa os dados do veículo da OS
  osIdContexto?: string;
  onSelectPecaForOS?: (peca: FragaPeca) => void;
}

export const ConsultaFragaModal: React.FC<ConsultaFragaModalProps> = ({
  onClose,
  veiculoIdContexto,
  osIdContexto,
  onSelectPecaForOS,
}) => {
  const [activeTab, setActiveTab] = useState<'BUSCA_LIVRE' | 'POR_VEICULO'>('POR_VEICULO');

  // Filtros de busca
  const [searchTerm, setSearchTerm] = useState('');
  const [marcaVeiculo, setMarcaVeiculo] = useState('');
  const [modeloVeiculo, setModeloVeiculo] = useState('');
  const [versaoVeiculo, setVersaoVeiculo] = useState('');
  const [anoVeiculo, setAnoVeiculo] = useState<number | undefined>(undefined);

  // Estados de resultado
  const [loading, setLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [pecasResult, setPecasResult] = useState<FragaPeca[]>([]);
  const [selectedPecaDetalhes, setSelectedPecaDetalhes] = useState<FragaPeca | null>(null);

  // Modal de importação local
  const [importingPeca, setImportingPeca] = useState<FragaPeca | null>(null);
  const [precoVendaImport, setPrecoVendaImport] = useState<number>(0);
  const [precoCustoImport, setPrecoCustoImport] = useState<number>(0);
  const [estoqueFisicoImport, setEstoqueFisicoImport] = useState<number>(0);
  const [submittingImport, setSubmittingImport] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Se veículo de contexto foi passado
  useEffect(() => {
    if (veiculoIdContexto) {
      osService.getPatioKanban().then(osList => {
        const found = osList.find(o => o.veiculoId === veiculoIdContexto)?.veiculo;
        if (found) {
          setMarcaVeiculo(found.marca || '');
          setModeloVeiculo(found.modelo || '');
          if (found.anoModelo) setAnoVeiculo(found.anoModelo);
        }
      }).catch(console.error);
    }
  }, [veiculoIdContexto]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    try {
      setLoading(true);
      setImportSuccessMsg(null);
      const res = await fragaService.buscarPecasOnline({
        q: activeTab === 'BUSCA_LIVRE' ? searchTerm : undefined,
        marcaVeiculo: activeTab === 'POR_VEICULO' ? marcaVeiculo : undefined,
        modeloVeiculo: activeTab === 'POR_VEICULO' ? modeloVeiculo : undefined,
        versaoVeiculo: activeTab === 'POR_VEICULO' ? versaoVeiculo : undefined,
        anoVeiculo: activeTab === 'POR_VEICULO' ? anoVeiculo : undefined,
      });

      setIsConfigured(res.configured);
      setConfigMessage(res.message || null);
      setPecasResult(res.data || []);
    } catch (err: any) {
      console.error(err);
      setIsConfigured(true);
      setConfigMessage('Erro de conexão ao consultar catálogo Fraga.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenImport = (peca: FragaPeca) => {
    setImportingPeca(peca);
    setPrecoVendaImport(0);
    setPrecoCustoImport(0);
    setEstoqueFisicoImport(0);
  };

  const handleConfirmImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importingPeca) return;
    if (precoVendaImport <= 0) return alert('Informe um preço de venda válido.');

    try {
      setSubmittingImport(true);
      await fragaService.importarPecaParaCatalogoLocal({
        fragaPecaId: importingPeca.id,
        descricao: importingPeca.descricao,
        marca: importingPeca.marca,
        codigoFraga: importingPeca.codigoFraga,
        codigoFabricante: importingPeca.codigoFabricante,
        codigoOEM: importingPeca.codigoOEM,
        categoria: importingPeca.categoria,
        unidade: importingPeca.unidade,
        precoVenda: precoVendaImport,
        precoCusto: precoCustoImport,
        estoqueFisico: estoqueFisicoImport,
      });

      setImportSuccessMsg(`Peça "${importingPeca.descricao}" importada para o estoque local com sucesso!`);
      setImportingPeca(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Erro ao importar peça.');
    } finally {
      setSubmittingImport(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-4xl w-full rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl text-white">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">Catálogo Online Fraga</h2>
                <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-blue-500/30 text-blue-300 border border-blue-400/30 rounded-full">
                  Integração Externa
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulte equivalências, aplicações e importação para o estoque da oficina.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            ✕
          </button>
        </div>

        {/* Abas e Filtros */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex gap-2 mb-4 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab('POR_VEICULO')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'POR_VEICULO'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Car className="w-4 h-4" /> Buscar por Veículo
            </button>
            <button
              onClick={() => setActiveTab('BUSCA_LIVRE')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                activeTab === 'BUSCA_LIVRE'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Search className="w-4 h-4" /> Busca Livre por Código / Peça
            </button>
          </div>

          {/* Form por Veículo */}
          {activeTab === 'POR_VEICULO' && (
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Marca (Ex: Chevrolet)"
                value={marcaVeiculo}
                onChange={(e) => setMarcaVeiculo(e.target.value)}
                className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
              />
              <input
                type="text"
                placeholder="Modelo (Ex: Onix)"
                value={modeloVeiculo}
                onChange={(e) => setModeloVeiculo(e.target.value)}
                className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
              />
              <input
                type="number"
                placeholder="Ano (Ex: 2020)"
                value={anoVeiculo || ''}
                onChange={(e) => setAnoVeiculo(Number(e.target.value) || undefined)}
                className="p-2.5 bg-white border border-slate-300 rounded-xl text-xs"
              />
              <button
                type="submit"
                className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Search className="w-4 h-4" /> Consultar Peças
              </button>
            </form>
          )}

          {/* Form por Texto Livre */}
          {activeTab === 'BUSCA_LIVRE' && (
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Digite código Fraga, código do fabricante, OEM ou descrição da peça..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <Search className="w-4 h-4" /> Buscar
              </button>
            </form>
          )}
        </div>

        {/* Mensagens de Sucesso / Alertas de Integração */}
        {importSuccessMsg && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-600" />
            {importSuccessMsg}
          </div>
        )}

        {/* Área Principal de Resultados */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-semibold text-slate-600">Consultando catálogo online Fraga...</p>
            </div>
          ) : isConfigured === false ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center max-w-lg mx-auto my-6">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-amber-900 mb-1">Integração Fraga Não Configurada</h3>
              <p className="text-xs text-amber-800 leading-relaxed mb-4">
                {configMessage || 'As chaves de API da Fraga não foram detectadas no servidor. O sistema não exibe resultados falsos.'}
              </p>
              <div className="text-left bg-white p-3 rounded-xl border border-amber-200/60 font-mono text-[11px] text-slate-600">
                <p className="font-bold text-slate-800 mb-1">Configuração no backend (.env):</p>
                <p>FRAGA_API_URL=https://api.fraga.com.br/v1</p>
                <p>FRAGA_API_TOKEN=sua_chave_oficial_licenciada</p>
              </div>
            </div>
          ) : pecasResult.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              {isConfigured === null
                ? 'Selecione um veículo ou digite um termo para iniciar a busca online.'
                : 'Nenhuma peça encontrada no catálogo Fraga para os filtros informados.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pecasResult.map((peca) => (
                <div
                  key={peca.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                        FRAGA # {peca.codigoFraga || peca.id}
                      </span>
                      {peca.marca && (
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {peca.marca}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm mb-1">{peca.descricao}</h4>

                    <div className="text-xs text-slate-500 space-y-1 mb-3">
                      {peca.codigoFabricante && (
                        <p>Ref. Fabricante: <span className="font-mono font-semibold text-slate-700">{peca.codigoFabricante}</span></p>
                      )}
                      {peca.codigoOEM && (
                        <p>OEM: <span className="font-mono font-semibold text-slate-700">{peca.codigoOEM}</span></p>
                      )}
                    </div>

                    {/* Aplicações resumidas */}
                    {peca.aplicacoes && peca.aplicacoes.length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] text-slate-600 mb-4 border border-slate-100">
                        <span className="font-bold text-slate-800 block mb-1">Aplicações Compatíveis:</span>
                        <ul className="space-y-0.5 max-h-20 overflow-y-auto">
                          {peca.aplicacoes.map((app, idx) => (
                            <li key={idx} className="flex items-center gap-1">
                              • {app.marca} {app.modelo} {app.versao || ''} {app.anoInicio ? `(${app.anoInicio}-${app.anoFim || 'Atual'})` : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-2">
                    <button
                      onClick={() => handleOpenImport(peca)}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar ao Estoque Local
                    </button>

                    {onSelectPecaForOS && (
                      <button
                        onClick={() => {
                          onSelectPecaForOS(peca);
                          onClose();
                        }}
                        className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        Lançar na OS
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Inline para Definir Preço de Venda ao Importar Peça para o Estoque Local */}
      {importingPeca && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1">Importar Peça para Estoque Local</h3>
            <p className="text-xs font-semibold text-blue-600 mb-4">{importingPeca.descricao}</p>

            <form onSubmit={handleConfirmImport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Preço de Venda da Oficina (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={precoVendaImport || ''}
                  onChange={(e) => setPrecoVendaImport(Number(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Preço de Custo (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={precoCustoImport || ''}
                  onChange={(e) => setPrecoCustoImport(Number(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Estoque Físico Inicial</label>
                <input
                  type="number"
                  placeholder="0"
                  value={estoqueFisicoImport || ''}
                  onChange={(e) => setEstoqueFisicoImport(Number(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingImport}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {submittingImport ? 'Importando...' : 'Confirmar Importação'}
                </button>
                <button
                  type="button"
                  onClick={() => setImportingPeca(null)}
                  className="px-4 py-2.5 bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
