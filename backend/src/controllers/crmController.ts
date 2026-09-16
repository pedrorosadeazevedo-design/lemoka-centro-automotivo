import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    papel: string;
  };
}

/**
 * Auto-gera previsões de retorno quando uma OS é concluída/faturada
 */
export async function autoGerarPrevisoesRetornoOS(ordemServicoId: string, usuarioId?: string) {
  const os = await prisma.ordemServico.findUnique({
    where: { id: ordemServicoId },
    include: {
      veiculo: true,
      servicos: {
        include: { servico: true },
      },
    },
  });

  if (!os || !os.clienteId || !os.veiculoId) return;

  const kmOS = os.veiculo?.quilometragemAtual || 0;
  const dataBase = os.dataFechamento || new Date();

  for (const itemServ of os.servicos) {
    const servObj = itemServ.servico;
    if (!servObj || !servObj.geraPrevisaoRetorno) continue;

    let dataPrev: Date | null = null;
    let kmPrev: number | null = null;

    if (servObj.intervaloDiasRetorno && servObj.intervaloDiasRetorno > 0) {
      dataPrev = new Date(dataBase);
      dataPrev.setDate(dataPrev.getDate() + servObj.intervaloDiasRetorno);
    }

    if (servObj.intervaloKmRetorno && servObj.intervaloKmRetorno > 0) {
      kmPrev = kmOS + servObj.intervaloKmRetorno;
    }

    if (!dataPrev && !kmPrev) continue;

    // Idempotência: verificar se já existe previsão idêntica para esta OS + serviço
    const existente = await prisma.previsaoRetorno.findFirst({
      where: {
        ordemServicoId: os.id,
        servicoId: servObj.id,
      },
    });

    if (existente) continue;

    await prisma.previsaoRetorno.create({
      data: {
        clienteId: os.clienteId,
        veiculoId: os.veiculoId,
        servicoId: servObj.id,
        ordemServicoId: os.id,
        dataBase,
        kmBase: kmOS,
        dataPrevista: dataPrev,
        kmPrevisto: kmPrev,
        motivo: `Retorno de Serviço: ${servObj.descricao}`,
        status: 'PREVISTO',
        usuarioId: usuarioId || null,
      },
    });
  }
}

// ============================================================================
// 1. DASHBOARD CRM & ESTATÍSTICAS
// ============================================================================

export const getCRMDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const em7Dias = new Date(hoje);
    em7Dias.setDate(em7Dias.getDate() + 7);

    const em30Dias = new Date(hoje);
    em30Dias.setDate(em30Dias.getDate() + 30);

    const ha30Dias = new Date(hoje);
    ha30Dias.setDate(ha30Dias.getDate() - 30);

    const ha90Dias = new Date(hoje);
    ha90Dias.setDate(ha90Dias.getDate() - 90);

    // Total Clientes
    const totalClientes = await prisma.cliente.count();

    // Clientes Novos (últimos 30 dias)
    const clientesNovos = await prisma.cliente.count({
      where: { createdAt: { gte: ha30Dias } },
    });

    // Clientes Recorrentes (clientes com 2 ou mais OS)
    const clientesComOS = await prisma.ordemServico.groupBy({
      by: ['clienteId'],
      _count: { id: true },
      having: { id: { _count: { gte: 2 } } },
    });
    const clientesRecorrentes = clientesComOS.length;

    // Clientes Inativos (sem OS nos últimos 90 dias)
    const clientesAtivosUltimos90 = await prisma.ordemServico.findMany({
      where: { createdAt: { gte: ha90Dias } },
      select: { clienteId: true },
      distinct: ['clienteId'],
    });
    const idsAtivos = clientesAtivosUltimos90.map((c) => c.clienteId);
    const clientesInativos = await prisma.cliente.count({
      where: { id: { notIn: idsAtivos } },
    });

    // Previsões de Retorno
    const previsoes = await prisma.previsaoRetorno.findMany({
      where: { status: { notIn: ['CONCLUIDO', 'IGNORADO'] } },
    });

    let retornosHoje = 0;
    let retornosProximos = 0;
    let retornosAtrasados = 0;

    for (const p of previsoes) {
      if (p.dataPrevista) {
        const d = new Date(p.dataPrevista);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() === hoje.getTime()) retornosHoje++;
        else if (d > hoje && d <= em7Dias) retornosProximos++;
        else if (d < hoje) retornosAtrasados++;
      }
    }

    // Aniversariantes
    const todosClientes = await prisma.cliente.findMany({
      where: { dataNascimento: { not: null } },
      select: { id: true, dataNascimento: true },
    });

    let aniversariantesHoje = 0;
    let aniversariantesProximos = 0;
    const mesAtual = hoje.getMonth();
    const diaAtual = hoje.getDate();

    for (const c of todosClientes) {
      if (!c.dataNascimento) continue;
      const n = new Date(c.dataNascimento);
      if (n.getMonth() === mesAtual && n.getDate() === diaAtual) {
        aniversariantesHoje++;
      } else if (n.getMonth() === mesAtual && n.getDate() > diaAtual && n.getDate() <= diaAtual + 7) {
        aniversariantesProximos++;
      }
    }

    // Orçamentos Não Aprovados
    const orcamentosNaoAprovados = await prisma.ordemServico.count({
      where: {
        status: { in: ['OPEN', 'AWAITING_APPROVAL'] },
        publicToken: { not: null },
      },
    });

    // Follow-ups Pendentes
    const followUpsPendentes = await prisma.tarefaFollowUp.count({
      where: { status: 'PENDENTE' },
    });

    res.json({
      totalClientes,
      clientesNovos,
      clientesRecorrentes,
      clientesInativos,
      retornosHoje,
      retornosProximos,
      retornosAtrasados,
      revisoesDevidas: retornosHoje + retornosAtrasados,
      aniversariantesHoje,
      aniversariantesProximos,
      orcamentosNaoAprovados,
      followUpsPendentes,
    });
  } catch (error) {
    console.error('Erro ao buscar dashboard CRM:', error);
    res.status(500).json({ error: 'Erro ao carregar indicador CRM' });
  }
};

