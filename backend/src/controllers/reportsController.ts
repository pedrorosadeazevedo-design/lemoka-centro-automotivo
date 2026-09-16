import { Request, Response } from 'express';
import Prisma from '@prisma/client';
const { PrismaClient } = Prisma;

const prisma = new PrismaClient();

/**
 * Helper to parse query date range with America/Sao_Paulo fallback
 */
function parseDateRange(query: any) {
  const { period, startDate, endDate } = query;
  const now = new Date();
  
  // Default to 'month' if period is unspecified
  let start: Date;
  let end: Date = new Date();

  if (period === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === 'yesterday') {
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    start = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 0, 0, 0);
    end = new Date(yest.getFullYear(), yest.getMonth(), yest.getDate(), 23, 59, 59, 999);
  } else if (period === '7days') {
    start = new Date(now);
    start.setDate(start.getDate() - 7);
  } else if (period === '30days') {
    start = new Date(now);
    start.setDate(start.getDate() - 30);
  } else if (period === 'month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === 'last_month') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (period === 'year') {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else if (period === 'custom' && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);
    if (isNaN(start.getTime())) start = new Date(now.getFullYear(), now.getMonth(), 1);
    if (isNaN(end.getTime())) end = new Date();
  } else {
    // Default 30 days
    start = new Date(now);
    start.setDate(start.getDate() - 30);
  }

  return { start, end };
}

/**
 * 1. GET /api/reports/sales
 * Vendas & OS Report
 */
