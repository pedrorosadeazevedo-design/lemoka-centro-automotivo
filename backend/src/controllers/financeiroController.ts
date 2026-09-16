import { Request, Response } from 'express';
import { PrismaClient, StatusTitulo, TipoMovimentacaoFinanceira } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    papel: string;
  };
}

// Default Seed Categories for Plano de Contas
const DEFAULT_PLANO_CONTAS = [
  { codigo: '1.1', descricao: 'Venda de Peças e Produtos', tipo: 'RECEITA' },
  { codigo: '1.2', descricao: 'Prestação de Serviços', tipo: 'RECEITA' },
  { codigo: '1.3', descricao: 'Outras Receitas Operacionais', tipo: 'RECEITA' },
  { codigo: '2.1', descricao: 'Compra de Peças / Insumos', tipo: 'DESPESA' },
  { codigo: '2.2', descricao: 'Aluguel e Condomínio', tipo: 'DESPESA' },
  { codigo: '2.3', descricao: 'Energia, Água e Comunicação', tipo: 'DESPESA' },
  { codigo: '2.4', descricao: 'Folha de Pagamento e Salários', tipo: 'DESPESA' },
  { codigo: '2.5', descricao: 'Impostos e Taxas', tipo: 'DESPESA' },
  { codigo: '2.6', descricao: 'Marketing e Propaganda', tipo: 'DESPESA' },
  { codigo: '2.7', descricao: 'Manutenção e Equipamentos', tipo: 'DESPESA' },
  { codigo: '2.8', descricao: 'Despesas Diversas / Outros', tipo: 'DESPESA' },
];

/**
 * Helper para garantir categorias e contas padrão no banco
 */
async function autoSeedFinanceiro() {
  const countPlano = await prisma.planoContas.count();
  if (countPlano === 0) {
    for (const item of DEFAULT_PLANO_CONTAS) {
      await prisma.planoContas.create({ data: item });
    }
  }

  const countBancos = await prisma.contaBancaria.count();
  if (countBancos === 0) {
    await prisma.contaBancaria.create({
      data: {
        nome: 'Caixa Interno (Balcão)',
        tipo: 'CAIXA_FISICO',
        saldoInicial: 0,
        saldoAtual: 0,
        status: true,
      },
    });
    await prisma.contaBancaria.create({
      data: {
        nome: 'Conta Corrente Principal',
        banco: 'Banco Principal',
        tipo: 'CORRENTE',
        saldoInicial: 0,
        saldoAtual: 0,
        status: true,
      },
    });
  }
}

// ============================================================================
// 1. PLANO DE CONTAS
// ============================================================================

export const getPlanoContas = async (req: Request, res: Response): Promise<void> => {
  try {
    await autoSeedFinanceiro();
    const categorias = await prisma.planoContas.findMany({
      orderBy: { codigo: 'asc' },
    });
    res.json(categorias);
  } catch (error) {
    console.error('Erro ao buscar plano de contas:', error);
    res.status(500).json({ error: 'Erro ao buscar plano de contas' });
  }
};

export const createPlanoContas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo, descricao, tipo, categoriaPaiId } = req.body;
    if (!descricao || !tipo) {
      res.status(400).json({ error: 'Descrição e tipo (RECEITA/DESPESA) são obrigatórios.' });
      return;
    }

    const novaCategoria = await prisma.planoContas.create({
      data: {
        codigo: codigo || null,
        descricao,
        tipo,
        categoriaPaiId: categoriaPaiId || null,
      },
    });
    res.status(201).json(novaCategoria);
  } catch (error: any) {
    console.error('Erro ao criar categoria no plano de contas:', error);
    res.status(400).json({ error: error.message || 'Erro ao criar categoria' });
  }
};

export const updatePlanoContas = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { codigo, descricao, status } = req.body;

    const categoria = await prisma.planoContas.update({
      where: { id },
      data: {
        codigo: codigo ?? undefined,
        descricao: descricao ?? undefined,
        status: status !== undefined ? Boolean(status) : undefined,
      },
    });
    res.json(categoria);
  } catch (error) {
    console.error('Erro ao atualizar plano de contas:', error);
    res.status(500).json({ error: 'Erro ao atualizar categoria no plano de contas' });
  }
};

// ============================================================================
// 2. BANCOS E CONTAS FINANCEIRAS
// ============================================================================

export const getContasBancarias = async (req: Request, res: Response): Promise<void> => {
  try {
    await autoSeedFinanceiro();
    const contas = await prisma.contaBancaria.findMany({
      orderBy: { createdAt: 'asc' },
    });

    // Calcular saldos dinâmicos a partir do saldo inicial + movimentações ativas
    const contasComSaldo = await Promise.all(
      contas.map(async (conta) => {
        const movimentacoes = await prisma.movimentacaoFinanceira.findMany({
          where: { contaBancariaId: conta.id, estornado: false },
        });

        const entradas = movimentacoes
          .filter((m) => m.tipo === 'ENTRADA' || m.tipo === 'SUPRIMENTO')
          .reduce((sum, m) => sum + Number(m.valor), 0);

        const saidas = movimentacoes
          .filter((m) => m.tipo === 'SAIDA' || m.tipo === 'RETIRADA')
          .reduce((sum, m) => sum + Number(m.valor), 0);

        const saldoCalculado = Number(conta.saldoInicial) + entradas - saidas;

        return {
          ...conta,
          saldoAtual: saldoCalculado,
        };
      })
    );

    res.json(contasComSaldo);
  } catch (error) {
    console.error('Erro ao buscar contas bancárias:', error);
    res.status(500).json({ error: 'Erro ao buscar contas bancárias' });
  }
};

