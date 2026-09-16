import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Package, 
  Wrench, 
  Users, 
  UserCheck, 
  ShoppingCart, 
  PieChart, 
  Calendar,
  FileSpreadsheet,
  Printer,
  Download,
  Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reportsService, DateFilter } from '../services/reportsService';

export const Relatorios: React.FC = () => {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'executivo' | 'sales' | 'services' | 'products' | 'purchases' | 'financial' | 'dre' | 'customers' | 'mechanics'
  >('executivo');

  const [period, setPeriod] = useState<DateFilter['period']>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const filter: DateFilter = { period, startDate, endDate };
      let res: any = null;

      if (activeTab === 'executivo') res = await reportsService.getExecutiveReport(filter);
      else if (activeTab === 'sales') res = await reportsService.getSalesReport(filter);
      else if (activeTab === 'services') res = await reportsService.getServicesReport(filter);
      else if (activeTab === 'products') res = await reportsService.getProductsReport(filter);
      else if (activeTab === 'purchases') res = await reportsService.getPurchasesReport(filter);
      else if (activeTab === 'financial' && isAdmin) res = await reportsService.getFinancialReport(filter);
      else if (activeTab === 'dre' && isAdmin) res = await reportsService.getDREReport(filter);
      else if (activeTab === 'customers') res = await reportsService.getCustomersReport(filter);
      else if (activeTab === 'mechanics') res = await reportsService.getMechanicsReport(filter);

      setData(res);
    } catch (err: any) {
      console.error("Erro ao carregar relatório:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, period]);

  const handleExportCSV = () => {
    if (!data) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `relatorio_${activeTab}_${period}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 className="text-primary" /> Relatórios Gerenciais Avançados & DRE
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Análise consolidada baseada estritamente nos dados reais da oficina
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <FileSpreadsheet size={16} /> Exportar JSON/Data
          </button>
          <button className="btn-secondary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Printer size={16} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Global Date Filters */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            <Filter size={18} /> Filtro Período:
          </div>
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value as any)}
            style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <option value="today">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="7days">Últimos 7 dias</option>
            <option value="30days">Últimos 30 dias</option>
            <option value="month">Este Mês</option>
            <option value="last_month">Mês Anterior</option>
            <option value="year">Este Ano</option>
            <option value="custom">Personalizado</option>
          </select>

          {period === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} 
              />
              <span>até</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--border-color)' }} 
              />
              <button className="btn-primary" onClick={fetchReport}>Aplicar</button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button 
          onClick={() => setActiveTab('executivo')}
          className={`tab-btn ${activeTab === 'executivo' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === 'executivo' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'executivo' ? '#fff' : 'var(--text-secondary)' }}
        >
          <TrendingUp size={16} /> Visão Executiva
        </button>

        <button 
          onClick={() => setActiveTab('sales')}
          className={`tab-btn ${activeTab === 'sales' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === 'sales' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'sales' ? '#fff' : 'var(--text-secondary)' }}
        >
          <BarChart3 size={16} /> Vendas & OS
        </button>

        <button 
          onClick={() => setActiveTab('services')}
          className={`tab-btn ${activeTab === 'services' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === 'services' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'services' ? '#fff' : 'var(--text-secondary)' }}
        >
          <Wrench size={16} /> Serviços
        </button>

        <button 
          onClick={() => setActiveTab('products')}
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === 'products' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'products' ? '#fff' : 'var(--text-secondary)' }}
        >
          <Package size={16} /> Produtos & Estoque
        </button>

        <button 
          onClick={() => setActiveTab('purchases')}
          className={`tab-btn ${activeTab === 'purchases' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === 'purchases' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'purchases' ? '#fff' : 'var(--text-secondary)' }}
        >
          <ShoppingCart size={16} /> Compras
        </button>

        {isAdmin && (
          <>
            <button 
              onClick={() => setActiveTab('financial')}
              className={`tab-btn ${activeTab === 'financial' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === 'financial' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'financial' ? '#fff' : 'var(--text-secondary)' }}
            >
              <DollarSign size={16} /> Financeiro
            </button>

            <button 
              onClick={() => setActiveTab('dre')}
              className={`tab-btn ${activeTab === 'dre' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === 'dre' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'dre' ? '#fff' : 'var(--text-secondary)' }}
            >
              <PieChart size={16} /> DRE Gerencial
            </button>
          </>
        )}

        <button 
          onClick={() => setActiveTab('customers')}
          className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === 'customers' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'customers' ? '#fff' : 'var(--text-secondary)' }}
        >
          <Users size={16} /> Clientes
        </button>

        <button 
          onClick={() => setActiveTab('mechanics')}
          className={`tab-btn ${activeTab === 'mechanics' ? 'active' : ''}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', cursor: 'pointer', background: activeTab === 'mechanics' ? 'var(--primary-color)' : 'transparent', color: activeTab === 'mechanics' ? '#fff' : 'var(--text-secondary)' }}
        >
          <UserCheck size={16} /> Mecânicos
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Carregando dados consolidados...
        </div>
      ) : !data ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          Nenhum dado disponível para o período selecionado.
        </div>
      ) : (
        <div>
          {/* VISÃO EXECUTIVA */}
          {activeTab === 'executivo' && data.kpis && (
            <div className="grid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Faturamento Líquido (OS)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10B981', marginTop: '0.25rem' }}>
                  R$ {data.kpis.faturamento?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Lucro Bruto Estimado</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3B82F6', marginTop: '0.25rem' }}>
                  R$ {data.kpis.lucroBruto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Margem Bruta</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#F59E0B', marginTop: '0.25rem' }}>
                  {data.kpis.margemBruta?.toFixed(1)}%
                </div>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ticket Médio por OS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                  R$ {data.kpis.ticketMedio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          {/* DRE GERENCIAL */}
          {activeTab === 'dre' && data.dre && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                DRE Gerencial — Demonstrativo do Resultado do Exercício
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  <span>(+) RECEITA BRUTA DE VENDAS E SERVIÇOS</span>
                  <span>R$ {data.dre.receitaBruta?.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>• Peças & Produtos</span>
                  <span>R$ {data.dre.receitaBruta?.vendaPecas?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span>• Mão de Obra / Serviços</span>
                  <span>R$ {data.dre.receitaBruta?.prestacaoServicos?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444' }}>
                  <span>(-) Descontos Concedidos</span>
                  <span>R$ {data.dre.deducoes?.descontos?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px' }}>
                  <span>(=) RECEITA LÍQUIDA</span>
                  <span>R$ {data.dre.receitaLiquida?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444' }}>
                  <span>(-) Custos Diretos (CMV Peças + Mão de Obra)</span>
                  <span>R$ {data.dre.custosDiretos?.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', background: '#3B82F615', padding: '0.5rem', borderRadius: '4px', color: '#3B82F6' }}>
                  <span>(=) LUCRO BRUTO (Margem: {data.dre.margemBrutaPct?.toFixed(1)}%)</span>
                  <span>R$ {data.dre.lucroBruto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#EF4444' }}>
                  <span>(-) Despesas Operacionais / Administrativas</span>
                  <span>R$ {data.dre.despesasOperacionais?.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', background: '#10B98115', padding: '0.75rem', borderRadius: '4px', color: '#10B981', fontSize: '1.1rem' }}>
                  <span>(=) RESULTADO LÍQUIDO OPERACIONAL (Margem: {data.dre.margemLiquidaPct?.toFixed(1)}%)</span>
                  <span>R$ {data.dre.resultadoOperacional?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}

          {/* VENDAS & OS */}
          {activeTab === 'sales' && data.resumo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="grid-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total de OS no Período</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{data.resumo.qtdTotalOS}</div>
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Faturamento Líquido</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#10B981' }}>
                    R$ {data.resumo.faturamentoLiquido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Custo Peças</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#EF4444' }}>
                    R$ {data.resumo.custoPecas?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="card" style={{ padding: '1rem' }}>
                <h3 style={{ fontWeight: 'bold', marginBottom: '0.75rem' }}>Detalhamento por Ordem de Serviço</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '0.5rem' }}>OS #</th>
                        <th style={{ padding: '0.5rem' }}>Cliente</th>
                        <th style={{ padding: '0.5rem' }}>Veículo</th>
                        <th style={{ padding: '0.5rem' }}>Status</th>
                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Valor Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.ordens?.map((o: any) => (
                        <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>#{o.numeroOs}</td>
                          <td style={{ padding: '0.5rem' }}>{o.cliente}</td>
                          <td style={{ padding: '0.5rem' }}>{o.veiculo}</td>
                          <td style={{ padding: '0.5rem' }}>{o.status}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>
                            R$ {o.valorTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* DEMAIS ABAS (SERVIÇOS, PRODUTOS, COMPRAS, FINANCEIRO, CLIENTES, MECÂNICOS) */}
          {activeTab !== 'executivo' && activeTab !== 'dre' && activeTab !== 'sales' && (
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontWeight: 'bold', marginBottom: '1rem' }}>Relatório Consolidado: {activeTab.toUpperCase()}</h3>
              <pre style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '6px', overflowX: 'auto', fontSize: '0.85rem' }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