export async function getSalesReport(req: Request, res: Response) {
  try {
    const { start, end } = parseDateRange(req.query);

    const ordens = await prisma.ordemServico.findMany({
      where: {
        createdAt: { gte: start, lte: end }
      },
      include: {
        produtos: true,
        servicos: true,
        cliente: { select: { id: true, nome: true } },
        veiculo: { select: { id: true, placa: true, modelo: true } }
      }
    });

    let totalSubtotal = 0;
    let totalDesconto = 0;
    let totalAcrescimo = 0;
    let faturamentoBruto = 0;
    let faturamentoLiquido = 0;
    let custoPecas = 0;
    let custoServicos = 0;

    let osAbertas = 0;
    let osConcluidas = 0;
    let osFaturadas = 0;
    let osCanceladas = 0;
    let osAguardandoAprovacao = 0;
    let osAguardandoPecas = 0;

    const faturamentoPorDiaMap: Record<string, { faturamento: number; count: number }> = {};
    const statusMap: Record<string, number> = {};

    for (const os of ordens) {
      const valorTotal = Number(os.valorTotal || 0);
      const subtotal = Number(os.subtotal || 0);
      const desconto = Number(os.desconto || 0);
      const acrescimo = Number(os.acrescimo || 0);

      statusMap[os.status] = (statusMap[os.status] || 0) + 1;

      if (os.status === 'OPEN') osAbertas++;
      else if (os.status === 'AWAITING_APPROVAL') osAguardandoAprovacao++;
      else if (os.status === 'AWAITING_PARTS') osAguardandoPecas++;
      else if (os.status === 'COMPLETED') osConcluidas++;
      else if (os.status === 'BILLED') osFaturadas++;
      else if (os.status === 'CANCELLED') osCanceladas++;

      // Faturamento computado apenas de OSs concluídas/faturadas/aprovadas ou totais gerais
      if (os.status !== 'CANCELLED') {
        faturamentoBruto += subtotal + acrescimo;
        totalDesconto += desconto;
        totalAcrescimo += acrescimo;
        totalSubtotal += subtotal;
        
        if (os.status === 'COMPLETED' || os.status === 'BILLED' || os.status === 'APPROVED') {
          faturamentoLiquido += valorTotal;

          const dia = os.createdAt.toISOString().split('T')[0];
          if (!faturamentoPorDiaMap[dia]) faturamentoPorDiaMap[dia] = { faturamento: 0, count: 0 };
          faturamentoPorDiaMap[dia].faturamento += valorTotal;
          faturamentoPorDiaMap[dia].count += 1;
        }

        // Custos de Peças e Serviços
        for (const p of os.produtos) {
          custoPecas += Number(p.custoTotal || (Number(p.custoUnitario || 0) * Number(p.quantidade || 0)));
        }
        for (const s of os.servicos) {
          custoServicos += Number(s.custoMaoDeObra || 0);
        }
      }
    }

    const qtdTotalOS = ordens.length;
    const osFaturadasOuConcluidas = osFaturadas + osConcluidas;
    const ticketMedio = osFaturadasOuConcluidas > 0 ? faturamentoLiquido / osFaturadasOuConcluidas : 0;
    const custoTotalOS = custoPecas + custoServicos;
    const lucroBruto = faturamentoLiquido - custoTotalOS;
    const margemBruta = faturamentoLiquido > 0 ? (lucroBruto / faturamentoLiquido) * 100 : 0;

    const faturamentoPorDia = Object.keys(faturamentoPorDiaMap).sort().map(data => ({
      data,
      faturamento: faturamentoPorDiaMap[data].faturamento,
      quantidadeOS: faturamentoPorDiaMap[data].count
    }));

    return res.json({
      periodo: { start, end },
      resumo: {
        faturamentoBruto,
        totalDesconto,
        totalAcrescimo,
        faturamentoLiquido,
        qtdTotalOS,
        ticketMedio,
        custoPecas,
        custoServicos,
        custoTotalOS,
        lucroBruto,
        margemBruta,
        statusCount: {
          OPEN: osAbertas,
          AWAITING_APPROVAL: osAguardandoAprovacao,
          AWAITING_PARTS: osAguardandoPecas,
          COMPLETED: osConcluidas,
          BILLED: osFaturadas,
          CANCELLED: osCanceladas
        }
      },
      faturamentoPorDia,
      ordens: ordens.map(o => ({
        id: o.id,
        numeroOs: o.numeroOs,
        cliente: o.cliente?.nome,
        veiculo: `${o.veiculo?.modelo} (${o.veiculo?.placa})`,
        status: o.status,
        valorTotal: Number(o.valorTotal),
        data: o.createdAt
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 2. GET /api/reports/services
 * Serviços Report
 */
export async function getServicesReport(req: Request, res: Response) {
  try {
    const { start, end } = parseDateRange(req.query);

    const osItensServico = await prisma.oSItemService.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        ordemServico: { status: { not: 'CANCELLED' } }
      },
      include: {
        servico: true,
        mecanico: { select: { id: true, nome: true } },
        ordemServico: { select: { id: true, numeroOs: true, createdAt: true } }
      }
    });

    const servicosAgrupados: Record<string, {
      id: string;
      descricao: string;
      quantidade: number;
      faturamentoTotal: number;
      custoTotal: number;
      mecanicos: Record<string, number>;
    }> = {};

    for (const item of osItensServico) {
      const key = item.serviceId || item.descricao;
      if (!servicosAgrupados[key]) {
        servicosAgrupados[key] = {
          id: item.serviceId || 'avulso',
          descricao: item.descricao,
          quantidade: 0,
          faturamentoTotal: 0,
          custoTotal: 0,
          mecanicos: {}
        };
      }

      const qtd = Number(item.quantidade || 1);
      const subtotal = Number(item.subtotal || 0);
      const custo = Number(item.custoMaoDeObra || 0);

      servicosAgrupados[key].quantidade += qtd;
      servicosAgrupados[key].faturamentoTotal += subtotal;
      servicosAgrupados[key].custoTotal += custo;

      if (item.mecanico?.nome) {
        const mecNome = item.mecanico.nome;
        servicosAgrupados[key].mecanicos[mecNome] = (servicosAgrupados[key].mecanicos[mecNome] || 0) + qtd;
      }
    }

    const relatorioServicos = Object.values(servicosAgrupados).map(s => {
      const ticketMedio = s.quantidade > 0 ? s.faturamentoTotal / s.quantidade : 0;
      const lucro = s.faturamentoTotal - s.custoTotal;
      const margem = s.faturamentoTotal > 0 ? (lucro / s.faturamentoTotal) * 100 : 0;
      return {
        ...s,
        ticketMedio,
        lucro,
        margem
      };
    }).sort((a, b) => b.faturamentoTotal - a.faturamentoTotal);

    return res.json({
      periodo: { start, end },
      totalServicosExecutados: osItensServico.length,
      servicos: relatorioServicos
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 3. GET /api/reports/products
 * Produtos & Estoque Report
 */
export async function getProductsReport(req: Request, res: Response) {
  try {
    const { start, end } = parseDateRange(req.query);

    // Todos os produtos para análise de estoque
    const produtos = await prisma.produto.findMany({
      include: {
        movimentacoes: {
          where: { createdAt: { gte: start, lte: end } }
        }
      }
    });

    // Itens vendidos no período
    const osItensProdutos = await prisma.oSItemProduct.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        ordemServico: { status: { not: 'CANCELLED' } }
      }
    });

    let totalEstoqueFisico = 0;
    let totalEstoqueReservado = 0;
    let totalEstoqueDisponivel = 0;
    let valorEstimadoEstoqueVenda = 0;
    let valorEstimadoEstoqueCusto = 0;

    let produtosBaixoEstoque = 0;
    let produtosEstoqueNegativo = 0;

    const produtosVendasMap: Record<string, {
      id: string;
      codigoInterno: string;
      descricao: string;
      quantidadeVendida: number;
      faturamentoTotal: number;
      custoTotal: number;
    }> = {};

    for (const item of osItensProdutos) {
      const key = item.productId || item.descricao;
      if (!produtosVendasMap[key]) {
        produtosVendasMap[key] = {
          id: item.productId || 'avulso',
          codigoInterno: item.codigoInterno || 'N/A',
          descricao: item.descricao,
          quantidadeVendida: 0,
          faturamentoTotal: 0,
          custoTotal: 0
        };
      }

      const qtd = Number(item.quantidade || 1);
      const subtotal = Number(item.subtotal || 0);
      const custo = Number(item.custoTotal || (Number(item.custoUnitario || 0) * qtd));

      produtosVendasMap[key].quantidadeVendida += qtd;
      produtosVendasMap[key].faturamentoTotal += subtotal;
      produtosVendasMap[key].custoTotal += custo;
    }

    for (const p of produtos) {
      const estFisico = Number(p.estoqueFisico || 0);
      const estReservado = Number(p.estoqueReservado || 0);
      const estDisponivel = estFisico - estReservado;
      const precoCusto = Number(p.precoCusto || 0);
      const precoVenda = Number(p.precoVenda || 0);
      const estMinimo = Number(p.estoqueMinimo || 0);

      totalEstoqueFisico += estFisico;
      totalEstoqueReservado += estReservado;
      totalEstoqueDisponivel += estDisponivel;

      valorEstimadoEstoqueCusto += estFisico * precoCusto;
      valorEstimadoEstoqueVenda += estFisico * precoVenda;

      if (estFisico < 0 || estDisponivel < 0) {
        produtosEstoqueNegativo++;
      } else if (estDisponivel <= estMinimo && estMinimo > 0) {
        produtosBaixoEstoque++;
      }
    }

    const maisVendidos = Object.values(produtosVendasMap).map(p => {
      const lucro = p.faturamentoTotal - p.custoTotal;
      const margem = p.faturamentoTotal > 0 ? (lucro / p.faturamentoTotal) * 100 : 0;
      return { ...p, lucro, margem };
    }).sort((a, b) => b.faturamentoTotal - a.faturamentoTotal);

    return res.json({
      periodo: { start, end },
      resumoEstoque: {
        totalProdutos: produtos.length,
        totalEstoqueFisico,
        totalEstoqueReservado,
        totalEstoqueDisponivel,
        valorEstimadoEstoqueCusto,
        valorEstimadoEstoqueVenda,
        produtosBaixoEstoque,
        produtosEstoqueNegativo
      },
      maisVendidos
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 4. GET /api/reports/purchases
 * Compras & Fornecedores Report
 */
export async function getPurchasesReport(req: Request, res: Response) {
  try {
    const { start, end } = parseDateRange(req.query);

    const compras = await prisma.compra.findMany({
      where: {
        createdAt: { gte: start, lte: end }
      },
      include: {
        fornecedor: { select: { id: true, razaoSocial: true, nomeFantasia: true } },
        itens: { include: { produto: { select: { id: true, descricao: true } } } }
      }
    });

    let totalComprado = 0;
    let comprasConfirmadas = 0;
    let comprasRascunho = 0;
    let comprasCanceladas = 0;

    const fornecedoresMap: Record<string, { nome: string; total: number; count: number }> = {};
    const produtosCompradosMap: Record<string, { descricao: string; quantidade: number; valorTotal: number }> = {};

    for (const c of compras) {
      const val = Number(c.valorTotal || 0);

      if (c.status === 'CONFIRMADA') {
        totalComprado += val;
        comprasConfirmadas++;

        const fornecNome = c.fornecedor?.nomeFantasia || c.fornecedor?.razaoSocial || 'Desconhecido';
        if (!fornecedoresMap[fornecNome]) fornecedoresMap[fornecNome] = { nome: fornecNome, total: 0, count: 0 };
        fornecedoresMap[fornecNome].total += val;
        fornecedoresMap[fornecNome].count += 1;

        for (const item of c.itens) {
          const prodDesc = item.produto?.descricao || 'Produto';
          if (!produtosCompradosMap[prodDesc]) produtosCompradosMap[prodDesc] = { descricao: prodDesc, quantidade: 0, valorTotal: 0 };
          produtosCompradosMap[prodDesc].quantidade += Number(item.quantidade || 0);
          produtosCompradosMap[prodDesc].valorTotal += Number(item.subtotal || 0);
        }
      } else if (c.status === 'RASCUNHO') comprasRascunho++;
      else if (c.status === 'CANCELADA') comprasCanceladas++;
    }

    const fornecedoresRanking = Object.values(fornecedoresMap).sort((a, b) => b.total - a.total);
    const produtosMaisComprados = Object.values(produtosCompradosMap).sort((a, b) => b.valorTotal - a.valorTotal);

    return res.json({
      periodo: { start, end },
      resumo: {
        totalComprado,
        qtdTotalCompras: compras.length,
        comprasConfirmadas,
        comprasRascunho,
        comprasCanceladas
      },
      fornecedoresRanking,
      produtosMaisComprados
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 5. GET /api/reports/financial
 * Financeiro Report
 */
export async function getFinancialReport(req: Request, res: Response) {
  try {
    const { start, end } = parseDateRange(req.query);

    const contasReceber = await prisma.contaReceber.findMany({
      where: { createdAt: { gte: start, lte: end } }
    });

    const contasPagar = await prisma.contaPagar.findMany({
      where: { createdAt: { gte: start, lte: end } }
    });

    const movimentacoes = await prisma.movimentacaoFinanceira.findMany({
      where: {
        dataMovimentacao: { gte: start, lte: end },
        isEstorno: false
      }
    });

    let crTotal = 0, crRecebido = 0, crEmAberto = 0, crVencido = 0;
    for (const cr of contasReceber) {
      const val = Number(cr.valorLiquido || 0);
      const pago = Number(cr.valorPago || 0);
      const aberto = Number(cr.valorEmAberto || 0);
      crTotal += val;
      crRecebido += pago;
      crEmAberto += aberto;
      if (cr.status === 'VENCIDO' || (cr.dataVencimento < new Date() && cr.status !== 'LIQUIDADO')) {
        crVencido += aberto;
      }
    }

    let cpTotal = 0, cpPago = 0, cpEmAberto = 0, cpVencido = 0;
    for (const cp of contasPagar) {
      const val = Number(cp.valorLiquido || 0);
      const pago = Number(cp.valorPago || 0);
      const aberto = Number(cp.valorEmAberto || 0);
      cpTotal += val;
      cpPago += pago;
      cpEmAberto += aberto;
      if (cp.status === 'VENCIDO' || (cp.dataVencimento < new Date() && cp.status !== 'LIQUIDADO')) {
        cpVencido += aberto;
      }
    }

    // Movimentações Reais (Excluindo Transferências Internas para evitar contagem dupla)
    let totalEntradasCaixa = 0;
    let totalSaidasCaixa = 0;

    for (const m of movimentacoes) {
      const val = Number(m.valor || 0);
      if (m.tipo === 'ENTRADA' || m.tipo === 'SUPRIMENTO') {
        totalEntradasCaixa += val;
      } else if (m.tipo === 'SAIDA' || m.tipo === 'RETIRADA') {
        totalSaidasCaixa += val;
      }
      // TRANSFERENCIA é ignorada das receitas/despesas brutas
    }

    return res.json({
      periodo: { start, end },
      contasReceber: {
        total: crTotal,
        recebido: crRecebido,
        emAberto: crEmAberto,
        vencido: crVencido,
        qtdTitulos: contasReceber.length
      },
      contasPagar: {
        total: cpTotal,
        pago: cpPago,
        emAberto: cpEmAberto,
        vencido: cpVencido,
        qtdTitulos: contasPagar.length
      },
      fluxoCaixaReal: {
        entradas: totalEntradasCaixa,
        saidas: totalSaidasCaixa,
        saldoPeriodo: totalEntradasCaixa - totalSaidasCaixa
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 6. GET /api/reports/dre
 * DRE Gerencial Profissional
 */
export async function getDREReport(req: Request, res: Response) {
  try {
    const { start, end } = parseDateRange(req.query);

    // 1. Receitas de OS Concluídas/Faturadas
    const ordensConcluidas = await prisma.ordemServico.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: { in: ['COMPLETED', 'BILLED'] }
      },
      include: { produtos: true, servicos: true }
    });

    let receitaServicos = 0;
    let receitaVendaPecas = 0;
    let custoMercadoriasVendidas = 0; // CMV
    let custoServicosMaoDeObra = 0;
    let totalDescontosConcedidos = 0;

    for (const os of ordensConcluidas) {
      totalDescontosConcedidos += Number(os.desconto || 0);

      for (const p of os.produtos) {
        receitaVendaPecas += Number(p.subtotal || 0);
        custoMercadoriasVendidas += Number(p.custoTotal || (Number(p.custoUnitario || 0) * Number(p.quantidade || 0)));
      }

      for (const s of os.servicos) {
        receitaServicos += Number(s.subtotal || 0);
        custoServicosMaoDeObra += Number(s.custoMaoDeObra || 0);
      }
    }

    const receitaBrutaTotal = receitaVendaPecas + receitaServicos;
    const receitaLiquida = receitaBrutaTotal - totalDescontosConcedidos;
    const totalCustosDiretos = custoMercadoriasVendidas + custoServicosMaoDeObra;
    const lucroBruto = receitaLiquida - totalCustosDiretos;
    const margemBrutaPct = receitaLiquida > 0 ? (lucroBruto / receitaLiquida) * 100 : 0;

    // 2. Despesas Operacionais (Contas a Pagar Liquidadas / Despesas Fixas)
    const contasPagas = await prisma.contaPagar.findMany({
      where: {
        dataEmissao: { gte: start, lte: end },
        status: 'LIQUIDADO',
        origem: { in: ['DESPESA', 'MANUAL'] }
      },
      include: { planoContas: true }
    });

    let despesasOperacionaisTotal = 0;
    const despesasPorPlanoContasMap: Record<string, number> = {};

    for (const cp of contasPagas) {
      const val = Number(cp.valorPago || cp.valorLiquido || 0);
      despesasOperacionaisTotal += val;
      const cat = cp.planoContas?.descricao || 'Despesas Gerais';
      despesasPorPlanoContasMap[cat] = (despesasPorPlanoContasMap[cat] || 0) + val;
    }

    const resultadoOperacional = lucroBruto - despesasOperacionaisTotal;
    const margemLiquidaPct = receitaLiquida > 0 ? (resultadoOperacional / receitaLiquida) * 100 : 0;

    return res.json({
      periodo: { start, end },
      dre: {
        receitaBruta: {
          total: receitaBrutaTotal,
          vendaPecas: receitaVendaPecas,
          prestacaoServicos: receitaServicos
        },
        deducoes: {
          descontos: totalDescontosConcedidos
        },
        receitaLiquida,
        custosDiretos: {
          total: totalCustosDiretos,
          cmvPecas: custoMercadoriasVendidas,
          custoServicos: custoServicosMaoDeObra
        },
        lucroBruto,
        margemBrutaPct,
        despesasOperacionais: {
          total: despesasOperacionaisTotal,
          detalhamento: Object.entries(despesasPorPlanoContasMap).map(([categoria, valor]) => ({ categoria, valor }))
        },
        resultadoOperacional,
        margemLiquidaPct
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 7. GET /api/reports/customers
 * Clientes Report (Integrado CRM)
 */
export async function getCustomersReport(req: Request, res: Response) {
  try {
    const { start, end } = parseDateRange(req.query);

    const clientes = await prisma.cliente.findMany({
      include: {
        ordensServico: { where: { status: { in: ['COMPLETED', 'BILLED'] } } },
        veiculos: true
      }
    });

    let novosClientesNoPeriodo = 0;
    const rankingClientesMap: { id: string; nome: string; telefone: string | null; qtdOS: number; totalGasto: number }[] = [];

    for (const c of clientes) {
      if (c.createdAt >= start && c.createdAt <= end) {
        novosClientesNoPeriodo++;
      }

      let totalGasto = 0;
      for (const os of c.ordensServico) {
        totalGasto += Number(os.valorTotal || 0);
      }

      rankingClientesMap.push({
        id: c.id,
        nome: c.nome,
        telefone: c.telefone || c.whatsapp,
        qtdOS: c.ordensServico.length,
        totalGasto
      });
    }

    rankingClientesMap.sort((a, b) => b.totalGasto - a.totalGasto);

    return res.json({
      periodo: { start, end },
      totalCadastrados: clientes.length,
      novosClientesNoPeriodo,
      topClientes: rankingClientesMap.slice(0, 50)
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 8. GET /api/reports/mechanics
 * Mecânicos Report
 */
export async function getMechanicsReport(req: Request, res: Response) {
  try {
    const { start, end } = parseDateRange(req.query);

    const mecanicos = await prisma.mecanico.findMany({
      include: {
        itensServico: {
          where: {
            createdAt: { gte: start, lte: end },
            ordemServico: { status: { not: 'CANCELLED' } }
          }
        },
        ordensServico: {
          where: {
            createdAt: { gte: start, lte: end },
            status: { in: ['COMPLETED', 'BILLED'] }
          }
        }
      }
    });

    const relatorioMecanicos = mecanicos.map(m => {
      let faturamentoServicos = 0;
      let custosMaoDeObra = 0;

      for (const item of m.itensServico) {
        faturamentoServicos += Number(item.subtotal || 0);
        custosMaoDeObra += Number(item.custoMaoDeObra || 0);
      }

      const qtdServicos = m.itensServico.length;
      const qtdOS = m.ordensServico.length;
      const ticketMedioServico = qtdServicos > 0 ? faturamentoServicos / qtdServicos : 0;

      return {
        id: m.id,
        nome: m.nome,
        especialidade: m.especialidade,
        qtdOS,
        qtdServicos,
        faturamentoServicos,
        custosMaoDeObra,
        ticketMedioServico
      };
    }).sort((a, b) => b.faturamentoServicos - a.faturamentoServicos);

    return res.json({
      periodo: { start, end },
      mecanicos: relatorioMecanicos
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 9. GET /api/reports/executive
 * Executive Dashboard
 */
export async function getExecutiveDashboardReport(req: Request, res: Response) {
  try {
    const { start, end } = parseDateRange(req.query);

    // Vendas e OS
    const ordens = await prisma.ordemServico.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { produtos: true, servicos: true }
    });

    let faturamento = 0;
    let custoPecas = 0;
    let osConcluidasOuFaturadas = 0;

    for (const os of ordens) {
      if (os.status === 'COMPLETED' || os.status === 'BILLED') {
        faturamento += Number(os.valorTotal || 0);
        osConcluidasOuFaturadas++;
        for (const p of os.produtos) {
          custoPecas += Number(p.custoTotal || (Number(p.custoUnitario || 0) * Number(p.quantidade || 0)));
        }
      }
    }

    const ticketMedio = osConcluidasOuFaturadas > 0 ? faturamento / osConcluidasOuFaturadas : 0;
    const lucroBruto = faturamento - custoPecas;
    const margemBruta = faturamento > 0 ? (lucroBruto / faturamento) * 100 : 0;

    // Contas Pendentes
    const crPendentes = await prisma.contaReceber.aggregate({
      where: { status: { in: ['ABERTO', 'PARCIAL', 'VENCIDO'] } },
      _sum: { valorEmAberto: true }
    });

    const cpPendentes = await prisma.contaPagar.aggregate({
      where: { status: { in: ['ABERTO', 'PARCIAL', 'VENCIDO'] } },
      _sum: { valorEmAberto: true }
    });

    return res.json({
      periodo: { start, end },
      kpis: {
        faturamento,
        lucroBruto,
        margemBruta,
        osConcluidasOuFaturadas,
        ticketMedio,
        contasAReceberPendente: Number(crPendentes._sum.valorEmAberto || 0),
        contasAPagarPendente: Number(cpPendentes._sum.valorEmAberto || 0)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