export const createContaBancaria = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nome, banco, agencia, conta, tipo, saldoInicial } = req.body;
    if (!nome) {
      res.status(400).json({ error: 'Nome da conta é obrigatório.' });
      return;
    }

    const sInicial = Number(saldoInicial) || 0;
    const novaConta = await prisma.contaBancaria.create({
      data: {
        nome,
        banco: banco || null,
        agencia: agencia || null,
        conta: conta || null,
        tipo: tipo || 'CORRENTE',
        saldoInicial: sInicial,
        saldoAtual: sInicial,
      },
    });
    res.status(201).json(novaConta);
  } catch (error) {
    console.error('Erro ao criar conta bancária:', error);
    res.status(500).json({ error: 'Erro ao criar conta bancária' });
  }
};

export const updateContaBancaria = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nome, banco, agencia, conta, tipo, status } = req.body;

    const contaAtualizada = await prisma.contaBancaria.update({
      where: { id },
      data: {
        nome: nome ?? undefined,
        banco: banco ?? undefined,
        agencia: agencia ?? undefined,
        conta: conta ?? undefined,
        tipo: tipo ?? undefined,
        status: status !== undefined ? Boolean(status) : undefined,
      },
    });
    res.json(contaAtualizada);
  } catch (error) {
    console.error('Erro ao atualizar conta bancária:', error);
    res.status(500).json({ error: 'Erro ao atualizar conta bancária' });
  }
};

// ============================================================================
// 3. SESSÃO DE CAIXA (ABERTURA, FECHAMENTO, SUPRIMENTO, RETIRADA)
// ============================================================================

export const getSessaoCaixaAtual = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessaoAberta = await prisma.sessaoCaixa.findFirst({
      where: { status: 'ABERTO' },
      include: {
        movimentacoes: {
          orderBy: { dataMovimentacao: 'desc' },
        },
      },
      orderBy: { dataAbertura: 'desc' },
    });

    if (!sessaoAberta) {
      res.json({ aberta: false, sessao: null });
      return;
    }

    // Calcular saldo atual do caixa
    const entradas = sessaoAberta.movimentacoes
      .filter((m) => (!m.estornado) && (m.tipo === 'ENTRADA' || m.tipo === 'SUPRIMENTO'))
      .reduce((sum, m) => sum + Number(m.valor), 0);

    const saidas = sessaoAberta.movimentacoes
      .filter((m) => (!m.estornado) && (m.tipo === 'SAIDA' || m.tipo === 'RETIRADA'))
      .reduce((sum, m) => sum + Number(m.valor), 0);

    const saldoCalculado = Number(sessaoAberta.saldoInicial) + entradas - saidas;

    res.json({
      aberta: true,
      sessao: {
        ...sessaoAberta,
        saldoCalculado,
        totais: {
          entradas,
          saidas,
          saldoInicial: Number(sessaoAberta.saldoInicial),
          saldoCalculado,
        },
      },
    });
  } catch (error) {
    console.error('Erro ao buscar caixa atual:', error);
    res.status(500).json({ error: 'Erro ao buscar caixa atual' });
  }
};

export const abrirCaixa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { saldoInicial, observacoes } = req.body;
    const usuarioId = req.user?.id || 'sistema';

    const caixaAbertoExistente = await prisma.sessaoCaixa.findFirst({
      where: { status: 'ABERTO' },
    });

    if (caixaAbertoExistente) {
      res.status(400).json({ error: 'Já existe um caixa aberto no sistema. Feche-o antes de abrir um novo.' });
      return;
    }

    const valInicial = Number(saldoInicial) || 0;
    const novaSessao = await prisma.sessaoCaixa.create({
      data: {
        usuarioId,
        saldoInicial: valInicial,
        saldoCalculado: valInicial,
        status: 'ABERTO',
        observacoes,
      },
    });

    res.status(201).json(novaSessao);
  } catch (error) {
    console.error('Erro ao abrir caixa:', error);
    res.status(500).json({ error: 'Erro ao abrir caixa' });
  }
};

export const fecharCaixa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { saldoInformado, observacoes } = req.body;

    const sessao = await prisma.sessaoCaixa.findUnique({
      where: { id },
      include: { movimentacoes: true },
    });

    if (!sessao || sessao.status !== 'ABERTO') {
      res.status(400).json({ error: 'Sessão de caixa não encontrada ou já encerrada.' });
      return;
    }

    const entradas = sessao.movimentacoes
      .filter((m) => (!m.estornado) && (m.tipo === 'ENTRADA' || m.tipo === 'SUPRIMENTO'))
      .reduce((sum, m) => sum + Number(m.valor), 0);

    const saidas = sessao.movimentacoes
      .filter((m) => (!m.estornado) && (m.tipo === 'SAIDA' || m.tipo === 'RETIRADA'))
      .reduce((sum, m) => sum + Number(m.valor), 0);

    const saldoCalculado = Number(sessao.saldoInicial) + entradas - saidas;
    const saldoInf = Number(saldoInformado) || 0;
    const diferenca = saldoInf - saldoCalculado;

    const sessaoFechada = await prisma.sessaoCaixa.update({
      where: { id },
      data: {
        status: 'FECHADO',
        dataFechamento: new Date(),
        saldoCalculado,
        saldoInformado: saldoInf,
        diferenca,
        observacoes: observacoes ?? sessao.observacoes,
      },
    });

    res.json(sessaoFechada);
  } catch (error) {
    console.error('Erro ao fechar caixa:', error);
    res.status(500).json({ error: 'Erro ao fechar caixa' });
  }
};

