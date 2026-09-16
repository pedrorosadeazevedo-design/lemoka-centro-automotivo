import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getVeiculos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, clienteId } = req.query;
    let whereClause: any = {};

    if (clienteId && typeof clienteId === 'string') {
      whereClause.clienteId = clienteId;
    }

    if (q && typeof q === 'string' && q.trim() !== '') {
      const searchTerm = q.trim();
      whereClause.OR = [
        { placa: { contains: searchTerm, mode: 'insensitive' } },
        { modelo: { contains: searchTerm, mode: 'insensitive' } },
        { marca: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const veiculos = await prisma.vehicle.findMany({
      where: whereClause,
      include: {
        cliente: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(veiculos);
  } catch (error) {
    console.error('Erro ao buscar veículos:', error);
    res.status(500).json({ error: 'Erro interno ao buscar veículos' });
  }
};

export const getVeiculoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const veiculo = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        cliente: true,
        ordensServico: {
          include: {
            atendente: { select: { id: true, email: true } },
            mecanico: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!veiculo) {
      res.status(404).json({ error: 'Veículo não encontrado' });
      return;
    }

    res.json(veiculo);
  } catch (error) {
    console.error('Erro ao buscar veículo:', error);
    res.status(500).json({ error: 'Erro interno ao buscar veículo' });
  }
};

export const createVeiculo = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      clienteId,
      placa,
      marca,
      modelo,
      versao,
      anoFabricacao,
      anoModelo,
      motorizacao,
      combustivel,
      chassi,
      renavam,
      cor,
      quilometragemAtual,
      proximaRevisaoKm,
      proximaRevisaoData,
      observacoesTecnicas,
    } = req.body;

    if (!clienteId || !placa || !marca || !modelo) {
      res.status(400).json({ error: 'Cliente, placa, marca e modelo são obrigatórios' });
      return;
    }

    const placaFormatada = placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    // Verificar duplicidade de placa
    const veiculoExistente = await prisma.vehicle.findUnique({
      where: { placa: placaFormatada },
    });

    if (veiculoExistente) {
      res.status(400).json({ error: 'Já existe um veículo cadastrado com esta placa' });
      return;
    }

    const veiculo = await prisma.vehicle.create({
      data: {
        clienteId,
        placa: placaFormatada,
        marca,
        modelo,
        versao,
        anoFabricacao: anoFabricacao ? parseInt(anoFabricacao) : null,
        anoModelo: anoModelo ? parseInt(anoModelo) : null,
        motorizacao,
        combustivel,
        chassi,
        renavam,
        cor,
        quilometragemAtual: quilometragemAtual ? parseInt(quilometragemAtual) : 0,
        proximaRevisaoKm: proximaRevisaoKm ? parseInt(proximaRevisaoKm) : null,
        proximaRevisaoData: proximaRevisaoData ? new Date(proximaRevisaoData) : null,
        observacoesTecnicas,
      },
      include: {
        cliente: true,
      },
    });

    res.status(201).json(veiculo);
  } catch (error) {
    console.error('Erro ao criar veículo:', error);
    res.status(500).json({ error: 'Erro interno ao cadastrar veículo' });
  }
};

export const updateVeiculo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      marca,
      modelo,
      versao,
      anoFabricacao,
      anoModelo,
      motorizacao,
      combustivel,
      chassi,
      renavam,
      cor,
      quilometragemAtual,
      proximaRevisaoKm,
      proximaRevisaoData,
      observacoesTecnicas,
    } = req.body;

    const veiculoExistente = await prisma.vehicle.findUnique({ where: { id } });
    if (!veiculoExistente) {
      res.status(404).json({ error: 'Veículo não encontrado' });
      return;
    }

    const veiculoAtualizado = await prisma.vehicle.update({
      where: { id },
      data: {
        marca: marca ?? veiculoExistente.marca,
        modelo: modelo ?? veiculoExistente.modelo,
        versao: versao ?? veiculoExistente.versao,
        anoFabricacao: anoFabricacao ? parseInt(anoFabricacao) : veiculoExistente.anoFabricacao,
        anoModelo: anoModelo ? parseInt(anoModelo) : veiculoExistente.anoModelo,
        motorizacao: motorizacao ?? veiculoExistente.motorizacao,
        combustivel: combustivel ?? veiculoExistente.combustivel,
        chassi: chassi ?? veiculoExistente.chassi,
        renavam: renavam ?? veiculoExistente.renavam,
        cor: cor ?? veiculoExistente.cor,
        quilometragemAtual: quilometragemAtual ? parseInt(quilometragemAtual) : veiculoExistente.quilometragemAtual,
        proximaRevisaoKm: proximaRevisaoKm ? parseInt(proximaRevisaoKm) : veiculoExistente.proximaRevisaoKm,
        proximaRevisaoData: proximaRevisaoData ? new Date(proximaRevisaoData) : veiculoExistente.proximaRevisaoData,
        observacoesTecnicas: observacoesTecnicas ?? veiculoExistente.observacoesTecnicas,
      },
      include: {
        cliente: true,
      },
    });

    res.json(veiculoAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar veículo:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar veículo' });
  }
};
