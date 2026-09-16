import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getServicos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    let whereClause: any = {};

    if (q && typeof q === 'string' && q.trim() !== '') {
      const searchTerm = q.trim();
      whereClause.OR = [
        { codigo: { contains: searchTerm, mode: 'insensitive' } },
        { descricao: { contains: searchTerm, mode: 'insensitive' } },
        { categoria: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const servicos = await prisma.servico.findMany({
      where: whereClause,
      orderBy: { descricao: 'asc' },
    });

    res.json(servicos);
  } catch (error) {
    console.error('Erro ao buscar serviços:', error);
    res.status(500).json({ error: 'Erro interno ao buscar serviços' });
  }
};

export const createServico = async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo, descricao, precoPadrao, tempoEstimadoMinutos, categoria, garantiaDias } = req.body;

    if (!descricao || precoPadrao === undefined) {
      res.status(400).json({ error: 'Descrição e Preço Padrão são obrigatórios' });
      return;
    }

    const servico = await prisma.servico.create({
      data: {
        codigo: codigo || null,
        descricao,
        precoPadrao: Number(precoPadrao),
        tempoEstimadoMinutos: tempoEstimadoMinutos ? parseInt(tempoEstimadoMinutos) : 60,
        categoria,
        garantiaDias: garantiaDias ? parseInt(garantiaDias) : 90,
      },
    });

    res.status(201).json(servico);
  } catch (error) {
    console.error('Erro ao cadastrar serviço:', error);
    res.status(500).json({ error: 'Erro interno ao cadastrar serviço' });
  }
};

export const updateServico = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { codigo, descricao, precoPadrao, tempoEstimadoMinutos, categoria, garantiaDias, status } = req.body;

    const servicoExistente = await prisma.servico.findUnique({ where: { id } });
    if (!servicoExistente) {
      res.status(404).json({ error: 'Serviço não encontrado' });
      return;
    }

    const servicoAtualizado = await prisma.servico.update({
      where: { id },
      data: {
        codigo: codigo ?? servicoExistente.codigo,
        descricao: descricao ?? servicoExistente.descricao,
        precoPadrao: precoPadrao !== undefined ? Number(precoPadrao) : servicoExistente.precoPadrao,
        tempoEstimadoMinutos: tempoEstimadoMinutos ? parseInt(tempoEstimadoMinutos) : servicoExistente.tempoEstimadoMinutos,
        categoria: categoria ?? servicoExistente.categoria,
        garantiaDias: garantiaDias ? parseInt(garantiaDias) : servicoExistente.garantiaDias,
        status: status !== undefined ? Boolean(status) : servicoExistente.status,
      },
    });

    res.json(servicoAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar serviço' });
  }
};