export const suprimentoCaixa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { valor, descricao, contaBancariaId } = req.body;
    const usuarioId = req.user?.id || 'sistema';

    if (!valor || Number(valor) <= 0) {
      res.status(400).json({ error: 'Valor de suprimento deve ser maior que zero.' });
      return;
    }

    const sessaoAberta = await prisma.sessaoCaixa.findFirst({ where: { status: 'ABERTO' } });
    const val = Number(valor);

    const mov = await prisma.movimentacaoFinanceira.create({
      data: {
        tipo: TipoMovimentacaoFinanceira.SUPRIMENTO,
        descricao: descricao || 'Suprimento de Caixa',
        valor: val,
        origem: 'SUPRIMENTO',
        usuarioId,
        sessaoCaixaId: sessaoAberta ? sessaoAberta.id : null,
        contaBancariaId: contaBancariaId || null,
      },
    });

    res.status(201).json(mov);
  } catch (error) {
    console.error('Erro ao registrar suprimento:', error);
    res.status(500).json({ error: 'Erro ao registrar suprimento' });
  }
};

export const retiradaCaixa = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { valor, descricao, contaBancariaId } = req.body;
    const usuarioId = req.user?.id || 'sistema';

    if (!valor || Number(valor) <= 0) {
      res.status(400).json({ error: 'Valor de sangria/retirada deve ser maior que zero.' });
      return;
    }

    if (!descricao) {
      res.status(400).json({ error: 'Motivo/descrição da sangria/retirada é obrigatório.' });
      return;
    }

    const sessaoAberta = await prisma.sessaoCaixa.findFirst({ where: { status: 'ABERTO' } });
    const val = Number(valor);

    const mov = await prisma.movimentacaoFinanceira.create({
      data: {
        tipo: TipoMovimentacaoFinanceira.RETIRADA,
        descricao: `Retirada/Sangria: ${descricao}`,
        valor: val,
        origem: 'RETIRADA',
        usuarioId,
        sessaoCaixaId: sessaoAberta ? sessaoAberta.id : null,
        contaBancariaId: contaBancariaId || null,
      },
    });

    res.status(201).json(mov);
  } catch (error) {
    console.error('Erro ao registrar retirada:', error);
    res.status(500).json({ error: 'Erro ao registrar retirada' });
  }
};

export const getHistoricoCaixa = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessoes = await prisma.sessaoCaixa.findMany({
      include: {
        movimentacoes: true,
      },
      orderBy: { dataAbertura: 'desc' },
      take: 50,
    });
    res.json(sessoes);
  } catch (error) {
    console.error('Erro ao buscar histórico de caixas:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico de caixas' });
  }
};

// ============================================================================
// 4. CONTAS A RECEBER
// ============================================================================

