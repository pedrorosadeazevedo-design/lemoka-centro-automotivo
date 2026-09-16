import { Request, Response } from 'express';
import { PrismaClient, StatusCompra, TipoMovimentacao } from '@prisma/client';
import { autoGerarContaPagarCompra } from './financeiroController';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    papel: string;
  };
}

/**
 * Recalcula e salva os totais da compra no backend
 */
export const recalcularEGuardarCompra = async (compraId: string) => {
  const compra = await prisma.compra.findUnique({
    where: { id: compraId },
    include: { itens: true },
  });

  if (!compra) return null;

  const subtotal = compra.itens.reduce((acc, item) => acc + Number(item.subtotal), 0);
  const desc = Number(compra.desconto) || 0;
  const acr = Number(compra.acrescimo) || 0;
  const valorTotal = Math.max(0, subtotal - desc + acr);

  return await prisma.compra.update({
    where: { id: compraId },
    data: {
      subtotal,
      valorTotal,
    },
    include: {
      fornecedor: true,
      itens: {
        include: { produto: true },
      },
    },
  });
};

/**
 * GET /api/compras
 * Lista compras com filtros por fornecedor, status ou busca textual
 */
export const getCompras = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fornecedorId, status, q } = req.query;
    let whereClause: any = {};

    if (fornecedorId && typeof fornecedorId === 'string') {
      whereClause.fornecedorId = fornecedorId;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      whereClause.status = status as StatusCompra;
    }

    if (q && typeof q === 'string' && q.trim() !== '') {
      const searchTerm = q.trim();
      const numCompra = parseInt(searchTerm);

      whereClause.OR = [
        ...(!isNaN(numCompra) ? [{ numeroCompra: numCompra }] : []),
        { fornecedor: { razaoSocial: { contains: searchTerm, mode: 'insensitive' } } },
        { fornecedor: { nomeFantasia: { contains: searchTerm, mode: 'insensitive' } } },
        { numeroNotaFiscal: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const compras = await prisma.compra.findMany({
      where: whereClause,
      include: {
        fornecedor: true,
        itens: {
          include: { produto: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(compras);
  } catch (error) {
    console.error('Erro ao buscar compras:', error);
    res.status(500).json({ error: 'Erro interno ao buscar compras' });
  }
};

/**
 * GET /api/compras/:id
 * Detalhes de uma compra
 */
export const getCompraById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const compra = await prisma.compra.findUnique({
      where: { id },
      include: {
        fornecedor: true,
        itens: {
          include: { produto: true },
        },
      },
    });

    if (!compra) {
      res.status(404).json({ error: 'Compra não encontrada' });
      return;
    }

    res.json(compra);
  } catch (error) {
    console.error('Erro ao buscar compra por ID:', error);
    res.status(500).json({ error: 'Erro interno ao buscar compra' });
  }
};

/**
 * POST /api/compras
 * Cria um rascunho de compra
 */
export const createCompra = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      fornecedorId,
      numeroNotaFiscal,
      serieNotaFiscal,
      chaveAcessoNfe,
      dataEmissao,
      condicaoPagamento,
      desconto = 0,
      acrescimo = 0,
      observacoes,
      itens = [],
    } = req.body;

    if (!fornecedorId) {
      res.status(400).json({ error: 'Fornecedor é obrigatório para registrar uma compra' });
      return;
    }

    const fornecedor = await prisma.fornecedor.findUnique({ where: { id: fornecedorId } });
    if (!fornecedor) {
      res.status(404).json({ error: 'Fornecedor não encontrado' });
      return;
    }

    const usuarioId = req.user?.id || null;

    // Processar itens iniciais da compra no backend
    const itensFormatados = [];
    let subtotalGeral = 0;

    for (const item of itens) {
      if (!item.produtoId) continue;
      const qtd = Number(item.quantidade) || 1;
      const custo = Number(item.custoUnitario) || 0;
      const desc = Number(item.desconto) || 0;
      const acr = Number(item.acrescimo) || 0;
      const sub = Math.max(0, (qtd * custo) - desc + acr);
      subtotalGeral += sub;

      itensFormatados.push({
        produtoId: item.produtoId,
        codigoFornecedor: item.codigoFornecedor || null,
        referencia: item.referencia || null,
        quantidade: qtd,
        unidade: item.unidade || 'UN',
        custoUnitario: custo,
        desconto: desc,
        acrescimo: acr,
        subtotal: sub,
      });
    }

    const descTotal = Number(desconto) || 0;
    const acrTotal = Number(acrescimo) || 0;
    const valorTotal = Math.max(0, subtotalGeral - descTotal + acrTotal);

    const novaCompra = await prisma.compra.create({
      data: {
        fornecedorId,
        numeroNotaFiscal: numeroNotaFiscal || null,
        serieNotaFiscal: serieNotaFiscal || null,
        chaveAcessoNfe: chaveAcessoNfe || null,
        dataEmissao: dataEmissao ? new Date(dataEmissao) : null,
        condicaoPagamento: condicaoPagamento || 'A_VISTA',
        subtotal: subtotalGeral,
        desconto: descTotal,
        acrescimo: acrTotal,
        valorTotal,
        observacoes: observacoes || null,
        status: StatusCompra.RASCUNHO,
        usuarioId,
        itens: {
          create: itensFormatados,
        },
      },
      include: {
        fornecedor: true,
        itens: {
          include: { produto: true },
        },
      },
    });

    res.status(201).json(novaCompra);
  } catch (error) {
    console.error('Erro ao criar compra:', error);
    res.status(500).json({ error: 'Erro interno ao criar compra' });
  }
};

/**
 * POST /api/compras/:id/confirmar
 * CONFIRMA A COMPRA (Transacional & Idempotente)
 * Executa:
 * 1. Entrada de Estoque Físico no Produto
 * 2. Atualização de Custo Médio do Produto
 * 3. Criação de registro em MovimentacaoEstoque
 * 4. Transição do status para CONFIRMADA
 */
export const confirmarCompra = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const compra = await prisma.compra.findUnique({
      where: { id },
      include: { itens: true },
    });

    if (!compra) {
      res.status(404).json({ error: 'Compra não encontrada' });
      return;
    }

    if (compra.status === StatusCompra.CONFIRMADA) {
      res.status(400).json({ error: 'Esta compra já foi confirmada anteriormente. Operação bloqueada para evitar duplicidade.' });
      return;
    }

    if (compra.status === StatusCompra.CANCELADA) {
      res.status(400).json({ error: 'Esta compra se encontra cancelada e não pode ser confirmada.' });
      return;
    }

    if (!compra.itens || compra.itens.length === 0) {
      res.status(400).json({ error: 'Não é possível confirmar uma compra sem itens.' });
      return;
    }

    const usuarioId = req.user?.id || null;

    // EXECUTAR TRANSAÇÃO PRISMA IDEMPOTENTE
    await prisma.$transaction(async (tx) => {
      for (const item of compra.itens) {
        const produto = await tx.produto.findUnique({ where: { id: item.produtoId } });
        if (!produto) continue;

        const qtdComprada = Number(item.quantidade);
        const custoUnitarioCompra = Number(item.custoUnitario);
        const estFisicoAnterior = Number(produto.estoqueFisico);
        const custoAnterior = Number(produto.precoCusto);

        // Novo Estoque Físico
        const novoEstoqueFisico = estFisicoAnterior + qtdComprada;

        // Cálculo de Custo Médio Ponderado:
        // CUSTO MÉDIO NOVO = ((ESTOQUE ANTERIOR * CUSTO ANTERIOR) + (QTD COMPRADA * CUSTO COMPRA)) / (ESTOQUE ANTERIOR + QTD COMPRADA)
        // Se o estoque anterior for <= 0, o novo custo é simplesmente o custo da compra.
        let novoCustoMedio = custoUnitarioCompra;
        if (estFisicoAnterior > 0 && (estFisicoAnterior + qtdComprada) > 0) {
          const totalValorAnterior = estFisicoAnterior * custoAnterior;
          const totalValorCompra = qtdComprada * custoUnitarioCompra;
          novoCustoMedio = (totalValorAnterior + totalValorCompra) / (estFisicoAnterior + qtdComprada);
        }

        // 1. Atualizar Produto (Estoque Físico + Custo Médio)
        await tx.produto.update({
          where: { id: produto.id },
          data: {
            estoqueFisico: novoEstoqueFisico,
            precoCusto: novoCustoMedio,
          },
        });

        // 2. Registrar Movimentação de Estoque
        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: produto.id,
            tipo: TipoMovimentacao.ENTRADA,
            quantidade: qtdComprada,
            estoqueAnterior: estFisicoAnterior,
            estoquePosterior: novoEstoqueFisico,
            usuarioId,
            origem: 'COMPRA',
            observacao: `Entrada referente à Compra #${compra.numeroCompra} (NF: ${compra.numeroNotaFiscal || 'S/N'})`,
          },
        });
      }

      // 3. Atualizar Status da Compra
      await tx.compra.update({
        where: { id: compra.id },
        data: {
          status: StatusCompra.CONFIRMADA,
          dataEntrada: new Date(),
        },
      });
    });

    await autoGerarContaPagarCompra(id, req.user?.id);

    const compraAtualizada = await recalcularEGuardarCompra(id);
    res.json(compraAtualizada);
  } catch (error) {
    console.error('Erro ao confirmar compra:', error);
    res.status(500).json({ error: 'Erro interno ao confirmar compra e dar entrada no estoque' });
  }
};

