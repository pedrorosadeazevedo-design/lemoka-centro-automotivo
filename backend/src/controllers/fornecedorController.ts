import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/fornecedores
 * Lista fornecedores com busca por nome, razão social, CNPJ ou telefone
 */
export const getFornecedores = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    let whereClause: any = {};

    if (q && typeof q === 'string' && q.trim() !== '') {
      const searchTerm = q.trim();
      whereClause.OR = [
        { razaoSocial: { contains: searchTerm, mode: 'insensitive' } },
        { nomeFantasia: { contains: searchTerm, mode: 'insensitive' } },
        { documento: { contains: searchTerm, mode: 'insensitive' } },
        { telefone: { contains: searchTerm, mode: 'insensitive' } },
        { celular: { contains: searchTerm, mode: 'insensitive' } },
        { contato: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const fornecedores = await prisma.fornecedor.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { compras: true },
        },
      },
      orderBy: { razaoSocial: 'asc' },
    });

    res.json(fornecedores);
  } catch (error) {
    console.error('Erro ao buscar fornecedores:', error);
    res.status(500).json({ error: 'Erro interno ao buscar fornecedores' });
  }
};

/**
 * GET /api/fornecedores/:id
 * Detalhes do fornecedor com histórico de compras
 */
export const getFornecedorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const fornecedor = await prisma.fornecedor.findUnique({
      where: { id },
      include: {
        compras: {
          include: {
            itens: {
              include: { produto: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!fornecedor) {
      res.status(404).json({ error: 'Fornecedor não encontrado' });
      return;
    }

    // Calcular estatísticas simples do fornecedor
    const comprasConfirmadas = fornecedor.compras.filter(c => c.status === 'CONFIRMADA');
    const totalComprado = comprasConfirmadas.reduce((acc, c) => acc + Number(c.valorTotal), 0);
    const ultimaCompra = comprasConfirmadas[0]?.createdAt || null;

    res.json({
      ...fornecedor,
      totalComprado,
      totalComprasRealizadas: comprasConfirmadas.length,
      ultimaCompra,
    });
  } catch (error) {
    console.error('Erro ao buscar fornecedor por ID:', error);
    res.status(500).json({ error: 'Erro interno ao buscar fornecedor' });
  }
};

/**
 * POST /api/fornecedores
 * Cadastra um novo fornecedor
 */
export const createFornecedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      tipoPessoa = 'PJ',
      documento,
      razaoSocial,
      nomeFantasia,
      inscricaoEstadual,
      telefone,
      celular,
      whatsapp,
      email,
      contato,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      observacoes,
    } = req.body;

    if (!razaoSocial) {
      res.status(400).json({ error: 'Razão Social é obrigatória' });
      return;
    }

    if (documento) {
      const docExistente = await prisma.fornecedor.findUnique({ where: { documento } });
      if (docExistente) {
        res.status(400).json({ error: 'Já existe um fornecedor cadastrado com este documento (CPF/CNPJ)' });
        return;
      }
    }

    const fornecedor = await prisma.fornecedor.create({
      data: {
        tipoPessoa,
        documento: documento || null,
        razaoSocial,
        nomeFantasia: nomeFantasia || null,
        inscricaoEstadual: inscricaoEstadual || null,
        telefone: telefone || null,
        celular: celular || null,
        whatsapp: whatsapp || null,
        email: email || null,
        contato: contato || null,
        cep: cep || null,
        endereco: endereco || null,
        numero: numero || null,
        complemento: complemento || null,
        bairro: bairro || null,
        cidade: cidade || null,
        uf: uf || null,
        observacoes: observacoes || null,
      },
    });

    res.status(201).json(fornecedor);
  } catch (error) {
    console.error('Erro ao cadastrar fornecedor:', error);
    res.status(500).json({ error: 'Erro interno ao cadastrar fornecedor' });
  }
};

/**
 * PUT /api/fornecedores/:id
 * Atualiza os dados de um fornecedor
 */
export const updateFornecedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      tipoPessoa,
      documento,
      razaoSocial,
      nomeFantasia,
      inscricaoEstadual,
      telefone,
      celular,
      whatsapp,
      email,
      contato,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      observacoes,
      status,
    } = req.body;

    const fornecedorExistente = await prisma.fornecedor.findUnique({ where: { id } });
    if (!fornecedorExistente) {
      res.status(404).json({ error: 'Fornecedor não encontrado' });
      return;
    }

    if (documento && documento !== fornecedorExistente.documento) {
      const docExistente = await prisma.fornecedor.findUnique({ where: { documento } });
      if (docExistente) {
        res.status(400).json({ error: 'Já existe um fornecedor cadastrado com este documento' });
        return;
      }
    }

    const fornecedorAtualizado = await prisma.fornecedor.update({
      where: { id },
      data: {
        tipoPessoa: tipoPessoa ?? fornecedorExistente.tipoPessoa,
        documento: documento !== undefined ? (documento || null) : fornecedorExistente.documento,
        razaoSocial: razaoSocial ?? fornecedorExistente.razaoSocial,
        nomeFantasia: nomeFantasia !== undefined ? (nomeFantasia || null) : fornecedorExistente.nomeFantasia,
        inscricaoEstadual: inscricaoEstadual !== undefined ? (inscricaoEstadual || null) : fornecedorExistente.inscricaoEstadual,
        telefone: telefone !== undefined ? (telefone || null) : fornecedorExistente.telefone,
        celular: celular !== undefined ? (celular || null) : fornecedorExistente.celular,
        whatsapp: whatsapp !== undefined ? (whatsapp || null) : fornecedorExistente.whatsapp,
        email: email !== undefined ? (email || null) : fornecedorExistente.email,
        contato: contato !== undefined ? (contato || null) : fornecedorExistente.contato,
        cep: cep !== undefined ? (cep || null) : fornecedorExistente.cep,
        endereco: endereco !== undefined ? (endereco || null) : fornecedorExistente.endereco,
        numero: numero !== undefined ? (numero || null) : fornecedorExistente.numero,
        complemento: complemento !== undefined ? (complemento || null) : fornecedorExistente.complemento,
        bairro: bairro !== undefined ? (bairro || null) : fornecedorExistente.bairro,
        cidade: cidade !== undefined ? (cidade || null) : fornecedorExistente.cidade,
        uf: uf !== undefined ? (uf || null) : fornecedorExistente.uf,
        observacoes: observacoes !== undefined ? (observacoes || null) : fornecedorExistente.observacoes,
        status: status !== undefined ? Boolean(status) : fornecedorExistente.status,
      },
    });

    res.json(fornecedorAtualizado);
  } catch (error) {
    console.error('Erro ao atualizar fornecedor:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar fornecedor' });
  }
};