export const getContasReceber = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, clienteId, q, inicio, fim } = req.query;
    let whereClause: any = {};

    if (clienteId && typeof clienteId === 'string') {
      whereClause.clienteId = clienteId;
    }

    if (inicio && fim) {
      whereClause.dataVencimento = {
        gte: new Date(inicio as string),
        lte: new Date(fim as string),
      };
    }

    if (q && typeof q === 'string' && q.trim() !== '') {
      const search = q.trim();
      const numTit = parseInt(search);

      whereClause.OR = [
        ...(!isNaN(numTit) ? [{ numeroTitulo: numTit }] : []),
        { titulo: { contains: search, mode: 'insensitive' } },
        { cliente: { nome: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const titulos = await prisma.contaReceber.findMany({
      where: whereClause,
      include: {
        cliente: true,
        ordemServico: true,
        planoContas: true,
        movimentacoes: {
          orderBy: { dataMovimentacao: 'desc' },
        },
      },
      orderBy: { dataVencimento: 'asc' },
    });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Calcular status dinâmico para VENCIDO caso dataVencimento < hoje e saldo > 0
    const titulosComStatus = titulos.map((t) => {
      let st = t.status;
      const emAberto = Number(t.valorEmAberto);
      const venc = new Date(t.dataVencimento);
      venc.setHours(0, 0, 0, 0);

      if (st !== StatusTitulo.CANCELADO && st !== StatusTitulo.LIQUIDADO) {
        if (emAberto > 0 && venc < hoje) {
          st = StatusTitulo.VENCIDO;
        }
      }

      if (status && typeof status === 'string' && status !== 'ALL' && st !== status) {
        return null;
      }

      return {
        ...t,
        statusCalculado: st,
      };
    }).filter(Boolean);

    res.json(titulosComStatus);
  } catch (error) {
    console.error('Erro ao buscar contas a receber:', error);
    res.status(500).json({ error: 'Erro ao buscar contas a receber' });
  }
};

export const createContaReceber = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      titulo,
      origem = 'MANUAL',
      ordemServicoId,
      clienteId,
      planoContasId,
      parcelas = 1,
      dataVencimento,
      valorTotal,
      desconto = 0,
      acrescimo = 0,
      observacoes,
    } = req.body;

    if (!titulo || !dataVencimento || !valorTotal || Number(valorTotal) <= 0) {
      res.status(400).json({ error: 'Título, data de vencimento e valor total válido são obrigatórios.' });
      return;
    }

    const usuarioId = req.user?.id || null;
    const totalParc = Math.max(1, Number(parcelas) || 1);
    const vBrutoTotal = Number(valorTotal);
    const vDescTotal = Number(desconto) || 0;
    const vAcrTotal = Number(acrescimo) || 0;
    const vLiqTotal = Math.max(0, vBrutoTotal - vDescTotal + vAcrTotal);

    const valorBrutoParcela = +(vBrutoTotal / totalParc).toFixed(2);
    const valorDescParcela = +(vDescTotal / totalParc).toFixed(2);
    const valorAcrParcela = +(vAcrTotal / totalParc).toFixed(2);
    const valorLiqParcela = +(vLiqTotal / totalParc).toFixed(2);

    const baseVencimento = new Date(dataVencimento);
    const titulosCriados = [];

    for (let i = 1; i <= totalParc; i++) {
      const vencParc = new Date(baseVencimento);
      if (i > 1) {
        vencParc.setMonth(vencParc.getMonth() + (i - 1));
      }

      const numParcelaLabel = totalParc > 1 ? ` (${i}/${totalParc})` : '';

      const novo = await prisma.contaReceber.create({
        data: {
          titulo: `${titulo}${numParcelaLabel}`,
          origem,
          ordemServicoId: ordemServicoId || null,
          clienteId: clienteId || null,
          planoContasId: planoContasId || null,
          parcelaAtual: i,
          totalParcelas: totalParc,
          dataVencimento: vencParc,
          valorBruto: valorBrutoParcela,
          desconto: valorDescParcela,
          acrescimo: valorAcrParcela,
          valorLiquido: valorLiqParcela,
          valorPago: 0,
          valorEmAberto: valorLiqParcela,
          status: StatusTitulo.ABERTO,
          observacoes,
          usuarioId,
        },
      });

      titulosCriados.push(novo);
    }

    res.status(201).json(titulosCriados);
  } catch (error) {
    console.error('Erro ao criar conta a receber:', error);
    res.status(500).json({ error: 'Erro ao criar conta a receber' });
  }
};

export const receberTitulo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      valorRecebido,
      dataRecebimento,
      contaBancariaId,
      formaPagamento,
      jurosMulta = 0,
      descontoConcedido = 0,
      observacoes,
    } = req.body;

    const usuarioId = req.user?.id || 'sistema';

    if (!valorRecebido || Number(valorRecebido) <= 0) {
      res.status(400).json({ error: 'Valor recebido deve ser maior que zero.' });
      return;
    }

    // TRANSAÇÃO IDEMPOTENTE PARA EVITAR DUPLA BAIXA
    const resultado = await prisma.$transaction(async (tx) => {
      const titulo = await tx.contaReceber.findUnique({
        where: { id },
      });

      if (!titulo) {
        throw new Error('Título não encontrado.');
      }

      if (titulo.status === StatusTitulo.LIQUIDADO || titulo.status === StatusTitulo.CANCELADO) {
        throw new Error(`Este título já se encontra ${titulo.status}.`);
      }

      const valPagoAtual = Number(titulo.valorPago);
      const valAbertoAtual = Number(titulo.valorEmAberto);
      const valRecebido = Number(valorRecebido);
      const valJuros = Number(jurosMulta) || 0;
      const valDesc = Number(descontoConcedido) || 0;

      const novoPago = valPagoAtual + valRecebido;
      const novoEmAberto = Math.max(0, valAbertoAtual - valRecebido + valJuros - valDesc);
      const novoStatus = novoEmAberto <= 0.01 ? StatusTitulo.LIQUIDADO : StatusTitulo.PARCIAL;

      // Buscar sessão de caixa ativa se for pagamento em caixa
      const sessaoAberta = await tx.sessaoCaixa.findFirst({ where: { status: 'ABERTO' } });

      // 1. Atualizar título a receber
      const tituloAtualizado = await tx.contaReceber.update({
        where: { id },
        data: {
          valorPago: novoPago,
          valorEmAberto: novoEmAberto,
          jurosMulta: Number(titulo.jurosMulta) + valJuros,
          desconto: Number(titulo.desconto) + valDesc,
          status: novoStatus,
          dataBaixa: new Date(dataRecebimento || Date.now()),
          formaPagamento: formaPagamento || titulo.formaPagamento,
        },
      });

      // 2. Gerar Movimentação Financeira (+ Entrada)
      const mov = await tx.movimentacaoFinanceira.create({
        data: {
          tipo: TipoMovimentacaoFinanceira.ENTRADA,
          descricao: `Recebimento Título #${titulo.numeroTitulo}: ${titulo.titulo}`,
          valor: valRecebido,
          origem: titulo.origem === 'ORDEM_SERVICO' ? 'ORDEM_SERVICO' : 'CONTAS_RECEBER',
          formaPagamento: formaPagamento || 'DINHEIRO',
          contaReceberId: titulo.id,
          contaBancariaId: contaBancariaId || null,
          sessaoCaixaId: sessaoAberta ? sessaoAberta.id : null,
          planoContasId: titulo.planoContasId || null,
          usuarioId,
          observacoes,
        },
      });

      return { titulo: tituloAtualizado, movimentacao: mov };
    });

    res.json(resultado);
  } catch (error: any) {
    console.error('Erro ao receber título:', error);
    res.status(400).json({ error: error.message || 'Erro ao processar recebimento' });
  }
};