/**
 * POST /api/compras/:id/cancelar
 * CANCELA / ESTORNA A COMPRA (Transacional)
 * Gera movimentação inversa de SAIDA/ESTORNO no estoque físico e altera status para CANCELADA
 */
export const cancelarCompra = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;

    const compra = await prisma.compra.findUnique({
      where: { id },
      include: { itens: true },
    });

    if (!compra) {
      res.status(404).json({ error: 'Compra não encontrada' });
      return;
    }

    if (compra.status === StatusCompra.CANCELADA) {
      res.status(400).json({ error: 'Esta compra já se encontra cancelada.' });
      return;
    }

    const usuarioId = req.user?.id || null;

    // Se a compra já havia sido confirmada, é necessário estornar as entradas do estoque físico
    if (compra.status === StatusCompra.CONFIRMADA) {
      await prisma.$transaction(async (tx) => {
        for (const item of compra.itens) {
          const produto = await tx.produto.findUnique({ where: { id: item.produtoId } });
          if (!produto) continue;

          const qtdComprada = Number(item.quantidade);
          const estFisicoAnterior = Number(produto.estoqueFisico);
          const novoEstoqueFisico = estFisicoAnterior - qtdComprada;

          await tx.produto.update({
            where: { id: produto.id },
            data: { estoqueFisico: novoEstoqueFisico },
          });

          await tx.movimentacaoEstoque.create({
            data: {
              produtoId: produto.id,
              tipo: TipoMovimentacao.ESTORNO,
              quantidade: qtdComprada,
              estoqueAnterior: estFisicoAnterior,
              estoquePosterior: novoEstoqueFisico,
              usuarioId,
              origem: 'COMPRA',
              observacao: `Estorno por cancelamento da Compra #${compra.numeroCompra}. Motivo: ${motivo || 'Cancelamento de compra'}`,
            },
          });
        }

        await tx.compra.update({
          where: { id: compra.id },
          data: {
            status: StatusCompra.CANCELADA,
            observacoes: compra.observacoes ? `${compra.observacoes} | CANCELADA: ${motivo || 'Sem motivo informado'}` : `CANCELADA: ${motivo || 'Sem motivo informado'}`,
          },
        });
      });
    } else {
      // Se era apenas RASCUNHO, altera o status diretamente
      await prisma.compra.update({
        where: { id: compra.id },
        data: {
          status: StatusCompra.CANCELADA,
          observacoes: compra.observacoes ? `${compra.observacoes} | CANCELADA` : `CANCELADA`,
        },
      });
    }

    const compraAtualizada = await recalcularEGuardarCompra(id);
    res.json(compraAtualizada);
  } catch (error) {
    console.error('Erro ao cancelar compra:', error);
    res.status(500).json({ error: 'Erro interno ao cancelar compra e realizar estorno' });
  }
};
