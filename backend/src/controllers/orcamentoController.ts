import { Request, Response } from 'express';
import { PrismaClient, StatusOS } from '@prisma/client';
import { recalcularEGuardarOS } from './osController';

const prisma = new PrismaClient();

/**
 * Endpoint Público (sem autenticação) para consulta do Orçamento via token público
 * GET /api/orcamento/publico/:token
 */
export const getOrcamentoPublico = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({ error: 'Token do orçamento é obrigatório' });
      return;
    }

    const os = await prisma.ordemServico.findUnique({
      where: { publicToken: token },
      select: {
        id: true,
        numeroOs: true,
        publicToken: true,
        status: true,
        dataAbertura: true,
        previsaoEntrega: true,
        observacoes: true,
        subtotal: true,
        desconto: true,
        acrescimo: true,
        valorTotal: true,
        cliente: {
          select: {
            nome: true,
            telefone: true,
          },
        },
        veiculo: {
          select: {
            placa: true,
            marca: true,
            modelo: true,
            versao: true,
            anoModelo: true,
            cor: true,
          },
        },
        produtos: {
          select: {
            id: true,
            descricao: true,
            marca: true,
            unidade: true,
            quantidade: true,
            precoUnitario: true,
            desconto: true,
            acrescimo: true,
            subtotal: true,
            aprovado: true,
          },
        },
        servicos: {
          select: {
            id: true,
            descricao: true,
            quantidade: true,
            precoUnitario: true,
            desconto: true,
            acrescimo: true,
            subtotal: true,
            aprovado: true,
          },
        },
      },
    });

    if (!os) {
      res.status(404).json({ error: 'Orçamento não encontrado ou token inválido' });
      return;
    }

    // Calcular resumo dos itens aprovados para exibição no frontend do cliente
    const produtosAprovados = os.produtos.filter(p => p.aprovado !== false);
    const servicosAprovados = os.servicos.filter(s => s.aprovado !== false);

    const subtotalProdutosAprovados = produtosAprovados.reduce((acc, item) => acc + Number(item.subtotal), 0);
    const subtotalServicosAprovados = servicosAprovados.reduce((acc, item) => acc + Number(item.subtotal), 0);
    const subtotalGeralAprovado = subtotalProdutosAprovados + subtotalServicosAprovados;

    const desc = Number(os.desconto) || 0;
    const acr = Number(os.acrescimo) || 0;
    const valorTotalAprovado = Math.max(0, subtotalGeralAprovado - desc + acr);

    const empresa = await prisma.empresaConfig.findFirst({
      select: {
        razaoSocial: true,
        nomeFantasia: true,
        cnpj: true,
        telefone: true,
        whatsapp: true,
        endereco: true,
        numero: true,
        bairro: true,
        cidade: true,
        uf: true,
        logoUrl: true,
      },
    });

    res.json({
      ...os,
      empresa,
      totaisAprovados: {
        subtotalProdutos: subtotalProdutosAprovados,
        subtotalServicos: subtotalServicosAprovados,
        subtotalGeral: subtotalGeralAprovado,
        desconto: desc,
        acrescimo: acr,
        valorTotal: valorTotalAprovado,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar orçamento público:', error);
    res.status(500).json({ error: 'Erro interno ao carregar orçamento público' });
  }
};

/**
 * Endpoint Público (sem autenticação) para salvar decisão do cliente (Aprovar / Recusar itens)
 * POST /api/orcamento/publico/:token/aprovar
 * Body: { decisoesProdutos: { id: string, aprovado: boolean }[], decisoesServicos: { id: string, aprovado: boolean }[], acaoFinal?: 'APROVAR_TUDO' | 'SALVAR_DECISOES' }
 */
export const decidirOrcamentoPublico = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { decisoesProdutos = [], decisoesServicos = [], acaoFinal } = req.body;

    const os = await prisma.ordemServico.findUnique({
      where: { publicToken: token },
      include: { produtos: true, servicos: true },
    });

    if (!os) {
      res.status(404).json({ error: 'Orçamento não encontrado ou token inválido' });
      return;
    }

    if (os.status === StatusOS.BILLED || os.status === StatusOS.CANCELLED) {
      res.status(400).json({ error: 'Este orçamento já foi encerrado ou cancelado e não aceita mais alterações.' });
      return;
    }

    // Atualizar status individual de aprovação de cada produto informado
    for (const d of decisoesProdutos) {
      if (typeof d.aprovado === 'boolean' && d.id) {
        await prisma.oSItemProduct.updateMany({
          where: { id: d.id, ordemServicoId: os.id },
          data: { aprovado: d.aprovado },
        });
      }
    }

    // Atualizar status individual de aprovação de cada serviço informado
    for (const d of decisoesServicos) {
      if (typeof d.aprovado === 'boolean' && d.id) {
        await prisma.oSItemService.updateMany({
          where: { id: d.id, ordemServicoId: os.id },
          data: { aprovado: d.aprovado },
        });
      }
    }

    // Recalcular os totais no backend
    await recalcularEGuardarOS(os.id);

    // Se o cliente clicou em aprovar orçamento ou tomou uma decisão final
    let novoStatus: StatusOS = os.status;
    if (acaoFinal === 'APROVAR_TUDO' || acaoFinal === 'CONVERTER') {
      novoStatus = StatusOS.APPROVED;
    } else if (os.status === StatusOS.OPEN) {
      novoStatus = StatusOS.AWAITING_APPROVAL;
    }

    if (novoStatus !== os.status) {
      await prisma.ordemServico.update({
        where: { id: os.id },
        data: { status: novoStatus },
      });

      await prisma.oSStatusHistory.create({
        data: {
          ordemServicoId: os.id,
          statusAnterior: os.status,
          statusNovo: novoStatus,
          usuarioId: null, // indica alteração via portal público do cliente
        },
      });
    }

    res.json({ success: true, message: 'Decisão do orçamento registrada com sucesso!' });
  } catch (error) {
    console.error('Erro ao processar aprovação do orçamento:', error);
    res.status(500).json({ error: 'Erro interno ao registrar decisão do orçamento' });
  }
};