export const estornarRecebimento = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuarioId = req.user?.id || 'sistema';

    if (!motivo) {
      res.status(400).json({ error: 'Motivo do estorno é obrigatório.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const titulo = await tx.contaReceber.findUnique({
        where: { id },
        include: { movimentacoes: { where: { estornado: false } } },
      });

      if (!titulo) throw new Error('Título não encontrado.');
      if (titulo.movimentacoes.length === 0) throw new Error('Não há recebimentos ativos para estornar neste título.');

      // Marcar movimentações ativas como estornadas
      for (const mov of titulo.movimentacoes) {
        await tx.movimentacaoFinanceira.update({
          where: { id: mov.id },
          data: {
            estornado: true,
            motivoEstorno: motivo,
            dataEstorno: new Date(),
          },
        });

        // Gerar movimentação oposta (- Entrada)
        await tx.movimentacaoFinanceira.create({
          data: {
            tipo: TipoMovimentacaoFinanceira.SAIDA,
            descricao: `ESTORNO DE RECEBIMENTO Título #${titulo.numeroTitulo}: ${motivo}`,
            valor: Number(mov.valor),
            origem: 'ESTORNO',
            contaReceberId: titulo.id,
            contaBancariaId: mov.contaBancariaId,
            sessaoCaixaId: mov.sessaoCaixaId,
            usuarioId,
          },
        });
      }

      // Restaurar valores e status original do título
      await tx.contaReceber.update({
        where: { id },
        data: {
          valorPago: 0,
          valorEmAberto: Number(titulo.valorLiquido),
          status: StatusTitulo.ABERTO,
          dataBaixa: null,
        },
      });
    });

    res.json({ message: 'Recebimento estornado com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao estornar recebimento:', error);
    res.status(400).json({ error: error.message || 'Erro ao estornar recebimento' });
  }
};

// ============================================================================
// 5. CONTAS A PAGAR
// ============================================================================

export const getContasPagar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, fornecedorId, q, inicio, fim } = req.query;
    let whereClause: any = {};

    if (fornecedorId && typeof fornecedorId === 'string') {
      whereClause.fornecedorId = fornecedorId;
    }

    if (inicio && fim) {
      whereClause.dataVencimento = {
        gte: new Date(inicio as string),
        lte: new Date(fim as string),
      };
    }

    if (q && typeof q === 'string' && q.trim() !== '') {
      const search = q.trim();
      const numTit = parseInt(search);

      whereClause.OR = [
        ...(!isNaN(numTit) ? [{ numeroTitulo: numTit }] : []),
        { titulo: { contains: search, mode: 'insensitive' } },
        { fornecedor: { razaoSocial: { contains: search, mode: 'insensitive' } } },
        { fornecedor: { nomeFantasia: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const titulos = await prisma.contaPagar.findMany({
      where: whereClause,
      include: {
        fornecedor: true,
        compra: true,
        planoContas: true,
        movimentacoes: {
          orderBy: { dataMovimentacao: 'desc' },
        },
      },
      orderBy: { dataVencimento: 'asc' },
    });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const titulosComStatus = titulos.map((t) => {
      let st = t.status;
      const emAberto = Number(t.valorEmAberto);
      const venc = new Date(t.dataVencimento);
      venc.setHours(0, 0, 0, 0);

      if (st !== StatusTitulo.CANCELADO && st !== StatusTitulo.LIQUIDADO) {
        if (emAberto > 0 && venc < hoje) {
          st = StatusTitulo.VENCIDO;
        }
      }

      if (status && typeof status === 'string' && status !== 'ALL' && st !== status) {
        return null;
      }

      return {
        ...t,
        statusCalculado: st,
      };
    }).filter(Boolean);

    res.json(titulosComStatus);
  } catch (error) {
    console.error('Erro ao buscar contas a pagar:', error);
    res.status(500).json({ error: 'Erro ao buscar contas a pagar' });
  }
};

export const createContaPagar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      titulo,
      origem = 'MANUAL',
      compraId,
      fornecedorId,
      planoContasId,
      parcelas = 1,
      dataVencimento,
      valorTotal,
      desconto = 0,
      acrescimo = 0,
      observacoes,
    } = req.body;

    if (!titulo || !dataVencimento || !valorTotal || Number(valorTotal) <= 0) {
      res.status(400).json({ error: 'Título, data de vencimento e valor total válido são obrigatórios.' });
      return;
    }

    const usuarioId = req.user?.id || null;
    const totalParc = Math.max(1, Number(parcelas) || 1);
    const vBrutoTotal = Number(valorTotal);
    const vDescTotal = Number(desconto) || 0;
    const vAcrTotal = Number(acrescimo) || 0;
    const vLiqTotal = Math.max(0, vBrutoTotal - vDescTotal + vAcrTotal);

    const valorBrutoParcela = +(vBrutoTotal / totalParc).toFixed(2);
    const valorDescParcela = +(vDescTotal / totalParc).toFixed(2);
    const valorAcrParcela = +(vAcrTotal / totalParc).toFixed(2);
    const valorLiqParcela = +(vLiqTotal / totalParc).toFixed(2);

    const baseVencimento = new Date(dataVencimento);
    const titulosCriados = [];

    for (let i = 1; i <= totalParc; i++) {
      const vencParc = new Date(baseVencimento);
      if (i > 1) {
        vencParc.setMonth(vencParc.getMonth() + (i - 1));
      }

      const numParcelaLabel = totalParc > 1 ? ` (${i}/${totalParc})` : '';

      const novo = await prisma.contaPagar.create({
        data: {
          titulo: `${titulo}${numParcelaLabel}`,
          origem,
          compraId: compraId || null,
          fornecedorId: fornecedorId || null,
          planoContasId: planoContasId || null,
          parcelaAtual: i,
          totalParcelas: totalParc,
          dataVencimento: vencParc,
          valorBruto: valorBrutoParcela,
          desconto: valorDescParcela,
          acrescimo: valorAcrParcela,
          valorLiquido: valorLiqParcela,
          valorPago: 0,
          valorEmAberto: valorLiqParcela,
          status: StatusTitulo.ABERTO,
          observacoes,
          usuarioId,
        },
      });

      titulosCriados.push(novo);
    }

    res.status(201).json(titulosCriados);
  } catch (error) {
    console.error('Erro ao criar conta a pagar:', error);
    res.status(500).json({ error: 'Erro ao criar conta a pagar' });
  }
};

