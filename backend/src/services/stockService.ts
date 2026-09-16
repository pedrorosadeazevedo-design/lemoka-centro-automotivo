import { PrismaClient, StatusOS, TipoMovimentacao } from '@prisma/client';

const prisma = new PrismaClient();

export interface ProcessStockOptions {
  osId: string;
  statusAnterior: StatusOS;
  statusNovo: StatusOS;
  usuarioId?: string | null;
}

/**
 * Processa a sincronização de reservas e baixas de estoque de uma OS quando seu status muda.
 * Regras:
 * - OPEN / AWAITING_APPROVAL -> Nenhuma reserva.
 * - APPROVED / IN_MAINTENANCE / AWAITING_PARTS / COMPLETED -> Garante RESERVA dos produtos aprovados da OS.
 * - BILLED -> Transiciona de RESERVA para BAIXA DEFINITIVA (SAIDA) do estoque físico.
 * - CANCELLED -> Se havia reserva, faz LIBERACAO_RESERVA.
 */
export const processarEstoqueMudancaStatusOS = async (opts: ProcessStockOptions) => {
  const { osId, statusAnterior, statusNovo, usuarioId } = opts;

  // Se não mudou de categoria funcional de estoque, nada a fazer
  const isReservadoAnterior = isStatusComReserva(statusAnterior);
  const isReservadoNovo = isStatusComReserva(statusNovo);
  const isFaturadoAnterior = statusAnterior === StatusOS.BILLED;
  const isFaturadoNovo = statusNovo === StatusOS.BILLED;

  if (statusAnterior === statusNovo) return;

  const os = await prisma.ordemServico.findUnique({
    where: { id: osId },
    include: { produtos: true },
  });

  if (!os || !os.produtos || os.produtos.length === 0) return;

  const config = await prisma.empresaConfig.findFirst();
  const permitirEstoqueNegativo = config?.permitirEstoqueNegativo ?? true;

  await prisma.$transaction(async (tx) => {
    // CENÁRIO A: Entrando em status de RESERVA (APPROVED, IN_MAINTENANCE, AWAITING_PARTS, COMPLETED) vindo de não-reservado
    if (!isReservadoAnterior && !isFaturadoAnterior && isReservadoNovo) {
      for (const item of os.produtos) {
        if (!item.productId || item.aprovado === false) continue;

        const produto = await tx.produto.findUnique({ where: { id: item.productId } });
        if (!produto) continue;

        const qtd = Number(item.quantidade);
        const estFisico = Number(produto.estoqueFisico);
        const estRes = Number(produto.estoqueReservado);
        const estDisp = estFisico - estRes;

        if (!permitirEstoqueNegativo && estDisp < qtd) {
          throw new Error(`Estoque insuficiente para o produto "${produto.descricao}". Disponível: ${estDisp}, Necessário: ${qtd}`);
        }

        const novoReservado = estRes + qtd;

        await tx.produto.update({
          where: { id: produto.id },
          data: { estoqueReservado: novoReservado },
        });

        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: produto.id,
            tipo: TipoMovimentacao.RESERVA,
            quantidade: qtd,
            estoqueAnterior: estRes,
            estoquePosterior: novoReservado,
            usuarioId: usuarioId || null,
            origem: 'ORDEM_SERVICO',
            ordemServicoId: os.id,
            observacao: `Reserva referente à OS #${os.numeroOs} (Status: ${statusNovo})`,
          },
        });
      }
    }

    // CENÁRIO B: Faturando a OS (status BILLED)
    if (!isFaturadoAnterior && isFaturadoNovo) {
      for (const item of os.produtos) {
        if (!item.productId || item.aprovado === false) continue;

        const produto = await tx.produto.findUnique({ where: { id: item.productId } });
        if (!produto) continue;

        const qtd = Number(item.quantidade);
        const estFisico = Number(produto.estoqueFisico);
        const estRes = Number(produto.estoqueReservado);

        // Se veio de um status com reserva, remove da reserva e baixa do físico.
        // Se veio direto para BILLED vindo de OPEN/AWAITING, baixa direto do físico sem mexer no reservado.
        const abatimentoReserva = isReservadoAnterior ? Math.min(estRes, qtd) : 0;
        const novoFisico = estFisico - qtd;
        const novoReservado = Math.max(0, estRes - abatimentoReserva);

        if (!permitirEstoqueNegativo && novoFisico < 0) {
          throw new Error(`Estoque físico insuficiente para faturar o produto "${produto.descricao}". Físico atual: ${estFisico}, Necessário: ${qtd}`);
        }

        await tx.produto.update({
          where: { id: produto.id },
          data: {
            estoqueFisico: novoFisico,
            estoqueReservado: novoReservado,
          },
        });

        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: produto.id,
            tipo: TipoMovimentacao.SAIDA,
            quantidade: qtd,
            estoqueAnterior: estFisico,
            estoquePosterior: novoFisico,
            usuarioId: usuarioId || null,
            origem: 'ORDEM_SERVICO',
            ordemServicoId: os.id,
            observacao: `Baixa definitiva por faturamento da OS #${os.numeroOs}`,
          },
        });
      }
    }

    // CENÁRIO C: Cancelamento (CANCELLED) ou volta para OPEN / AWAITING vindo de status que tinha RESERVA
    if (isReservadoAnterior && (!isReservadoNovo && !isFaturadoNovo)) {
      for (const item of os.produtos) {
        if (!item.productId || item.aprovado === false) continue;

        const produto = await tx.produto.findUnique({ where: { id: item.productId } });
        if (!produto) continue;

        const qtd = Number(item.quantidade);
        const estRes = Number(produto.estoqueReservado);
        const novoReservado = Math.max(0, estRes - qtd);

        await tx.produto.update({
          where: { id: produto.id },
          data: { estoqueReservado: novoReservado },
        });

        await tx.movimentacaoEstoque.create({
          data: {
            produtoId: produto.id,
            tipo: TipoMovimentacao.LIBERACAO_RESERVA,
            quantidade: qtd,
            estoqueAnterior: estRes,
            estoquePosterior: novoReservado,
            usuarioId: usuarioId || null,
            origem: 'ORDEM_SERVICO',
            ordemServicoId: os.id,
            observacao: `Liberação de reserva da OS #${os.numeroOs} (Status alterado para: ${statusNovo})`,
          },
        });
      }
    }
  });
};

