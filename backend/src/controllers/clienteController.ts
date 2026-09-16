import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getClientes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    let whereClause = {};

    if (q && typeof q === 'string' && q.trim() !== '') {
      const searchTerm = q.trim();
      whereClause = {
        OR: [
          { nome: { contains: searchTerm, mode: 'insensitive' } },
          { documento: { contains: searchTerm, mode: 'insensitive' } },
          { telefone: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
        ],
      };
    }

    const clientes = await prisma.cliente.findMany({
      where: whereClause,
      include: {
        veiculos: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(clientes);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro interno ao buscar clientes' });
  }
};

export const getClienteById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        veiculos: true,
        ordensServico: {
          include: {
            veiculo: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cliente) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }

    res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro interno ao buscar cliente' });
  }
};

export const createCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      nome,
      tipoDocumento,
      documento,
      telefone,
      email,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      observacoes,
    } = req.body;

    if (!nome) {
      res.status(400).json({ error: 'Nome do cliente é obrigatório' });
      return;
    }

    if (documento && documento.trim() !== '') {
      const docLimpo = documento.replace(/\D/g, '');
      const clienteExistente = await prisma.cliente.findFirst({
        where: { documento: docLimpo },
      });

      if (clienteExistente) {
        res.status(400).json({ error: 'Já existe um cliente cadastrado com este documento (CPF/CNPJ)' });
        return;
      }
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome,
        tipoDocumento: tipoDocumento || 'CPF',
        documento: documento ? documento.replace(/\D/g, '') : null,
        telefone,
        email,
        cep,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        observacoes,
      },
    });

    res.status(201).json(cliente);
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro interno ao cadastrar cliente' });
  }
};

export const updateCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      nome,
      tipoDocumento,
      documento,
      telefone,
      email,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      observacoes,
    } = req.body;

    const clienteExistente = await prisma.cliente.findUnique({ where: { id } });
    if (!clienteExistente) {
      res.status(404).json({ error: 'Cliente não encontrado' });
      return;
    }

    const clienteAtualizado = await prisma.cliente.update({
      where: { id },
      data: {
        nome: nome ?? clienteExistente.nome,
        tipoDocumento: tipoDocumento ?? clienteExistente.tipoDocumento,
        documento: documento !== undefined ? (documento ? documento.replace(/\D/g, '') : null) : clienteExistente.documento,
        telefone: telefone ?? clienteExistente.telefone,
        email: email ?? clienteExistente.email,
        cep: cep ?? clienteExistente.cep,
        endereco: endereco ?? clienteExistente.endereco,
        numero: numero ?? clienteExistente.numero,
        complemento: complemento ?? clienteExistente.complemento,
        bairro: bairro ?? clienteExistente.bairro,
        cidade: cidade ?? clienteExistente.cidade,
        uf: uf ?? clienteExistente.uf,
        observacoes: observacoes ?? clienteExistente.observacoes,
      },
    });

    res.json(clienteAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar cliente' });
  }
};