export const pagarTitulo = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      valorPago,
      dataPagamento,
      contaBancariaId,
      formaPagamento,
      jurosMulta = 0,
      descontoObtido = 0,
      observacoes,
    } = req.body;

    const usuarioId = req.user?.id || 'sistema';

    if (!valorPago || Number(valorPago) <= 0) {
      res.status(400).json({ error: 'Valor pago deve ser maior que zero.' });
      return;
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const titulo = await tx.contaPagar.findUnique({
        where: { id },
      });

      if (!titulo) {
        throw new Error('Título a pagar não encontrado.');
      }

      if (titulo.status === StatusTitulo.LIQUIDADO || titulo.status === StatusTitulo.CANCELADO) {
        throw new Error(`Este título já se encontra ${titulo.status}.`);
      }

      const valPagoAtual = Number(titulo.valorPago);
      const valAbertoAtual = Number(titulo.valorEmAberto);
      const valEfetuado = Number(valorPago);
      const valJuros = Number(jurosMulta) || 0;
      const valDesc = Number(descontoObtido) || 0;

      const novoPago = valPagoAtual + valEfetuado;
      const novoEmAberto = Math.max(0, valAbertoAtual - valEfetuado + valJuros - valDesc);
      const novoStatus = novoEmAberto <= 0.01 ? StatusTitulo.LIQUIDADO : StatusTitulo.PARCIAL;

      const sessaoAberta = await tx.sessaoCaixa.findFirst({ where: { status: 'ABERTO' } });

      // 1. Atualizar conta a pagar
      const tituloAtualizado = await tx.contaPagar.update({
        where: { id },
        data: {
          valorPago: novoPago,
          valorEmAberto: novoEmAberto,
          jurosMulta: Number(titulo.jurosMulta) + valJuros,
          desconto: Number(titulo.desconto) + valDesc,
          status: novoStatus,
          dataBaixa: new Date(dataPagamento || Date.now()),
          formaPagamento: formaPagamento || titulo.formaPagamento,
        },
      });

      // 2. Gerar Movimentação Financeira (- Saída)
      const mov = await tx.movimentacaoFinanceira.create({
        data: {
          tipo: TipoMovimentacaoFinanceira.SAIDA,
          descricao: `Pagamento Título #${titulo.numeroTitulo}: ${titulo.titulo}`,
          valor: valEfetuado,
          origem: titulo.origem === 'COMPRA' ? 'COMPRA' : 'CONTAS_PAGAR',
          formaPagamento: formaPagamento || 'DINHEIRO',
          contaPagarId: titulo.id,
          contaBancariaId: contaBancariaId || null,
          sessaoCaixaId: sessaoAberta ? sessaoAberta.id : null,
          planoContasId: titulo.planoContasId || null,
          usuarioId,
          observacoes,
        },
      });

      return { titulo: tituloAtualizado, movimentacao: mov };
    });

    res.json(resultado);
  } catch (error: any) {
    console.error('Erro ao pagar título:', error);
    res.status(400).json({ error: error.message || 'Erro ao processar pagamento' });
  }
};

export const estornarPagamento = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuarioId = req.user?.id || 'sistema';

    if (!motivo) {
      res.status(400).json({ error: 'Motivo do estorno é obrigatório.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      const titulo = await tx.contaPagar.findUnique({
        where: { id },
        include: { movimentacoes: { where: { estornado: false } } },
      });

      if (!titulo) throw new Error('Título não encontrado.');
      if (titulo.movimentacoes.length === 0) throw new Error('Não há pagamentos ativos para estornar neste título.');

      for (const mov of titulo.movimentacoes) {
        await tx.movimentacaoFinanceira.update({
          where: { id: mov.id },
          data: {
            estornado: true,
            motivoEstorno: motivo,
            dataEstorno: new Date(),
          },
        });

        // Gerar movimentação oposta (+ Entrada)
        await tx.movimentacaoFinanceira.create({
          data: {
            tipo: TipoMovimentacaoFinanceira.ENTRADA,
            descricao: `ESTORNO DE PAGAMENTO Título #${titulo.numeroTitulo}: ${motivo}`,
            valor: Number(mov.valor),
            origem: 'ESTORNO',
            contaPagarId: titulo.id,
            contaBancariaId: mov.contaBancariaId,
            sessaoCaixaId: mov.sessaoCaixaId,
            usuarioId,
          },
        });
      }

      await tx.contaPagar.update({
        where: { id },
        data: {
          valorPago: 0,
          valorEmAberto: Number(titulo.valorLiquido),
          status: StatusTitulo.ABERTO,
          dataBaixa: null,
        },
      });
    });

    res.json({ message: 'Pagamento estornado com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao estornar pagamento:', error);
    res.status(400).json({ error: error.message || 'Erro ao estornar pagamento' });
  }
};

