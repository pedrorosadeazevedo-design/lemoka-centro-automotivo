import { Request, Response } from 'express';
import { PrismaClient, TipoMovimentacao } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    papel: string;
  };
}

/**
 * GET /api/estoque/movimentacoes
 * Busca o histórico global de movimentações de estoque com filtros por produto, tipo ou busca textual
 */
export const getMovimentacoesEstoque = async (req: Request, res: Response): Promise<void> => {
  try {
    const { produtoId, tipo, q } = req.query;
    let whereClause: any = {};

    if (produtoId && typeof produtoId === 'string') {
      whereClause.produtoId = produtoId;
    }

    if (tipo && typeof tipo === 'string' && tipo !== 'ALL') {
      whereClause.tipo = tipo as TipoMovimentacao;
    }

    if (q && typeof q === 'string' && q.trim() !== '') {
      const searchTerm = q.trim();
      whereClause.OR = [
        { produto: { descricao: { contains: searchTerm, mode: 'insensitive' } } },
        { produto: { codigoInterno: { contains: searchTerm, mode: 'insensitive' } } },
        { observacao: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const movimentacoes = await prisma.movimentacaoEstoque.findMany({
      where: whereClause,
      include: {
        produto: {
          select: {
            id: true,
            codigoInterno: true,
            descricao: true,
            marca: true,
            unidade: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(movimentacoes);
  } catch (error) {
    console.error('Erro ao buscar movimentações de estoque:', error);
    res.status(500).json({ error: 'Erro interno ao buscar movimentações de estoque' });
  }
};

/**
 * POST /api/estoque/movimentacoes
 * Registra movimentação manual de estoque (ENTRADA, SAIDA, AJUSTE)
 */
export const createMovimentacaoManual = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { produtoId, tipo, quantidade, observacao, origem = 'MANUAL' } = req.body;
    const usuarioId = req.user?.id;

    if (!produtoId || !tipo || quantidade === undefined) {
      res.status(400).json({ error: 'Produto, tipo e quantidade são obrigatórios' });
      return;
    }

    const qtdNum = Number(quantidade);
    if (isNaN(qtdNum) || qtdNum <= 0) {
      res.status(400).json({ error: 'Quantidade deve ser um número positivo maior que zero' });
      return;
    }

    const produto = await prisma.produto.findUnique({ where: { id: produtoId } });
    if (!produto) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }

    const config = await prisma.empresaConfig.findFirst();
    const permitirEstoqueNegativo = config?.permitirEstoqueNegativo ?? true;

    const estFisico = Number(produto.estoqueFisico);
    let novoFisico = estFisico;

    if (tipo === TipoMovimentacao.ENTRADA || tipo === TipoMovimentacao.ESTORNO) {
      novoFisico += qtdNum;
    } else if (tipo === TipoMovimentacao.SAIDA) {
      novoFisico -= qtdNum;
    } else if (tipo === TipoMovimentacao.AJUSTE) {
      novoFisico = qtdNum; // No ajuste manual, a quantidade informada passa a ser o novo estoque físico total
    } else {
      res.status(400).json({ error: 'Tipo de movimentação manual inválido' });
      return;
    }

    if (!permitirEstoqueNegativo && novoFisico < 0) {
      res.status(400).json({ error: `Operação bloqueada: o estoque físico ficaria negativo (${novoFisico}) e a configuração da empresa proíbe estoque negativo.` });
      return;
    }

    const movimentacao = await prisma.$transaction(async (tx) => {
      await tx.produto.update({
        where: { id: produtoId },
        data: { estoqueFisico: novoFisico },
      });

      return await tx.movimentacaoEstoque.create({
        data: {
          produtoId,
          tipo: tipo as TipoMovimentacao,
          quantidade: qtdNum,
          estoqueAnterior: estFisico,
          estoquePosterior: novoFisico,
          usuarioId: usuarioId || null,
          origem,
          observacao: observacao || `Movimentação manual de ${tipo}`,
        },
        include: {
          produto: true,
        },
      });
    });

    res.status(201).json(movimentacao);
  } catch (error) {
    console.error('Erro ao registrar movimentação de estoque:', error);
    res.status(500).json({ error: 'Erro interno ao registrar movimentação' });
  }
};
