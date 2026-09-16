import { Request, Response } from 'express';
import { PrismaClient, StatusOS } from '@prisma/client';
import { generateOrdemServicoPDF } from '../services/pdfService';
import { processarEstoqueMudancaStatusOS, ajustarEstoqueItemOS } from '../services/stockService';
import { autoGerarContaReceberOS } from './financeiroController';
import { autoGerarPrevisoesRetornoOS } from './crmController';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    papel: string;
  };
}

/**
 * Função central do backend para recalcular e persistir os totais da OS
 */
export const recalcularEGuardarOS = async (osId: string) => {
  const os = await prisma.ordemServico.findUnique({
    where: { id: osId },
    include: {
      produtos: true,
      servicos: true,
    },
  });

  if (!os) return null;

  // Calcular subtotal de produtos
  const subtotalProdutos = os.produtos.reduce((acc, item) => {
    return acc + Number(item.subtotal);
  }, 0);

  // Calcular subtotal de serviços
  const subtotalServicos = os.servicos.reduce((acc, item) => {
    return acc + Number(item.subtotal);
  }, 0);

  const subtotalGeral = subtotalProdutos + subtotalServicos;
  const descontoTotal = Number(os.desconto) || 0;
  const acrescimoTotal = Number(os.acrescimo) || 0;
  const valorTotal = Math.max(0, subtotalGeral - descontoTotal + acrescimoTotal);

  return await prisma.ordemServico.update({
    where: { id: osId },
    data: {
      subtotal: subtotalGeral,
      valorTotal,
    },
    include: {
      cliente: true,
      veiculo: true,
      atendente: { select: { id: true, email: true } },
      mecanico: true,
      produtos: true,
      servicos: {
        include: {
          mecanico: true,
        },
      },
    },
  });
};