// ============================================================================
// 2. PERFIL CRM DO CLIENTE (VISÃO 360)
// ============================================================================

export const getPerfilCRMCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        veiculos: true,
        ordensServico: {
          include: {
            produtos: true,
            servicos: { include: { mecanico: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        contasReceber: true,
        tags: { include: { tag: true } },
        observacoesInternas: {
          include: { usuario: { select: { id: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
        previsoesRetorno: {
          include: { veiculo: true, servico: true },
          orderBy: { dataPrevista: 'asc' },
        },
        followUps: {
          include: { responsavel: { select: { id: true, email: true } } },
          orderBy: { dataAgendada: 'asc' },
        },
      },
    });

    if (!cliente) {
      res.status(404).json({ error: 'Cliente não encontrado.' });
      return;
    }

    // Calcular Métricas Financeiras / LTV (Sem duplicar notas fiscais)
    const ordensConcluidas = cliente.ordensServico.filter(
      (os) => os.status === 'COMPLETED' || os.status === 'BILLED'
    );

    const totalGasto = ordensConcluidas.reduce((sum, os) => sum + Number(os.valorTotal), 0);
    const qtdOS = ordensConcluidas.length;
    const ticketMedio = qtdOS > 0 ? totalGasto / qtdOS : 0;
    const primeiraVisita = cliente.ordensServico.length > 0 ? cliente.ordensServico[cliente.ordensServico.length - 1].dataAbertura : cliente.createdAt;
    const ultimaVisita = cliente.ordensServico.length > 0 ? cliente.ordensServico[0].dataAbertura : null;

    // Determinar Classificação CRM
    let classificacao = cliente.classificacaoManual;
    if (!classificacao) {
      if (qtdOS >= 3 || totalGasto >= 3000) {
        classificacao = 'VIP';
      } else if (qtdOS >= 2) {
        classificacao = 'RECORRENTE';
      } else if (ultimaVisita && (new Date().getTime() - new Date(ultimaVisita).getTime()) > 90 * 24 * 60 * 60 * 1000) {
        classificacao = 'INATIVO';
      } else {
        classificacao = 'NOVO';
      }
    }

    // Construir Timeline Unificada
    const timeline: Array<{ id: string; data: Date; tipo: string; titulo: string; descricao: string }> = [];

    // Evento de cadastro
    timeline.push({
      id: `cad-${cliente.id}`,
      data: cliente.createdAt,
      tipo: 'CADASTRO',
      titulo: 'Cliente Cadastrado',
      descricao: `Cadastro realizado no sistema.`,
    });

    // Eventos de OS
    for (const os of cliente.ordensServico) {
      const servDescs = os.servicos.map((s) => s.descricao).join(', ');
      timeline.push({
        id: `os-${os.id}`,
        data: os.createdAt,
        tipo: 'ORDEM_SERVICO',
        titulo: `OS #${os.numeroOs} (${os.status})`,
        descricao: servDescs || `Valor: R$ ${Number(os.valorTotal).toFixed(2)}`,
      });
    }

    // Eventos de Pagamentos
    for (const cr of cliente.contasReceber) {
      if (Number(cr.valorPago) > 0) {
        timeline.push({
          id: `cr-${cr.id}`,
          data: cr.dataBaixa || cr.createdAt,
          tipo: 'PAGAMENTO',
          titulo: `Recebimento Título #${cr.numeroTitulo}`,
          descricao: `Pago R$ ${Number(cr.valorPago).toFixed(2)} (${cr.formaPagamento || 'DINHEIRO'})`,
        });
      }
    }

    // Ordenar timeline por data decrescente
    timeline.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    res.json({
      ...cliente,
      classificacaoCalculada: classificacao,
      resumoCRM: {
        totalOS: qtdOS,
        totalVeiculos: cliente.veiculos.length,
        totalGasto,
        ticketMedio,
        primeiraVisita,
        ultimaVisita,
      },
      timeline,
    });
  } catch (error) {
    console.error('Erro ao buscar perfil CRM do cliente:', error);
    res.status(500).json({ error: 'Erro ao buscar perfil CRM do cliente' });
  }
};

// ============================================================================
// 3. HISTÓRICO DO VEÍCULO (INDICAÇÃO TÉCNICA CONTINUA MESMO SE MUDAR PROPRIETÁRIO)
// ============================================================================

export const getHistoricoVeiculo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const veiculo = await prisma.vehicle.findFirst({
      where: {
        OR: [
          { id },
          { placa: { equals: id.toUpperCase().trim() } },
        ],
      },
      include: {
        cliente: true,
        ordensServico: {
          include: {
            produtos: { include: { produto: true } },
            servicos: { include: { mecanico: true } },
            mecanico: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        previsoesRetorno: {
          include: { servico: true },
          orderBy: { dataPrevista: 'asc' },
        },
      },
    });

    if (!veiculo) {
      res.status(404).json({ error: 'Veículo não encontrado.' });
      return;
    }

    // Calcular histórico de Quilometragem
    const historicoKm = veiculo.ordensServico
      .map((os) => ({
        data: os.dataAbertura,
        km: veiculo.quilometragemAtual || 0,
        numeroOs: os.numeroOs,
      }))
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    res.json({
      veiculo,
      historicoKm,
    });
  } catch (error) {
    console.error('Erro ao buscar histórico do veículo:', error);
    res.status(500).json({ error: 'Erro ao buscar histórico do veículo' });
  }
};

// ============================================================================
// 4. RETORNOS E REVISÕES (CENTRAL DE RETORNOS)
// ============================================================================

export const getRetornos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filtro, q } = req.query;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const em7Dias = new Date(hoje);
    em7Dias.setDate(em7Dias.getDate() + 7);

    const em30Dias = new Date(hoje);
    em30Dias.setDate(em30Dias.getDate() + 30);

    let whereClause: any = {};

    if (q && typeof q === 'string' && q.trim() !== '') {
      const search = q.trim();
      whereClause.OR = [
        { cliente: { nome: { contains: search, mode: 'insensitive' } } },
        { veiculo: { placa: { contains: search, mode: 'insensitive' } } },
        { motivo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const previsoes = await prisma.previsaoRetorno.findMany({
      where: whereClause,
      include: {
        cliente: true,
        veiculo: true,
        servico: true,
        ordemServico: true,
      },
      orderBy: { dataPrevista: 'asc' },
    });

    // Calcular status dinâmico (DEVIDO, ATRASADO, PROXIMO, PREVISTO)
    const retornosCalculados = previsoes.map((p) => {
      let st = p.status;
      if (st !== 'CONCLUIDO' && st !== 'IGNORADO') {
        const kmAtualVeiculo = p.veiculo?.quilometragemAtual || 0;
        const kmDevido = p.kmPrevisto && kmAtualVeiculo >= p.kmPrevisto;

        if (p.dataPrevista) {
          const d = new Date(p.dataPrevista);
          d.setHours(0, 0, 0, 0);

          if (kmDevido || d.getTime() === hoje.getTime()) {
            st = 'DEVIDO';
          } else if (d < hoje) {
            st = 'ATRASADO';
          } else if (d > hoje && d <= em7Dias) {
            st = 'PROXIMO';
          }
        }
      }

      return {
        ...p,
        statusCalculado: st,
      };
    });

    // Aplicar filtro de aba se especificado
    let filtrados = retornosCalculados;
    if (filtro === 'HOJE') {
      filtrados = retornosCalculados.filter((r) => r.statusCalculado === 'DEVIDO');
    } else if (filtro === 'PROXIMOS_7') {
      filtrados = retornosCalculados.filter((r) => r.statusCalculado === 'PROXIMO');
    } else if (filtro === 'ATRASADOS') {
      filtrados = retornosCalculados.filter((r) => r.statusCalculado === 'ATRASADO');
    } else if (filtro === 'CONCLUIDOS') {
      filtrados = retornosCalculados.filter((r) => r.statusCalculado === 'CONCLUIDO');
    }

    res.json(filtrados);
  } catch (error) {
    console.error('Erro ao buscar retornos:', error);
    res.status(500).json({ error: 'Erro ao buscar retornos' });
  }
};

export const concluirPrevisaoRetorno = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, observacoes } = req.body; // CONCLUIDO | IGNORADO

    const prev = await prisma.previsaoRetorno.update({
      where: { id },
      data: {
        status: status || 'CONCLUIDO',
        concluidoEm: new Date(),
        observacoes: observacoes ?? undefined,
      },
    });

    res.json(prev);
  } catch (error) {
    console.error('Erro ao concluir retorno:', error);
    res.status(500).json({ error: 'Erro ao atualizar previsão de retorno' });
  }
};