// ============================================================================
// 6. TRANSFERÊNCIAS ENTRE CONTAS / CAIXA ↔ BANCO
// ============================================================================

export const transferirFundos = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { contaOrigemId, contaDestinoId, valor, descricao } = req.body;
    const usuarioId = req.user?.id || 'sistema';

    if (!contaOrigemId || !contaDestinoId || !valor || Number(valor) <= 0) {
      res.status(400).json({ error: 'Conta de origem, conta de destino e valor válido são obrigatórios.' });
      return;
    }

    if (contaOrigemId === contaDestinoId) {
      res.status(400).json({ error: 'Conta de origem e destino devem ser diferentes.' });
      return;
    }

    const val = Number(valor);

    const resultado = await prisma.$transaction(async (tx) => {
      const origem = await tx.contaBancaria.findUnique({ where: { id: contaOrigemId } });
      const destino = await tx.contaBancaria.findUnique({ where: { id: contaDestinoId } });

      if (!origem || !destino) {
        throw new Error('Conta bancária de origem ou destino não encontrada.');
      }

      const desc = descricao || `Transferência de ${origem.nome} para ${destino.nome}`;

      // Gerar saída da conta origem
      const movSaida = await tx.movimentacaoFinanceira.create({
        data: {
          tipo: TipoMovimentacaoFinanceira.SAIDA,
          descricao: `[SAÍDA TRANSFERÊNCIA] ${desc}`,
          valor: val,
          origem: 'TRANSFERENCIA',
          contaBancariaId: origem.id,
          usuarioId,
        },
      });

      // Gerar entrada na conta destino
      const movEntrada = await tx.movimentacaoFinanceira.create({
        data: {
          tipo: TipoMovimentacaoFinanceira.ENTRADA,
          descricao: `[ENTRADA TRANSFERÊNCIA] ${desc}`,
          valor: val,
          origem: 'TRANSFERENCIA',
          contaBancariaId: destino.id,
          usuarioId,
        },
      });

      return { movSaida, movEntrada };
    });

    res.status(201).json(resultado);
  } catch (error: any) {
    console.error('Erro ao transferir fundos:', error);
    res.status(400).json({ error: error.message || 'Erro ao realizar transferência' });
  }
};

// ============================================================================
// 7. DASHBOARD FINANCEIRO & FLUXO DE CAIXA
// ============================================================================

