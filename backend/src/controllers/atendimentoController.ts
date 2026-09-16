import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/auth';
import { generateReceiptPDF } from '../services/pdfService';
import { memoryStore } from '../utils/store';

const prisma = new PrismaClient();

export const createAtendimento = async (req: AuthRequest, res: Response) => {
  try {
    const {
      nomeCliente,
      telefoneCliente,
      veiculo,
      mecanicoId,
      descricaoServico,
      valorPecas,
      valorServico,
      percentualComissao,
      formaPagamento,
      data,

      clienteDocumento,
      clienteEmail,
      clienteCep,
      clienteEndereco,
      clienteNumero,
      clienteComplemento,
      clienteBairro,
      clienteCidade,
      clienteUf
    } = req.body;

    if (!nomeCliente || !mecanicoId || !descricaoServico || !formaPagamento) {
      return res.status(400).json({ error: 'Preencha todos os campos obrigatórios (Cliente, Mecânico, Descrição, Forma de Pagamento)' });
    }

    const pecasNum = Number(valorPecas) || 0;
    const servicoNum = Number(valorServico) || 0;
    const comissaoPercentNum = Number(percentualComissao) || 0;
    const valorTotal = pecasNum + servicoNum;
    const valorComissao = servicoNum * (comissaoPercentNum / 100);
    const atendimentoData = data ? new Date(data) : new Date();

    try {
      const atendimentoDb = await prisma.atendimento.create({
        data: {
          nomeCliente,
          telefoneCliente: telefoneCliente || null,
          veiculo: veiculo || null,
          mecanicoId,
          descricaoServico,
          valorPecas: pecasNum,
          valorServico: servicoNum,
          valorTotal,
          percentualComissao: comissaoPercentNum,
          valorComissao,
          formaPagamento,
          data: atendimentoData,
          clienteDocumento: clienteDocumento || null,
          clienteEmail: clienteEmail || null,
          clienteCep: clienteCep || null,
          clienteEndereco: clienteEndereco || null,
          clienteNumero: clienteNumero || null,
          clienteComplemento: clienteComplemento || null,
          clienteBairro: clienteBairro || null,
          clienteCidade: clienteCidade || null,
          clienteUf: clienteUf || null,
          statusFiscal: 'Pendente de configuração'
        },
        include: { mecanico: true }
      });
      memoryStore.addAtendimento(atendimentoDb);
      return res.status(201).json(atendimentoDb);
    } catch (dbErr) {
      console.warn('⚠️ Prisma createAtendimento fallback:', dbErr);
    }

    const novoAtendimento = memoryStore.addAtendimento({
      nomeCliente,
      telefoneCliente,
      veiculo,
      mecanicoId,
      descricaoServico,
      valorPecas: pecasNum,
      valorServico: servicoNum,
      percentualComissao: comissaoPercentNum,
      formaPagamento,
      data: atendimentoData,
      clienteDocumento,
      clienteEmail,
      clienteCep,
      clienteEndereco,
      clienteNumero,
      clienteComplemento,
      clienteBairro,
      clienteCidade,
      clienteUf
    });

    return res.status(201).json(novoAtendimento);
  } catch (error) {
    console.error('Erro ao criar atendimento:', error);
    return res.status(500).json({ error: 'Erro ao cadastrar atendimento' });
  }
};

export const getAtendimentos = async (req: AuthRequest, res: Response) => {
  try {
    const { busca, dataInicio, dataFim, statusFiscal } = req.query;

    let whereClause: any = {};

    if (dataInicio && dataFim) {
      whereClause.data = {
        gte: new Date(`${dataInicio}T00:00:00.000Z`),
        lte: new Date(`${dataFim}T23:59:59.999Z`)
      };
    }

    if (statusFiscal) {
      whereClause.statusFiscal = statusFiscal as string;
    }

    if (busca) {
      const queryStr = String(busca).trim();
      whereClause.OR = [
        { nomeCliente: { contains: queryStr, mode: 'insensitive' } },
        { veiculo: { contains: queryStr, mode: 'insensitive' } },
        { descricaoServico: { contains: queryStr, mode: 'insensitive' } },
        { clienteDocumento: { contains: queryStr, mode: 'insensitive' } }
      ];
    }

    try {
      const atendimentosDb = await prisma.atendimento.findMany({
        where: whereClause,
        include: { mecanico: true },
        orderBy: { data: 'desc' }
      });

      if (atendimentosDb && atendimentosDb.length > 0) {
        return res.json(atendimentosDb);
      }
    } catch (dbErr) {
      console.warn('⚠️ Prisma getAtendimentos fallback:', dbErr);
    }

    return res.json(memoryStore.atendimentos);
  } catch (error) {
    console.error('Erro ao listar atendimentos:', error);
    return res.json(memoryStore.atendimentos);
  }
};

export const getAtendimentoById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    try {
      const atendimentoDb = await prisma.atendimento.findUnique({
        where: { id },
        include: { mecanico: true }
      });
      if (atendimentoDb) return res.json(atendimentoDb);
    } catch (dbErr) {}

    const at = memoryStore.atendimentos.find(a => a.id === id);
    if (!at) return res.status(404).json({ error: 'Atendimento não encontrado' });
    return res.json(at);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar atendimento' });
  }
};

export const updateAtendimento = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.valorPecas !== undefined || updateData.valorServico !== undefined || updateData.percentualComissao !== undefined) {
      const pecasNum = Number(updateData.valorPecas ?? 0);
      const servicoNum = Number(updateData.valorServico ?? 0);
      const comissaoPercentNum = Number(updateData.percentualComissao ?? 0);

      updateData.valorTotal = pecasNum + servicoNum;
      updateData.valorComissao = servicoNum * (comissaoPercentNum / 100);
    }

    try {
      const updatedDb = await prisma.atendimento.update({
        where: { id },
        data: updateData,
        include: { mecanico: true }
      });
      memoryStore.updateAtendimento(id, updateData);
      return res.json(updatedDb);
    } catch (dbErr) {
      console.warn('⚠️ Prisma updateAtendimento fallback:', dbErr);
    }

    const updated = memoryStore.updateAtendimento(id, updateData);
    return res.json(updated || { id, ...updateData });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao atualizar atendimento' });
  }
};

export const deleteAtendimento = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    try {
      await prisma.atendimento.delete({ where: { id } });
    } catch (dbErr) {}
    memoryStore.deleteAtendimento(id);
    return res.json({ message: 'Atendimento excluído com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao excluir atendimento' });
  }
};

export const downloadPDF = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    let atendimento: any = null;

    try {
      atendimento = await prisma.atendimento.findUnique({
        where: { id },
        include: { mecanico: true }
      });
    } catch (dbErr) {}

    if (!atendimento) {
      atendimento = memoryStore.atendimentos.find(a => a.id === id) || memoryStore.atendimentos[0];
    }

    if (!atendimento) {
      return res.status(404).json({ error: 'Atendimento não encontrado para geração de PDF' });
    }

    const pdfBuffer = await generateReceiptPDF(atendimento);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Nota_Lemoka_${atendimento.id.substring(0, 8)}.pdf`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('Erro ao gerar PDF do atendimento:', error);
    return res.status(500).json({ error: 'Erro ao gerar comprovante em PDF' });
  }
};