export const getOrdensServico = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, q, startDate, endDate } = req.query;
    let whereClause: any = {};

    if (status && typeof status === 'string' && status !== 'ALL') {
      whereClause.status = status as StatusOS;
    }

    if (q && typeof q === 'string' && q.trim() !== '') {
      const searchTerm = q.trim();
      const numOs = parseInt(searchTerm);

      whereClause.OR = [
        ...(!isNaN(numOs) ? [{ numeroOs: numOs }] : []),
        { cliente: { nome: { contains: searchTerm, mode: 'insensitive' } } },
        { veiculo: { placa: { contains: searchTerm, mode: 'insensitive' } } },
        { veiculo: { modelo: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    if (startDate || endDate) {
      whereClause.dataAbertura = {};
      if (startDate) whereClause.dataAbertura.gte = new Date(startDate as string);
      if (endDate) whereClause.dataAbertura.lte = new Date(endDate as string);
    }

    const ordens = await prisma.ordemServico.findMany({
      where: whereClause,
      include: {
        cliente: true,
        veiculo: true,
        atendente: { select: { id: true, email: true } },
        mecanico: true,
        produtos: true,
        servicos: {
          include: {
            mecanico: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(ordens);
  } catch (error) {
    console.error('Erro ao buscar ordens de serviço:', error);
    res.status(500).json({ error: 'Erro interno ao buscar ordens de serviço' });
  }
};

export const getOrdemServicoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: {
        cliente: true,
        veiculo: true,
        atendente: { select: { id: true, email: true } },
        mecanico: true,
        produtos: {
          include: { produto: true },
        },
        servicos: {
          include: {
            mecanico: true,
            servico: true,
          },
        },
      },
    });

    if (!os) {
      res.status(404).json({ error: 'Ordem de serviço não encontrada' });
      return;
    }

    res.json(os);
  } catch (error) {
    console.error('Erro ao buscar ordem de serviço por ID:', error);
    res.status(500).json({ error: 'Erro interno ao buscar ordem de serviço' });
  }
};

export const createOrdemServico = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      clienteId,
      veiculoId,
      mecanicoId,
      previsaoEntrega,
      observacoes,
      desconto = 0,
      acrescimo = 0,
      produtos = [],
      servicos = [],
    } = req.body;

    const atendenteId = req.user?.id;

    if (!atendenteId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    if (!clienteId || !veiculoId) {
      res.status(400).json({ error: 'Cliente e veículo são obrigatórios para abrir uma OS' });
      return;
    }

    // Processar produtos iniciais com snapshot
    const produtosFormatados = [];
    let subtotalProdutos = 0;

    for (const p of produtos) {
      const qtd = Number(p.quantidade) || 1;
      const preco = Number(p.precoUnitario) || 0;
      const desc = Number(p.desconto) || 0;
      const acr = Number(p.acrescimo) || 0;
      const sub = Math.max(0, (qtd * preco) - desc + acr);
      const custoUnit = Number(p.custoUnitario) || 0;
      const custoTot = custoUnit * qtd;
      const margem = sub - custoTot;
      subtotalProdutos += sub;

      produtosFormatados.push({
        productId: p.productId || null,
        codigoInterno: p.codigoInterno || null,
        descricao: p.descricao,
        marca: p.marca || null,
        unidade: p.unidade || 'UN',
        quantidade: qtd,
        precoUnitario: preco,
        custoUnitario: custoUnit,
        custoTotal: custoTot,
        desconto: desc,
        acrescimo: acr,
        margemBruta: margem,
        subtotal: sub,
      });
    }

    // Processar serviços iniciais com snapshot
    const servicosFormatados = [];
    let subtotalServicos = 0;

    for (const s of servicos) {
      const qtd = Number(s.quantidade) || 1;
      const preco = Number(s.precoUnitario) || 0;
      const desc = Number(s.desconto) || 0;
      const acr = Number(s.acrescimo) || 0;
      const sub = Math.max(0, (qtd * preco) - desc + acr);
      subtotalServicos += sub;

      servicosFormatados.push({
        serviceId: s.serviceId || null,
        descricao: s.descricao,
        mecanicoId: s.mecanicoId || mecanicoId || null,
        quantidade: qtd,
        precoUnitario: preco,
        custoMaoDeObra: Number(s.custoMaoDeObra) || 0,
        desconto: desc,
        acrescimo: acr,
        subtotal: sub,
      });
    }

    const subtotal = subtotalProdutos + subtotalServicos;
    const descTotal = Number(desconto) || 0;
    const acrTotal = Number(acrescimo) || 0;
    const valorTotal = Math.max(0, subtotal - descTotal + acrTotal);

    const novaOS = await prisma.ordemServico.create({
      data: {
        clienteId,
        veiculoId,
        atendenteId,
        mecanicoId: mecanicoId || null,
        status: StatusOS.OPEN,
        previsaoEntrega: previsaoEntrega ? new Date(previsaoEntrega) : null,
        observacoes,
        subtotal,
        desconto: descTotal,
        acrescimo: acrTotal,
        valorTotal,
        produtos: { create: produtosFormatados },
        servicos: { create: servicosFormatados },
      },
      include: {
        cliente: true,
        veiculo: true,
        atendente: { select: { id: true, email: true } },
        mecanico: true,
        produtos: true,
        servicos: true,
      },
    });

    res.status(201).json(novaOS);
  } catch (error) {
    console.error('Erro ao criar ordem de serviço:', error);
    res.status(500).json({ error: 'Erro interno ao criar ordem de serviço' });
  }
};

export const addItemProdutoToOS = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: osId } = req.params;
    const { productId, descricao, quantidade, precoUnitario, desconto = 0, acrescimo = 0, custoUnitario = 0 } = req.body;

    const os = await prisma.ordemServico.findUnique({ where: { id: osId } });
    if (!os) {
      res.status(404).json({ error: 'Ordem de Serviço não encontrada' });
      return;
    }

    if (os.status === StatusOS.BILLED || os.status === StatusOS.CANCELLED) {
      res.status(400).json({ error: 'Esta OS já está encerrada ou cancelada e não pode receber novos itens' });
      return;
    }

    let prodDesc = descricao;
    let prodPreco = Number(precoUnitario);
    let prodCusto = Number(custoUnitario);
    let prodMarca = null;
    let prodCodInt = null;

    if (productId) {
      const prodCat = await prisma.produto.findUnique({ where: { id: productId } });
      if (prodCat) {
        prodDesc = prodCat.descricao;
        prodPreco = Number(prodCat.precoVenda);
        prodCusto = Number(prodCat.precoCusto);
        prodMarca = prodCat.marca;
        prodCodInt = prodCat.codigoInterno;
      }
    }

    const qtd = Number(quantidade) || 1;
    const desc = Number(desconto) || 0;
    const acr = Number(acrescimo) || 0;
    const sub = Math.max(0, (qtd * prodPreco) - desc + acr);
    const custoTot = prodCusto * qtd;
    const margem = sub - custoTot;

    await prisma.oSItemProduct.create({
      data: {
        ordemServicoId: osId,
        productId: productId || null,
        codigoInterno: prodCodInt,
        descricao: prodDesc,
        marca: prodMarca,
        quantidade: qtd,
        precoUnitario: prodPreco,
        custoUnitario: prodCusto,
        custoTotal: custoTot,
        desconto: desc,
        acrescimo: acr,
        margemBruta: margem,
        subtotal: sub,
      },
    });

    const osAtualizada = await recalcularEGuardarOS(osId);
    res.json(osAtualizada);
  } catch (error) {
    console.error('Erro ao adicionar produto à OS:', error);
    res.status(500).json({ error: 'Erro interno ao adicionar produto à OS' });
  }
};

