import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getProdutos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    let whereClause: any = {};

    if (q && typeof q === 'string' && q.trim() !== '') {
      const searchTerm = q.trim();
      whereClause.OR = [
        { codigoInterno: { contains: searchTerm, mode: 'insensitive' } },
        { codigoOEM: { contains: searchTerm, mode: 'insensitive' } },
        { ean: { contains: searchTerm, mode: 'insensitive' } },
        { referenciaFabricante: { contains: searchTerm, mode: 'insensitive' } },
        { descricao: { contains: searchTerm, mode: 'insensitive' } },
        { marca: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const produtos = await prisma.produto.findMany({
      where: whereClause,
      orderBy: { descricao: 'asc' },
    });

    res.json(produtos);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro interno ao buscar produtos' });
  }
};

export const createProduto = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      codigoInterno,
      ean,
      referenciaFabricante,
      codigoOEM,
      descricao,
      descricaoTecnica,
      marca,
      categoria,
      unidade,
      precoCusto,
      precoVenda,
      precoPromocional,
      estoqueFisico = 0,
      estoqueMinimo = 0,
      estoqueMaximo,
      localizacao,
    } = req.body;

    if (!descricao || precoVenda === undefined) {
      res.status(400).json({ error: 'Descrição e Preço de Venda são obrigatórios' });
      return;
    }

    const produto = await prisma.produto.create({
      data: {
        codigoInterno: codigoInterno || null,
        ean,
        referenciaFabricante,
        codigoOEM,
        descricao,
        descricaoTecnica,
        marca,
        categoria,
        unidade: unidade || 'UN',
        precoCusto: Number(precoCusto) || 0,
        precoVenda: Number(precoVenda),
        precoPromocional: precoPromocional ? Number(precoPromocional) : null,
        estoqueFisico: Number(estoqueFisico) || 0,
        estoqueMinimo: Number(estoqueMinimo) || 0,
        estoqueMaximo: estoqueMaximo ? Number(estoqueMaximo) : null,
        localizacao: localizacao || null,
      },
    });

    res.status(201).json(produto);
  } catch (error) {
    console.error('Erro ao cadastrar produto:', error);
    res.status(500).json({ error: 'Erro interno ao cadastrar produto' });
  }
};

export const updateProduto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      codigoInterno,
      ean,
      referenciaFabricante,
      codigoOEM,
      descricao,
      descricaoTecnica,
      marca,
      categoria,
      unidade,
      precoCusto,
      precoVenda,
      precoPromocional,
      estoqueFisico,
      estoqueMinimo,
      estoqueMaximo,
      localizacao,
      status,
    } = req.body;

    const produtoExistente = await prisma.produto.findUnique({ where: { id } });
    if (!produtoExistente) {
      res.status(404).json({ error: 'Produto não encontrado' });
      return;
    }

    const produtoAtualizado = await prisma.produto.update({
      where: { id },
      data: {
        codigoInterno: codigoInterno ?? produtoExistente.codigoInterno,
        ean: ean ?? produtoExistente.ean,
        referenciaFabricante: referenciaFabricante ?? produtoExistente.referenciaFabricante,
        codigoOEM: codigoOEM ?? produtoExistente.codigoOEM,
        descricao: descricao ?? produtoExistente.descricao,
        descricaoTecnica: descricaoTecnica ?? produtoExistente.descricaoTecnica,
        marca: marca ?? produtoExistente.marca,
        categoria: categoria ?? produtoExistente.categoria,
        unidade: unidade ?? produtoExistente.unidade,
        precoCusto: precoCusto !== undefined ? Number(precoCusto) : produtoExistente.precoCusto,
        precoVenda: precoVenda !== undefined ? Number(precoVenda) : produtoExistente.precoVenda,
        precoPromocional: precoPromocional !== undefined ? (precoPromocional ? Number(precoPromocional) : null) : produtoExistente.precoPromocional,
        estoqueFisico: estoqueFisico !== undefined ? Number(estoqueFisico) : produtoExistente.estoqueFisico,
        estoqueMinimo: estoqueMinimo !== undefined ? Number(estoqueMinimo) : produtoExistente.estoqueMinimo,
        estoqueMaximo: estoqueMaximo !== undefined ? (estoqueMaximo ? Number(estoqueMaximo) : null) : produtoExistente.estoqueMaximo,
        localizacao: localizacao !== undefined ? localizacao : produtoExistente.localizacao,
        status: status !== undefined ? Boolean(status) : produtoExistente.status,
      },
    });

    res.json(produtoAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar produto' });
  }
};