/**
 * Atualiza o ajuste de reserva de um item específico quando a quantidade é alterada ou o item é removido em uma OS ativa
 */
export const ajustarEstoqueItemOS = async (
  osId: string,
  productId: string,
  qtdAntiga: number,
  qtdNova: number,
  usuarioId?: string | null
) => {
  const os = await prisma.ordemServico.findUnique({ where: { id: osId } });
  if (!os || !isStatusComReserva(os.status)) return;

  const diferenca = qtdNova - qtdAntiga;
  if (diferenca === 0) return;

  const produto = await prisma.produto.findUnique({ where: { id: productId } });
  if (!produto) return;

  const config = await prisma.empresaConfig.findFirst();
  const permitirEstoqueNegativo = config?.permitirEstoqueNegativo ?? true;

  const estFisico = Number(produto.estoqueFisico);
  const estRes = Number(produto.estoqueReservado);
  const estDisp = estFisico - estRes;

  if (diferenca > 0 && !permitirEstoqueNegativo && estDisp < diferenca) {
    throw new Error(`Estoque indisponível para aumentar a quantidade de "${produto.descricao}". Disponível: ${estDisp}, Adicional necessário: ${diferenca}`);
  }

  const novoReservado = Math.max(0, estRes + diferenca);

  await prisma.produto.update({
    where: { id: produto.id },
    data: { estoqueReservado: novoReservado },
  });

  await prisma.movimentacaoEstoque.create({
    data: {
      produtoId: produto.id,
      tipo: diferenca > 0 ? TipoMovimentacao.RESERVA : TipoMovimentacao.LIBERACAO_RESERVA,
      quantidade: Math.abs(diferenca),
      estoqueAnterior: estRes,
      estoquePosterior: novoReservado,
      usuarioId: usuarioId || null,
      origem: 'ORDEM_SERVICO',
      ordemServicoId: os.id,
      observacao: diferenca > 0 
        ? `Aumento de item na OS #${os.numeroOs} (+${diferenca})` 
        : `Redução de item na OS #${os.numeroOs} (${diferenca})`,
    },
  });
};

export const isStatusComReserva = (status: StatusOS): boolean => {
  return (
    status === StatusOS.APPROVED ||
    status === StatusOS.IN_MAINTENANCE ||
    status === StatusOS.AWAITING_PARTS ||
    status === StatusOS.COMPLETED
  );
};