/**
 * Endpoint Administrativo: Converter Orçamento Aprovado em OS de Execução
 * POST /api/ordens-servico/:id/converter-os
 */
export const converterOrcamentoEmOS = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const os = await prisma.ordemServico.findUnique({
      where: { id },
      include: { produtos: true, servicos: true },
    });

    if (!os) {
      res.status(404).json({ error: 'Ordem de serviço não encontrada' });
      return;
    }

    if (os.status === StatusOS.IN_MAINTENANCE || os.status === StatusOS.AWAITING_PARTS || os.status === StatusOS.COMPLETED || os.status === StatusOS.BILLED) {
      res.status(400).json({ error: 'Esta OS já foi convertida ou já se encontra em execução/encerrada.' });
      return;
    }

    // Transicionar para APPROVED se ainda não estava e em seguida para IN_MAINTENANCE ou APPROVED conforme desejado
    const statusAnterior = os.status;
    const statusNovo = StatusOS.APPROVED;

    await prisma.ordemServico.update({
      where: { id: os.id },
      data: { status: statusNovo },
    });

    if (statusAnterior !== statusNovo) {
      await prisma.oSStatusHistory.create({
        data: {
          ordemServicoId: os.id,
          statusAnterior,
          statusNovo,
          usuarioId: (req as any).user?.id || null,
        },
      });
    }

    const osAtualizada = await recalcularEGuardarOS(os.id);
    res.json(osAtualizada);
  } catch (error) {
    console.error('Erro ao converter orçamento em OS:', error);
    res.status(500).json({ error: 'Erro interno ao converter orçamento em OS' });
  }
};