export const addItemServicoToOS = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: osId } = req.params;
    const { serviceId, descricao, mecanicoId, quantidade, precoUnitario, desconto = 0, acrescimo = 0 } = req.body;

    const os = await prisma.ordemServico.findUnique({ where: { id: osId } });
    if (!os) {
      res.status(404).json({ error: 'Ordem de Serviço não encontrada' });
      return;
    }

    if (os.status === StatusOS.BILLED || os.status === StatusOS.CANCELLED) {
      res.status(400).json({ error: 'Esta OS já está encerrada ou cancelada e não pode receber novos itens' });
      return;
    }

    let servDesc = descricao;
    let servPreco = Number(precoUnitario);

    if (serviceId) {
      const servCat = await prisma.servico.findUnique({ where: { id: serviceId } });
      if (servCat) {
        servDesc = servCat.descricao;
        servPreco = Number(servCat.precoPadrao);
      }
    }

    const qtd = Number(quantidade) || 1;
    const desc = Number(desconto) || 0;
    const acr = Number(acrescimo) || 0;
    const sub = Math.max(0, (qtd * servPreco) - desc + acr);

    await prisma.oSItemService.create({
      data: {
        ordemServicoId: osId,
        serviceId: serviceId || null,
        descricao: servDesc,
        mecanicoId: mecanicoId || os.mecanicoId || null,
        quantidade: qtd,
        precoUnitario: servPreco,
        desconto: desc,
        acrescimo: acr,
        subtotal: sub,
      },
    });

    const osAtualizada = await recalcularEGuardarOS(osId);
    res.json(osAtualizada);
  } catch (error) {
    console.error('Erro ao adicionar serviço à OS:', error);
    res.status(500).json({ error: 'Erro interno ao adicionar serviço à OS' });
  }
};