// ============================================================================
// 5. CLIENTES INATIVOS
// ============================================================================

export const getClientesInativos = async (req: Request, res: Response): Promise<void> => {
  try {
    const { dias = '90' } = req.query;
    const numDias = Number(dias) || 90;

    const dataCorte = new Date();
    dataCorte.setDate(dataCorte.getDate() - numDias);

    // Buscar clientes sem OS ativas desde dataCorte
    const clientesComOSRecentes = await prisma.ordemServico.findMany({
      where: { createdAt: { gte: dataCorte } },
      select: { clienteId: true },
      distinct: ['clienteId'],
    });

    const idsAtivos = clientesComOSRecentes.map((c) => c.clienteId);

    const inativos = await prisma.cliente.findMany({
      where: { id: { notIn: idsAtivos } },
      include: {
        veiculos: true,
        ordensServico: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(inativos);
  } catch (error) {
    console.error('Erro ao buscar clientes inativos:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes inativos' });
  }
};

// ============================================================================
// 6. ANIVERSARIANTES
// ============================================================================

export const getAniversariantes = async (req: Request, res: Response): Promise<void> => {
  try {
    const { janela = '7' } = req.query;
    const numDias = Number(janela) || 7;

    const clientes = await prisma.cliente.findMany({
      where: { dataNascimento: { not: null } },
      include: { veiculos: true },
    });

    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const diaAtual = hoje.getDate();

    const aniversariantes = clientes.filter((c) => {
      if (!c.dataNascimento) return false;
      const d = new Date(c.dataNascimento);
      const m = d.getMonth();
      const dia = d.getDate();

      if (m === mesAtual) {
        return dia >= diaAtual && dia <= diaAtual + numDias;
      }
      return false;
    });

    res.json(aniversariantes);
  } catch (error) {
    console.error('Erro ao buscar aniversariantes:', error);
    res.status(500).json({ error: 'Erro ao buscar aniversariantes' });
  }
};

// ============================================================================
// 7. ORÇAMENTOS NÃO APROVADOS (FOLLOW-UP DE VENDAS)
// ============================================================================

export const getOrcamentosNaoAprovados = async (req: Request, res: Response): Promise<void> => {
  try {
    const orcamentos = await prisma.ordemServico.findMany({
      where: {
        status: { in: ['OPEN', 'AWAITING_APPROVAL'] },
        publicToken: { not: null },
      },
      include: {
        cliente: true,
        veiculo: true,
        produtos: true,
        servicos: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orcamentos);
  } catch (error) {
    console.error('Erro ao buscar orçamentos não aprovados:', error);
    res.status(500).json({ error: 'Erro ao buscar orçamentos pendentes' });
  }
};

// ============================================================================
// 8. FOLLOW-UPS / TAREFAS DE RELACIONAMENTO
// ============================================================================

export const getFollowUps = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, clienteId } = req.query;
    let whereClause: any = {};

    if (status && typeof status === 'string' && status !== 'ALL') {
      whereClause.status = status;
    }

    if (clienteId && typeof clienteId === 'string') {
      whereClause.clienteId = clienteId;
    }

    const followUps = await prisma.tarefaFollowUp.findMany({
      where: whereClause,
      include: {
        cliente: true,
        veiculo: true,
        ordemServico: true,
        responsavel: { select: { id: true, email: true } },
      },
      orderBy: { dataAgendada: 'asc' },
    });

    res.json(followUps);
  } catch (error) {
    console.error('Erro ao buscar tarefas de follow-up:', error);
    res.status(500).json({ error: 'Erro ao buscar tarefas de follow-up' });
  }
};

export const createFollowUp = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clienteId, veiculoId, ordemServicoId, titulo, descricao, dataAgendada, origem = 'MANUAL' } = req.body;
    const responsavelId = req.user?.id || null;

    if (!clienteId || !titulo || !dataAgendada) {
      res.status(400).json({ error: 'Cliente, título e data agendada são obrigatórios.' });
      return;
    }

    const novo = await prisma.tarefaFollowUp.create({
      data: {
        clienteId,
        veiculoId: veiculoId || null,
        ordemServicoId: ordemServicoId || null,
        titulo,
        descricao,
        dataAgendada: new Date(dataAgendada),
        responsavelId,
        origem,
        status: 'PENDENTE',
      },
    });

    res.status(201).json(novo);
  } catch (error) {
    console.error('Erro ao criar tarefa de follow-up:', error);
    res.status(500).json({ error: 'Erro ao criar tarefa de follow-up' });
  }
};

