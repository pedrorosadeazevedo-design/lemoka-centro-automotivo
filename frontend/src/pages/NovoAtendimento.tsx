import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mecanico, FormaPagamento } from '../types';
import { api } from '../services/api';
import { PlusCircle, FileText, Check, AlertCircle, Download, ChevronDown, ChevronUp } from 'lucide-react';

export const NovoAtendimento: React.FC = () => {
  const navigate = useNavigate();
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);

  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [veiculo, setVeiculo] = useState('');
  const [mecanicoId, setMecanicoId] = useState('');
  const [descricaoServico, setDescricaoServico] = useState('');
  const [valorPecas, setValorPecas] = useState<string>('0');
  const [valorServico, setValorServico] = useState<string>('0');
  const [percentualComissao, setPercentualComissao] = useState<string>('25');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [dataAtendimento, setDataAtendimento] = useState<string>(new Date().toISOString().slice(0, 10));

  // FASE 3: Dados Opcionais Tomador / Cliente
  const [showTomador, setShowTomador] = useState(false);
  const [clienteDocumento, setClienteDocumento] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');
  const [clienteCep, setClienteCep] = useState('');
  const [clienteEndereco, setClienteEndereco] = useState('');
  const [clienteNumero, setClienteNumero] = useState('');
  const [clienteBairro, setClienteBairro] = useState('');
  const [clienteCidade, setClienteCidade] = useState('');
  const [clienteUf, setClienteUf] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sucessoAtendimentoId, setSucessoAtendimentoId] = useState<string | null>(null);

  useEffect(() => {
    api.get('/mecanicos')
      .then((res) => {
        setMecanicos(res.data);
        if (res.data.length > 0) {
          setMecanicoId(res.data[0].id);
        }
      })
      .catch((err) => console.error('Erro ao carregar mecânicos:', err));
  }, []);

  // Cálculos automáticos em tempo de digitação
  const pecasNum = parseFloat(valorPecas) || 0;
  const servicoNum = parseFloat(valorServico) || 0;
  const comissaoPercentNum = parseFloat(percentualComissao) || 0;

  const valorTotalCalculado = pecasNum + servicoNum;
  const valorComissaoCalculada = servicoNum * (comissaoPercentNum / 100);

  const formatCurrency = (val: number) =>
    `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!nomeCliente || !mecanicoId || !descricaoServico) {
      setError('Por favor, preencha o Nome do Cliente, Mecânico e a Descrição do Serviço.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.post('/atendimentos', {
        nomeCliente,
        telefoneCliente,
        veiculo,
        mecanicoId,
        descricaoServico,
        valorPecas: pecasNum,
        valorServico: servicoNum,
        percentualComissao: comissaoPercentNum,
        formaPagamento,
        data: dataAtendimento,

        // Dados Tomador
        clienteDocumento,
        clienteEmail,
        clienteCep,
        clienteEndereco,
        clienteNumero,
        clienteBairro,
        clienteCidade,
        clienteUf
      });

      setSucessoAtendimentoId(res.data.id);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao cadastrar atendimento.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (atendimentoId: string) => {
    try {
      const response = await api.get(`/atendimentos/${atendimentoId}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Comprovante_Lemoka_${(nomeCliente || 'Atendimento').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      alert('Erro ao baixar o PDF do atendimento.');
    }
  };

  const resetForm = () => {
    setSucessoAtendimentoId(null);
    setNomeCliente('');
    setTelefoneCliente('');
    setVeiculo('');
    setDescricaoServico('');
    setValorPecas('0');
    setValorServico('0');
    setClienteDocumento('');
    setClienteEmail('');
    setClienteCep('');
    setClienteEndereco('');
    setClienteNumero('');
    setClienteBairro('');
    setClienteCidade('');
    setClienteUf('');
  };

  if (sucessoAtendimentoId) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto' }} className="card card-gold">
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto', color: 'var(--green)' }}>
            <Check size={36} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--green)' }}>Atendimento Cadastrado!</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
            O registro foi salvo com sucesso e a Ordem de Serviço interna foi gerada.
          </p>

          <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: 'var(--radius-sm)', margin: '1.5rem 0', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Cliente:</span>
              <strong>{nomeCliente}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Valor Total:</span>
              <strong style={{ color: 'var(--gold)' }}>{formatCurrency(valorTotalCalculado)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Comissão do Mecânico:</span>
              <strong style={{ color: 'var(--green)' }}>{formatCurrency(valorComissaoCalculada)}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={() => handleDownloadPDF(sucessoAtendimentoId)}
              className="btn btn-gold"
              style={{ width: '100%' }}
            >
              <Download size={18} /> Baixar Comprovante Interno (PDF)
            </button>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={resetForm} className="btn btn-secondary" style={{ flex: 1 }}>
                <PlusCircle size={16} /> Novo Cadastro
              </button>
              <button onClick={() => navigate('/historico')} className="btn btn-secondary" style={{ flex: 1 }}>
                <FileText size={16} /> Ver no Histórico
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Novo Atendimento de Oficina</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Cadastre os detalhes da manutenção, peças, serviços e comissão.
        </p>
      </div>

      {error && (
        <div className="alert alert-critico">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        {/* Seção 1: Cliente e Veículo */}
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          1. Dados do Cliente e Veículo
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Nome do Cliente *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: João da Silva"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Telefone / WhatsApp (Opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: (21) 98765-4321"
              value={telefoneCliente}
              onChange={(e) => setTelefoneCliente(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Veículo e Modelo (Opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Onix 1.0 2021 Prata"
              value={veiculo}
              onChange={(e) => setVeiculo(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Data do Atendimento</label>
            <input
              type="date"
              className="form-input"
              value={dataAtendimento}
              onChange={(e) => setDataAtendimento(e.target.value)}
            />
          </div>
        </div>

        {/* FASE 3: Dados Opcionais Tomador / Cliente */}
        <div style={{ margin: '1rem 0', borderTop: '1px border var(--border-color)', paddingTop: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowTomador(!showTomador)}
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            <span>📄 Dados Fiscais / Tomador do Serviço (Opcional para NFS-e)</span>
            {showTomador ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showTomador && (
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginTop: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">CPF ou CNPJ do Cliente</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                    value={clienteDocumento}
                    onChange={(e) => setClienteDocumento(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">E-mail do Cliente</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="cliente@email.com"
                    value={clienteEmail}
                    onChange={(e) => setClienteEmail(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">CEP</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="26000-000"
                    value={clienteCep}
                    onChange={(e) => setClienteCep(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Endereço</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Rua / Avenida"
                    value={clienteEndereco}
                    onChange={(e) => setClienteEndereco(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nº</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="123"
                    value={clienteNumero}
                    onChange={(e) => setClienteNumero(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label">Bairro</label>
                  <input
                    type="text"
                    className="form-input"
                    value={clienteBairro}
                    onChange={(e) => setClienteBairro(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Cidade</label>
                  <input
                    type="text"
                    className="form-input"
                    value={clienteCidade}
                    onChange={(e) => setClienteCidade(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">UF</label>
                  <input
                    type="text"
                    className="form-input"
                    value={clienteUf}
                    onChange={(e) => setClienteUf(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Seção 2: Mecânico e Serviço */}
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', margin: '1.5rem 0 1rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          2. Mecânico e Serviço Realizado
        </h3>

        <div className="form-group">
          <label className="form-label">Mecânico Responsável *</label>
          <select
            className="form-select"
            value={mecanicoId}
            onChange={(e) => setMecanicoId(e.target.value)}
            required
          >
            {mecanicos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome} — {m.especialidade}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Descrição do Serviço / Diagnóstico *</label>
          <textarea
            className="form-textarea"
            rows={3}
            placeholder="Descreva os serviços prestados, peças trocadas e observações..."
            value={descricaoServico}
            onChange={(e) => setDescricaoServico(e.target.value)}
            required
          />
        </div>

        {/* Seção 3: Valoração Financeira */}
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gold)', margin: '1.5rem 0 1rem 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
          3. Valores, Comissão e Pagamento
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Valor Peças (R$)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={valorPecas}
              onChange={(e) => setValorPecas(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Valor Mão de Obra / Serviço (R$)</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              value={valorServico}
              onChange={(e) => setValorServico(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">% Comissão do Mecânico</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={percentualComissao}
              onChange={(e) => setPercentualComissao(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Forma de Pagamento</label>
          <select
            className="form-select"
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value as FormaPagamento)}
          >
            <option value="PIX">Pix (Instantâneo)</option>
            <option value="CREDITO">Cartão de Crédito</option>
            <option value="DEBITO">Cartão de Débito</option>
            <option value="DINHEIRO">Dinheiro Espécie</option>
          </select>
        </div>

        {/* Resumo Automático */}
        <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border-gold)', borderRadius: 'var(--radius-sm)', padding: '1.25rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>VALOR TOTAL CALCULADO</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--gold)', marginTop: '0.2rem' }}>
                {formatCurrency(valorTotalCalculado)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>COMISSÃO DO MECÂNICO</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--green)', marginTop: '0.2rem' }}>
                {formatCurrency(valorComissaoCalculada)}
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-gold" style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem' }} disabled={loading}>
          {loading ? 'Salvando...' : 'Finalizar Atendimento & Gerar Documento Interno'}
        </button>
      </form>
    </div>
  );
};