export const updateItemInOS = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: osId, tipo, itemId } = req.params;
    const { quantidade, precoUnitario, desconto, acrescimo, mecanicoId } = req.body;

    if (tipo === 'produto') {
      const itemExistente = await prisma.oSItemProduct.findUnique({ where: { id: itemId } });
      if (!itemExistente) {
        res.status(404).json({ error: 'Item de produto não encontrado' });
        return;
      }

      const qtdAntiga = Number(itemExistente.quantidade);
      const qtdNova = quantidade !== undefined ? Number(quantidade) : qtdAntiga;
      const preco = precoUnitario !== undefined ? Number(precoUnitario) : Number(itemExistente.precoUnitario);
      const desc = desconto !== undefined ? Number(desconto) : Number(itemExistente.desconto);
      const acr = acrescimo !== undefined ? Number(acrescimo) : Number(itemExistente.acrescimo);
      const sub = Math.max(0, (qtdNova * preco) - desc + acr);
      const custoTot = Number(itemExistente.custoUnitario) * qtdNova;
      const margem = sub - custoTot;

      // Ajustar estoque se houver alteração de quantidade no produto
      if (itemExistente.productId && qtdNova !== qtdAntiga) {
        await ajustarEstoqueItemOS(osId, itemExistente.productId, qtdAntiga, qtdNova, (req as any).user?.id);
      }

      await prisma.oSItemProduct.update({
        where: { id: itemId },
        data: {
          quantidade: qtdNova,
          precoUnitario: preco,
          desconto: desc,
          acrescimo: acr,
          custoTotal: custoTot,
          margemBruta: margem,
          subtotal: sub,
        },
      });
    } else if (tipo === 'servico') {
      const itemExistente = await prisma.oSItemService.findUnique({ where: { id: itemId } });
      if (!itemExistente) {
        res.status(404).json({ error: 'Item de serviço não encontrado' });
        return;
      }

      const qtd = quantidade !== undefined ? Number(quantidade) : Number(itemExistente.quantidade);
      const preco = precoUnitario !== undefined ? Number(precoUnitario) : Number(itemExistente.precoUnitario);
      const desc = desconto !== undefined ? Number(desconto) : Number(itemExistente.desconto);
      const acr = acrescimo !== undefined ? Number(acrescimo) : Number(itemExistente.acrescimo);
      const sub = Math.max(0, (qtd * preco) - desc + acr);

      await prisma.oSItemService.update({
        where: { id: itemId },
        data: {
          quantidade: qtd,
          precoUnitario: preco,
          desconto: desc,
          acrescimo: acr,
          mecanicoId: mecanicoId !== undefined ? mecanicoId : itemExistente.mecanicoId,
          subtotal: sub,
        },
      });
    }

    const osAtualizada = await recalcularEGuardarOS(osId);
    res.json(osAtualizada);
  } catch (error: any) {
    console.error('Erro ao atualizar item da OS:', error);
    res.status(400).json({ error: error.message || 'Erro interno ao atualizar item' });
  }
};

export const deleteItemFromOS = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: osId, tipo, itemId } = req.params;

    if (tipo === 'produto') {
      const itemExistente = await prisma.oSItemProduct.findUnique({ where: { id: itemId } });
      if (itemExistente && itemExistente.productId) {
        const qtdAntiga = Number(itemExistente.quantidade);
        await ajustarEstoqueItemOS(osId, itemExistente.productId, qtdAntiga, 0, (req as any).user?.id);
      }
      await prisma.oSItemProduct.delete({ where: { id: itemId } });
    } else if (tipo === 'servico') {
      await prisma.oSItemService.delete({ where: { id: itemId } });
    }

    const osAtualizada = await recalcularEGuardarOS(osId);
    res.json(osAtualizada);
  } catch (error: any) {
    console.error('Erro ao deletar item da OS:', error);
    res.status(400).json({ error: error.message || 'Erro interno ao remover item da OS' });
  }
};

export const updateStatusOrdemServico = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, formaPagamento, desconto, acrescimo } = req.body;

    if (status && !Object.values(StatusOS).includes(status as StatusOS)) {
      res.status(400).json({ error: 'Status informado é inválido' });
      return;
    }

    const osExistente = await prisma.ordemServico.findUnique({ where: { id } });
    if (!osExistente) {
      res.status(404).json({ error: 'Ordem de serviço não encontrada' });
      return;
    }

    const novoStatus = status ? (status as StatusOS) : osExistente.status;
    const statusMudou = status && osExistente.status !== novoStatus;

    // Se o status realmente mudou, processar regras de estoque (Reserva / Baixa / Liberação)
    if (statusMudou) {
      await processarEstoqueMudancaStatusOS({
        osId: id,
        statusAnterior: osExistente.status,
        statusNovo: novoStatus,
        usuarioId: req.user?.id || null,
      });
    }

    const newDesc = desconto !== undefined ? Number(desconto) : Number(osExistente.desconto);
    const newAcr = acrescimo !== undefined ? Number(acrescimo) : Number(osExistente.acrescimo);
    const dataFechamento = (novoStatus === StatusOS.COMPLETED || novoStatus === StatusOS.BILLED) ? new Date() : osExistente.dataFechamento;

    await prisma.ordemServico.update({
      where: { id },
      data: {
        status: novoStatus,
        dataFechamento,
        formaPagamento: formaPagamento ?? osExistente.formaPagamento,
        desconto: newDesc,
        acrescimo: newAcr,
      },
    });

    if (statusMudou) {
      await prisma.oSStatusHistory.create({
        data: {
          ordemServicoId: id,
          statusAnterior: osExistente.status,
          statusNovo: novoStatus,
          usuarioId: req.user?.id || null,
        },
      });

      if (novoStatus === StatusOS.BILLED) {
        await autoGerarContaReceberOS(id, req.user?.id);
      }

      if (novoStatus === StatusOS.COMPLETED || novoStatus === StatusOS.BILLED) {
        await autoGerarPrevisoesRetornoOS(id, req.user?.id);
      }
    }

    const osAtualizada = await recalcularEGuardarOS(id);
    res.json(osAtualizada);
  } catch (error: any) {
    console.error('Erro ao atualizar status da OS:', error);
    res.status(400).json({ error: error.message || 'Erro interno ao atualizar status da OS' });
  }
};

