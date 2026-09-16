import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  User,
  Car,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  CheckCircle,
  Wrench,
  Search,
} from 'lucide-react';
import { clienteService, veiculoService, osService } from '../services/osService';
import { api } from '../services/api';
import { Cliente, Vehicle, Mecanico } from '../types';

export const NovaOrdemServico: React.FC = () => {
  const navigate = useNavigate();

  // Estados de busca/seleção de cliente
  const [clientSearch, setClientSearch] = useState('');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  // Form de novo cliente
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientDoc, setNewClientDoc] = useState('');

  // Estados de busca/seleção de veículo
  const [veiculos, setVeiculos] = useState<Vehicle[]>([]);
  const [selectedVeiculo, setSelectedVeiculo] = useState<Vehicle | null>(null);
  const [showNewVehicleForm, setShowNewVehicleForm] = useState(false);

  // Form de novo veículo
  const [newPlaca, setNewPlaca] = useState('');
  const [newMarca, setNewMarca] = useState('');
  const [newModelo, setNewModelo] = useState('');

  // Mecânicos
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [selectedMecanicoId, setSelectedMecanicoId] = useState('');

  // Itens de serviços e produtos
  const [servicos, setServicos] = useState<
    Array<{ descricao: string; precoUnitario: number; quantidade: number }>
  >([{ descricao: '', precoUnitario: 0, quantidade: 1 }]);

  const [produtos, setProdutos] = useState<
    Array<{ descricao: string; precoUnitario: number; quantidade: number }>
  >([]);

  const [observacoes, setObservacoes] = useState('');
  const [loadingSave, setLoadingSave] = useState(false);

  useEffect(() => {
    // Carregar mecânicos
    api.get('/mecanicos').then((res) => setMecanicos(res.data)).catch(console.error);
  }, []);

  // Buscar clientes ao digitar
  useEffect(() => {
    if (clientSearch.trim().length >= 2) {
      clienteService.getClientes(clientSearch).then(setClientes).catch(console.error);
    } else {
      setClientes([]);
    }
  }, [clientSearch]);

  // Carregar veículos do cliente selecionado
  useEffect(() => {
    if (selectedCliente) {
      veiculoService.getVeiculos(undefined, selectedCliente.id).then((data) => {
        setVeiculos(data);
        if (data.length > 0) {
          setSelectedVeiculo(data[0]);
        } else {
          setSelectedVeiculo(null);
          setShowNewVehicleForm(true);
        }
      });
    } else {
      setVeiculos([]);
      setSelectedVeiculo(null);
    }
  }, [selectedCliente]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName) return alert('Nome do cliente é obrigatório.');

    try {
      const clienteCriado = await clienteService.createCliente({
        nome: newClientName,
        telefone: newClientPhone,
        documento: newClientDoc,
      });
      setSelectedCliente(clienteCriado);
      setShowNewClientForm(false);
      setNewClientName('');
      setNewClientPhone('');
      setNewClientDoc('');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao cadastrar cliente');
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return alert('Selecione um cliente primeiro.');
    if (!newPlaca || !newMarca || !newModelo) return alert('Preencha placa, marca e modelo.');

    try {
      const veiculoCriado = await veiculoService.createVeiculo({
        clienteId: selectedCliente.id,
        placa: newPlaca,
        marca: newMarca,
        modelo: newModelo,
      });
      setVeiculos([...veiculos, veiculoCriado]);
      setSelectedVeiculo(veiculoCriado);
      setShowNewVehicleForm(false);
      setNewPlaca('');
      setNewMarca('');
      setNewModelo('');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Erro ao cadastrar veículo');
    }
  };

  const addServico = () => {
    setServicos([...servicos, { descricao: '', precoUnitario: 0, quantidade: 1 }]);
  };

  const removeServico = (index: number) => {
    setServicos(servicos.filter((_, i) => i !== index));
  };

  const addProduto = () => {
    setProdutos([...produtos, { descricao: '', precoUnitario: 0, quantidade: 1 }]);
  };

  const removeProduto = (index: number) => {
    setProdutos(produtos.filter((_, i) => i !== index));
  };

  const totalServicos = servicos.reduce(
    (acc, item) => acc + (item.quantidade * item.precoUnitario || 0),
    0
  );
  const totalProdutos = produtos.reduce(
    (acc, item) => acc + (item.quantidade * item.precoUnitario || 0),
    0
  );
  const totalOS = totalServicos + totalProdutos;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCliente) return alert('Selecione ou cadastre um cliente.');
    if (!selectedVeiculo) return alert('Selecione ou cadastre um veículo.');

    try {
      setLoadingSave(true);
      const servicosValidos = servicos.filter((s) => s.descricao.trim() !== '');
      const produtosValidos = produtos.filter((p) => p.descricao.trim() !== '');

      const novaOS = await osService.createOrdemServico({
        clienteId: selectedCliente.id,
        veiculoId: selectedVeiculo.id,
        mecanicoId: selectedMecanicoId || undefined,
        observacoes,
        servicos: servicosValidos,
        produtos: produtosValidos,
      });

      alert(`Ordem de Serviço #${novaOS.numeroOs} aberta com sucesso!`);
      navigate('/ordens-servico');
    } catch (error: any) {
      console.error('Erro ao abrir OS:', error);
      alert(error.response?.data?.error || 'Não foi possível abrir a Ordem de Serviço.');
    } finally {
      setLoadingSave(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Topo / Voltar */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/ordens-servico')}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Abertura de Nova Ordem de Serviço
          </h1>
          <p className="text-sm text-slate-500">
            Selecione o cliente, veículo e insira os serviços/peças iniciais.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bloco 1: Seleção de Cliente */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            1. Dados do Cliente
          </h2>

          {selectedCliente ? (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <div>
                <p className="font-bold text-blue-900 text-base">{selectedCliente.nome}</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Tel: {selectedCliente.telefone || 'Não informado'} | Doc:{' '}
                  {selectedCliente.documento || 'Não informado'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCliente(null)}
                className="text-xs text-blue-700 hover:underline font-semibold"
              >
                Trocar Cliente
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Pesquisar cliente por nome, telefone ou CPF/CNPJ..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
              </div>

              {clientes.length > 0 && (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {clientes.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCliente(c)}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{c.nome}</p>
                        <p className="text-xs text-slate-500">{c.telefone || c.documento}</p>
                      </div>
                      <span className="text-xs text-blue-600 font-medium">Selecionar &rarr;</span>
                    </div>
                  ))}
                </div>
              )}

              {!showNewClientForm ? (
                <button
                  type="button"
                  onClick={() => setShowNewClientForm(true)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Cadastrar novo cliente rapidamente
                </button>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold uppercase text-slate-600">Cadastro Rápido de Cliente</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      placeholder="Nome Completo *"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Telefone / WhatsApp"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="CPF / CNPJ"
                      value={newClientDoc}
                      onChange={(e) => setNewClientDoc(e.target.value)}
                      className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateClient}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                    >
                      Salvar Cliente
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewClientForm(false)}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bloco 2: Seleção de Veículo */}
        {selectedCliente && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              2. Veículo do Cliente
            </h2>

            {veiculos.length > 0 && !showNewVehicleForm && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {veiculos.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVeiculo(v)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      selectedVeiculo?.id === v.id
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-extrabold text-sm px-2.5 py-1 bg-slate-900 text-white rounded">
                        {v.placa}
                      </span>
                      {selectedVeiculo?.id === v.id && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <p className="font-bold text-slate-800 mt-2">
                      {v.marca} {v.modelo}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {!showNewVehicleForm ? (
              <button
                type="button"
                onClick={() => setShowNewVehicleForm(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Cadastrar novo veículo para este cliente
              </button>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-600">Novo Veículo</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Placa (ex: ABC1D23) *"
                    value={newPlaca}
                    onChange={(e) => setNewPlaca(e.target.value.toUpperCase())}
                    className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm uppercase"
                  />
                  <input
                    type="text"
                    placeholder="Marca (ex: Honda) *"
                    value={newMarca}
                    onChange={(e) => setNewMarca(e.target.value)}
                    className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Modelo (ex: Civic 2.0) *"
                    value={newModelo}
                    onChange={(e) => setNewModelo(e.target.value)}
                    className="p-2.5 bg-white border border-slate-300 rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCreateVehicle}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
                  >
                    Salvar Veículo
                  </button>
                  {veiculos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowNewVehicleForm(false)}
                      className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bloco 3: Serviços e Mão de Obra */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              3. Serviços / Mão de Obra
            </h2>
            <select
              value={selectedMecanicoId}
              onChange={(e) => setSelectedMecanicoId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold p-2 text-slate-700"
            >
              <option value="">Selecione o Mecânico Responsável...</option>
              {mecanicos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.especialidade})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {servicos.map((item, index) => (
              <div key={index} className="flex gap-3 items-center">
                <input
                  type="text"
                  placeholder="Descrição do Serviço (ex: Troca de pastilhas de freio)"
                  value={item.descricao}
                  onChange={(e) => {
                    const newItems = [...servicos];
                    newItems[index].descricao = e.target.value;
                    setServicos(newItems);
                  }}
                  className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
                <input
                  type="number"
                  placeholder="Qtd"
                  value={item.quantidade}
                  onChange={(e) => {
                    const newItems = [...servicos];
                    newItems[index].quantidade = Number(e.target.value) || 1;
                    setServicos(newItems);
                  }}
                  className="w-20 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-center"
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Valor (R$)"
                  value={item.precoUnitario || ''}
                  onChange={(e) => {
                    const newItems = [...servicos];
                    newItems[index].precoUnitario = Number(e.target.value) || 0;
                    setServicos(newItems);
                  }}
                  className="w-32 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
                {servicos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeServico(index)}
                    className="p-2.5 text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addServico}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mt-2"
            >
              <Plus className="w-4 h-4" /> Adicionar mais um serviço
            </button>
          </div>
        </div>

        {/* Resumo Final & Submissão */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Total Estimado da OS</p>
            <h3 className="text-3xl font-extrabold text-slate-900">
              R$ {totalOS.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>

          <button
            type="submit"
            disabled={loadingSave}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {loadingSave ? 'Abrindo OS...' : 'Abrir Ordem de Serviço'}
          </button>
        </div>
      </form>
    </div>
  );
};