export const getDashboardFinanceiro = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inicio, fim } = req.query;

    const dataInicio = inicio ? new Date(inicio as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const dataFim = fim ? new Date(fim as string) : new Date();

    // 1. Saldo de Caixas e Bancos
    const contas = await prisma.contaBancaria.findMany({ where: { status: true } });
    let saldoCaixaTotal = 0;
    let saldoBancosTotal = 0;

    for (const c of contas) {
      const movs = await prisma.movimentacaoFinanceira.findMany({
        where: { contaBancariaId: c.id, estornado: false },
      });
      const ent = movs.filter((m) => m.tipo === 'ENTRADA' || m.tipo === 'SUPRIMENTO').reduce((s, m) => s + Number(m.valor), 0);
      const sai = movs.filter((m) => m.tipo === 'SAIDA' || m.tipo === 'RETIRADA').reduce((s, m) => s + Number(m.valor), 0);
      const s = Number(c.saldoInicial) + ent - sai;

      if (c.tipo === 'CAIXA_FISICO') {
        saldoCaixaTotal += s;
      } else {
        saldoBancosTotal += s;
      }
    }

    // 2. Contas a Receber (Em aberto / Vencidas)
    const contasReceber = await prisma.contaReceber.findMany({
      where: { status: { notIn: [StatusTitulo.CANCELADO, StatusTitulo.LIQUIDADO] } },
    });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    let totalAReceber = 0;
    let vencidoAReceber = 0;

    for (const r of contasReceber) {
      const val = Number(r.valorEmAberto);
      totalAReceber += val;
      const v = new Date(r.dataVencimento);
      v.setHours(0, 0, 0, 0);
      if (v < hoje) {
        vencidoAReceber += val;
      }
    }

    // 3. Contas a Pagar (Em aberto / Vencidas)
    const contasPagar = await prisma.contaPagar.findMany({
      where: { status: { notIn: [StatusTitulo.CANCELADO, StatusTitulo.LIQUIDADO] } },
    });

    let totalAPagar = 0;
    let vencidoAPagar = 0;

    for (const p of contasPagar) {
      const val = Number(p.valorEmAberto);
      totalAPagar += val;
      const v = new Date(p.dataVencimento);
      v.setHours(0, 0, 0, 0);
      if (v < hoje) {
        vencidoAPagar += val;
      }
    }

    // 4. Entradas e Saídas Efetivas no Período (Movimentações de Caixa/Banco)
    const movsPeriodo = await prisma.movimentacaoFinanceira.findMany({
      where: {
        estornado: false,
        dataMovimentacao: {
          gte: dataInicio,
          lte: dataFim,
        },
      },
    });

    const entradasPeriodo = movsPeriodo
      .filter((m) => (m.tipo === 'ENTRADA' || m.tipo === 'SUPRIMENTO') && m.origem !== 'TRANSFERENCIA')
      .reduce((s, m) => s + Number(m.valor), 0);

    const saidasPeriodo = movsPeriodo
      .filter((m) => (m.tipo === 'SAIDA' || m.tipo === 'RETIRADA') && m.origem !== 'TRANSFERENCIA')
      .reduce((s, m) => s + Number(m.valor), 0);

    const resultadoPeriodo = entradasPeriodo - saidasPeriodo;

    res.json({
      saldoCaixaTotal,
      saldoBancosTotal,
      saldoDisponivelTotal: saldoCaixaTotal + saldoBancosTotal,
      totalAReceber,
      vencidoAReceber,
      totalAPagar,
      vencidoAPagar,
      entradasPeriodo,
      saidasPeriodo,
      resultadoPeriodo,
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard financeiro:', error);
    res.status(500).json({ error: 'Erro ao carregar indicador financeiro' });
  }
};

export const getFluxoCaixa = async (req: Request, res: Response): Promise<void> => {
  try {
    const { inicio, fim, contaBancariaId } = req.query;

    let whereClause: any = { estornado: false };

    if (contaBancariaId && typeof contaBancariaId === 'string') {
      whereClause.contaBancariaId = contaBancariaId;
    }

    if (inicio && fim) {
      whereClause.dataMovimentacao = {
        gte: new Date(inicio as string),
        lte: new Date(fim as string),
      };
    }

    const movimentacoes = await prisma.movimentacaoFinanceira.findMany({
      where: whereClause,
      include: {
        planoContas: true,
        contaBancaria: true,
      },
      orderBy: { dataMovimentacao: 'desc' },
      take: 100,
    });

    res.json(movimentacoes);
  } catch (error) {
    console.error('Erro ao buscar fluxo de caixa:', error);
    res.status(500).json({ error: 'Erro ao carregar fluxo de caixa' });
  }
};

// ============================================================================
// HELPER INTERNAL FUNCTIONS FOR AUTO-GENERATING FINANCIAL TITLES
// ============================================================================

/**
 * Auto-gera Conta a Receber a partir de uma OS faturada
 */
export async function autoGerarContaReceberOS(ordemServicoId: string, usuarioId?: string) {
  const os = await prisma.ordemServico.findUnique({
    where: { id: ordemServicoId },
    include: { cliente: true },
  });

  if (!os || Number(os.valorTotal) <= 0) return;

  const existente = await prisma.contaReceber.findFirst({
    where: { ordemServicoId },
  });

  if (existente) return; // idempotente

  const vTotal = Number(os.valorTotal);
  const dataVenc = new Date();
  dataVenc.setDate(dataVenc.getDate() + 30); // Padrão +30 dias se a prazo

  await prisma.contaReceber.create({
    data: {
      titulo: `OS #${os.numeroOs} - ${os.cliente?.nome || 'Cliente'}`,
      origem: 'ORDEM_SERVICO',
      ordemServicoId: os.id,
      clienteId: os.clienteId,
      parcelaAtual: 1,
      totalParcelas: 1,
      dataVencimento: dataVenc,
      valorBruto: vTotal,
      desconto: 0,
      acrescimo: 0,
      valorLiquido: vTotal,
      valorPago: 0,
      valorEmAberto: vTotal,
      status: StatusTitulo.ABERTO,
      formaPagamento: os.formaPagamento || 'A PRAZO',
      usuarioId: usuarioId || null,
    },
  });
}

/**
 * Auto-gera Conta a Pagar a partir de uma Compra confirmada
 */
export async function autoGerarContaPagarCompra(compraId: string, usuarioId?: string) {
  const compra = await prisma.compra.findUnique({
    where: { id: compraId },
    include: { fornecedor: true },
  });

  if (!compra || Number(compra.valorTotal) <= 0) return;

  const existente = await prisma.contaPagar.findFirst({
    where: { compraId },
  });

  if (existente) return; // idempotente

  const vTotal = Number(compra.valorTotal);
  const dataVenc = new Date();
  dataVenc.setDate(dataVenc.getDate() + 30);

  await prisma.contaPagar.create({
    data: {
      titulo: `Compra #${compra.numeroCompra} - ${compra.fornecedor?.nomeFantasia || compra.fornecedor?.razaoSocial || 'Fornecedor'}`,
      origem: 'COMPRA',
      compraId: compra.id,
      fornecedorId: compra.fornecedorId,
      parcelaAtual: 1,
      totalParcelas: 1,
      dataVencimento: dataVenc,
      valorBruto: vTotal,
      desconto: 0,
      acrescimo: 0,
      valorLiquido: vTotal,
      valorPago: 0,
      valorEmAberto: vTotal,
      status: StatusTitulo.ABERTO,
      usuarioId: usuarioId || null,
    },
  });
}