export const getPatioKanban = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, mecanicoId } = req.query;
    let whereClause: any = {
      status: {
        not: StatusOS.CANCELLED,
      },
    };

    if (mecanicoId && typeof mecanicoId === 'string' && mecanicoId !== 'ALL') {
      whereClause.OR = [
        { mecanicoId: mecanicoId },
        { servicos: { some: { mecanicoId: mecanicoId } } },
      ];
    }

    if (q && typeof q === 'string' && q.trim() !== '') {
      const searchTerm = q.trim();
      const numOs = parseInt(searchTerm);

      whereClause.AND = [
        {
          OR: [
            ...(!isNaN(numOs) ? [{ numeroOs: numOs }] : []),
            { cliente: { nome: { contains: searchTerm, mode: 'insensitive' } } },
            { veiculo: { placa: { contains: searchTerm, mode: 'insensitive' } } },
            { veiculo: { modelo: { contains: searchTerm, mode: 'insensitive' } } },
            { veiculo: { marca: { contains: searchTerm, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const ordens = await prisma.ordemServico.findMany({
      where: whereClause,
      include: {
        cliente: true,
        veiculo: true,
        mecanico: true,
        servicos: {
          include: { mecanico: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const agora = new Date();

    // Mapear cada OS adicionando a flag de atrasada
    const ordensFormatadas = ordens.map((os) => {
      const isFinalizada = os.status === StatusOS.COMPLETED || os.status === StatusOS.BILLED;
      const isAtrasada = !isFinalizada && os.previsaoEntrega ? new Date(os.previsaoEntrega) < agora : false;

      return {
        ...os,
        isAtrasada,
      };
    });

    res.json(ordensFormatadas);
  } catch (error) {
    console.error('Erro ao buscar dados do Pátio Kanban:', error);
    res.status(500).json({ error: 'Erro interno ao buscar Pátio Kanban' });
  }
};

export const getOSStatusHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const historico = await prisma.oSStatusHistory.findMany({
      where: { ordemServicoId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json(historico);
  } catch (error) {
    console.error('Erro ao buscar histórico de status:', error);
    res.status(500).json({ error: 'Erro interno ao buscar histórico de status' });
  }
};

export const downloadOSPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: {
        cliente: true,
        veiculo: true,
        atendente: { select: { id: true, email: true } },
        mecanico: true,
        produtos: {
          include: { produto: true },
        },
        servicos: {
          include: {
            mecanico: true,
            servico: true,
          },
        },
      },
    });

    if (!os) {
      res.status(404).json({ error: 'Ordem de serviço não encontrada' });
      return;
    }

    const empresa = await prisma.empresaConfig.findFirst();

    const pdfBuffer = await generateOrdemServicoPDF(os, empresa);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=OS_${os.numeroOs}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Erro ao gerar PDF da Ordem de Serviço:', error);
    res.status(500).json({ error: 'Erro interno ao gerar PDF da Ordem de Serviço' });
  }
};