export const updateFollowUp = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, observacaoConclusao } = req.body;

    const atualizado = await prisma.tarefaFollowUp.update({
      where: { id },
      data: {
        status: status ?? undefined,
        observacaoConclusao: observacaoConclusao ?? undefined,
        ...(status === 'CONCLUIDO' ? { concluidoEm: new Date() } : {}),
      },
    });

    res.json(atualizado);
  } catch (error) {
    console.error('Erro ao atualizar follow-up:', error);
    res.status(500).json({ error: 'Erro ao atualizar tarefa de follow-up' });
  }
};

// ============================================================================
// 9. TAGS E OBSERVAÇÕES INTERNAS
// ============================================================================

export const getTags = async (req: Request, res: Response): Promise<void> => {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { nome: 'asc' } });
    res.json(tags);
  } catch (error) {
    console.error('Erro ao buscar tags:', error);
    res.status(500).json({ error: 'Erro ao buscar tags' });
  }
};

export const createTag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nome, cor = '#3B82F6', descricao } = req.body;
    if (!nome) {
      res.status(400).json({ error: 'Nome da tag é obrigatório.' });
      return;
    }

    const tag = await prisma.tag.create({
      data: { nome, cor, descricao },
    });
    res.status(201).json(tag);
  } catch (error: any) {
    console.error('Erro ao criar tag:', error);
    res.status(400).json({ error: error.message || 'Erro ao criar tag' });
  }
};

export const associarTagCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clienteId, tagId } = req.body;

    const associacao = await prisma.clienteTag.create({
      data: { clienteId, tagId },
    });
    res.status(201).json(associacao);
  } catch (error: any) {
    res.status(400).json({ error: 'Tag já associada ao cliente.' });
  }
};

export const removerTagCliente = async (req: Request, res: Response): Promise<void> => {
  try {
    const { clienteId, tagId } = req.body;
    await prisma.clienteTag.deleteMany({
      where: { clienteId, tagId },
    });
    res.json({ message: 'Tag removida com sucesso.' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover tag do cliente' });
  }
};

export const addObservacaoCliente = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clienteId, conteudo } = req.body;
    const usuarioId = req.user?.id || null;

    if (!clienteId || !conteudo) {
      res.status(400).json({ error: 'Cliente e conteúdo são obrigatórios.' });
      return;
    }

    const obs = await prisma.observacaoCliente.create({
      data: {
        clienteId,
        usuarioId,
        conteudo,
      },
    });
    res.status(201).json(obs);
  } catch (error) {
    console.error('Erro ao adicionar observação ao cliente:', error);
    res.status(500).json({ error: 'Erro ao adicionar observação ao cliente' });
  }
};
