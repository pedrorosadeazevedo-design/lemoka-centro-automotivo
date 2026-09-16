import React, { useEffect, useState } from 'react';
import { Truck, Plus, Search, Building2, Phone, Mail, MapPin, Edit2, History, PackageCheck, DollarSign, Check, X } from 'lucide-react';
import { fornecedorService } from '../services/osService';
import { Fornecedor } from '../types';

export const Fornecedores: React.FC = () => {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal de cadastro/edição
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tipoPessoa, setTipoPessoa] = useState<'PF' | 'PJ'>('PJ');
  const [documento, setDocumento] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [telefone, setTelefone] = useState('');
  const [celular, setCelular] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [contato, setContato] = useState('');
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal de histórico do fornecedor
  const [selectedFornecedorHist, setSelectedFornecedorHist] = useState<any | null>(null);
  const [loadingHist, setLoadingHist] = useState(false);
  const [showHistModal, setShowHistModal] = useState(false);

  const fetchFornecedores = async () => {
    try {
      setLoading(true);
      const data = await fornecedorService.getFornecedores(searchTerm);
      setFornecedores(data);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFornecedores();
  };

  const openNewForm = () => {
    setEditingId(null);
    setTipoPessoa('PJ');
    setDocumento('');
    setRazaoSocial('');
    setNomeFantasia('');
    setInscricaoEstadual('');
    setTelefone('');
    setCelular('');
    setWhatsapp('');
    setEmail('');
    setContato('');
    setCep('');
    setEndereco('');
    setNumero('');
    setComplemento('');
    setBairro('');
    setCidade('');
    setUf('');
    setObservacoes('');
    setShowForm(true);
  };

  const openEditForm = (f: Fornecedor) => {
    setEditingId(f.id);
    setTipoPessoa(f.tipoPessoa || 'PJ');
    setDocumento(f.documento || '');
    setRazaoSocial(f.razaoSocial);
    setNomeFantasia(f.nomeFantasia || '');
    setInscricaoEstadual(f.inscricaoEstadual || '');
    setTelefone(f.telefone || '');
    setCelular(f.celular || '');
    setWhatsapp(f.whatsapp || '');
    setEmail(f.email || '');
    setContato(f.contato || '');
    setCep(f.cep || '');
    setEndereco(f.endereco || '');
    setNumero(f.numero || '');
    setComplemento(f.complemento || '');
    setBairro(f.bairro || '');
    setCidade(f.cidade || '');
    setUf(f.uf || '');
    setObservacoes(f.observacoes || '');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!razaoSocial.trim()) return alert('Razão Social / Nome é obrigatório.');

    try {
      setSubmitting(true);
      const payload = {
        tipoPessoa,
        documento,
        razaoSocial,
        nomeFantasia,
        inscricaoEstadual,
        telefone,
        celular,
        whatsapp,
        email,
        contato,
        cep,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        observacoes,
      };

      if (editingId) {
        await fornecedorService.updateFornecedor(editingId, payload);
      } else {
        await fornecedorService.createFornecedor(payload);
      }

      setShowForm(false);
      fetchFornecedores();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao salvar fornecedor.');
    } finally {
      setSubmitting(false);
    }
  };

  const openHistoricoModal = async (f: Fornecedor) => {
    setShowHistModal(true);
    try {
      setLoadingHist(true);
      const data = await fornecedorService.getFornecedorById(f.id);
      setSelectedFornecedorHist(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHist(false);
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
            <Truck className="w-7 h-7 text-blue-600" />
            Gestão de Fornecedores
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre distribuidores, peças de fornecedores e consulte o histórico de compras.
          </p>
        </div>

        <button
          onClick={openNewForm}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all"
        >
          <Plus className="w-5 h-5" /> Cadastrar Fornecedor
        </button>
      </div>

      {/* Form Cadastro / Edição */}
      {showForm && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md space-y-4">
          <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
            {editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo de Pessoa</label>
              <select
                value={tipoPessoa}
                onChange={(e) => setTipoPessoa(e.target.value as any)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
              >
                <option value="PJ">Pessoa Jurídica (CNPJ)</option>
                <option value="PF">Pessoa Física (CPF)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Razão Social / Nome *</label>
              <input
                type="text"
                placeholder="Ex: Distribuidora de Auto Peças LTDA"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome Fantasia</label>
              <input
                type="text"
                placeholder="Ex: ABC Autopeças"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{tipoPessoa === 'PJ' ? 'CNPJ' : 'CPF'}</label>
              <input
                type="text"
                placeholder="00.000.000/0001-00"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Telefone Fixo</label>
              <input
                type="text"
                placeholder="(21) 2222-3333"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">WhatsApp / Celular</label>
              <input
                type="text"
                placeholder="(21) 99999-8888"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">E-mail Comercial</label>
              <input
                type="email"
                placeholder="vendas@fornecedor.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Pessoa de Contato / Vendedor</label>
              <input
                type="text"
                placeholder="Ex: Carlos (Vendedor)"
                value={contato}
                onChange={(e) => setContato(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Endereço Completo</label>
              <input
                type="text"
                placeholder="Rua, Número, Bairro, Cidade/UF"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Observações Internas</label>
              <input
                type="text"
                placeholder="Ex: Prazo padrão 30 dias, faturamento mínimo..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : 'Salvar Fornecedor'}
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

      {/* Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <input
            type="text"
            placeholder="Buscar fornecedor por razão social, CNPJ ou fone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        </form>
      </div>

      {/* Tabela de Fornecedores */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando fornecedores...</div>
        ) : fornecedores.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Nenhum fornecedor cadastrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-500 uppercase border-b">
                  <th className="py-3.5 px-4">Razão Social / Nome</th>
                  <th className="py-3.5 px-4">CNPJ / CPF</th>
                  <th className="py-3.5 px-4">Contato / Fone</th>
                  <th className="py-3.5 px-4 text-center">Compras</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fornecedores.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{f.razaoSocial}</span>
                      {f.nomeFantasia && <span className="text-xs text-slate-500 block">{f.nomeFantasia}</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {f.documento || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <span className="font-semibold block">{f.contato || 'Sem contato'}</span>
                      <span className="text-slate-500">{f.whatsapp || f.telefone || f.email || '-'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-blue-600">
                      {(f as any)._count?.compras || 0}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openHistoricoModal(f)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all"
                          title="Ver Histórico de Compras"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditForm(f)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                          title="Editar Cadastro"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Histórico do Fornecedor */}
      {showHistModal && selectedFornecedorHist && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white max-w-3xl w-full rounded-2xl shadow-2xl p-6 border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedFornecedorHist.razaoSocial}</h3>
                <p className="text-xs text-slate-500">CNPJ/CPF: {selectedFornecedorHist.documento || 'Não informado'}</p>
              </div>
              <button
                onClick={() => setShowHistModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="py-4 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-slate-50 p-3 rounded-xl">
              <div>
                <span className="text-slate-500 font-semibold block">Total Comprado</span>
                <span className="text-base font-extrabold text-emerald-600">{formatCurrency(selectedFornecedorHist.totalComprado)}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Compras Confirmadas</span>
                <span className="text-base font-bold text-slate-800">{selectedFornecedorHist.totalComprasRealizadas}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block">Última Compra</span>
                <span className="text-sm font-semibold text-slate-700">
                  {selectedFornecedorHist.ultimaCompra ? new Date(selectedFornecedorHist.ultimaCompra).toLocaleDateString('pt-BR') : 'Nenhuma'}
                </span>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 py-4">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Compras Realizadas</h4>
              {loadingHist ? (
                <p className="text-center text-sm text-slate-500 py-6">Carregando compras...</p>
              ) : selectedFornecedorHist.compras?.length === 0 ? (
                <p className="text-center text-sm text-slate-400 italic py-6">Nenhuma compra cadastrada para este fornecedor.</p>
              ) : (
                <table className="w-full text-left text-xs divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase">
                      <th className="py-2.5 px-3">Compra #</th>
                      <th className="py-2.5 px-3">NF / Série</th>
                      <th className="py-2.5 px-3">Data Entrada</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedFornecedorHist.compras.map((c: any) => (
                      <tr key={c.id}>
                        <td className="py-2.5 px-3 font-bold text-slate-900"># {String(c.numeroCompra).padStart(4, '0')}</td>
                        <td className="py-2.5 px-3 text-slate-600 font-mono">{c.numeroNotaFiscal || 'S/N'}</td>
                        <td className="py-2.5 px-3 text-slate-600">{new Date(c.dataEntrada).toLocaleDateString('pt-BR')}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.status === 'CONFIRMADA' ? 'bg-emerald-100 text-emerald-800' :
                            c.status === 'CANCELADA' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">{formatCurrency(Number(c.valorTotal))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
