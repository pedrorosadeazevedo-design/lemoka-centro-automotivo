import { Request, Response } from 'express';
import Prisma from '@prisma/client';
import crypto from 'crypto';

const { PrismaClient } = Prisma;
const prisma = new PrismaClient();

/**
 * 1. GET /api/sped/periodos
 * Lista todos os períodos fiscais cadastrados
 */
export async function getPeriodosFiscais(req: Request, res: Response) {
  try {
    const periodos = await prisma.periodoFiscal.findMany({
      orderBy: { competencia: 'desc' },
      include: {
        _count: {
          select: { inconsistencias: true, arquivos: true, auditorias: true }
        }
      }
    });

    return res.json(periodos);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 2. POST /api/sped/periodos
 * Cria um novo período fiscal (Competência YYYY-MM)
 */
export async function createPeriodoFiscal(req: Request, res: Response) {
  try {
    const { competencia, layoutVersao } = req.body;
    if (!competencia || !/^\d{4}-\d{2}$/.test(competencia)) {
      return res.status(400).json({ error: 'Competência inválida. Use o formato YYYY-MM.' });
    }

    const [yearStr, monthStr] = competencia.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const dataInicio = new Date(year, month - 1, 1, 0, 0, 0);
    const dataFim = new Date(year, month, 0, 23, 59, 59, 999);

    // Snapshot das configurações da empresa e fiscais
    const empresaConfig = await prisma.empresaConfig.findFirst();
    const fiscalConfig = await prisma.configuracaoFiscal.findFirst();

    const snapshotConfig = JSON.stringify({
      empresa: empresaConfig,
      fiscal: fiscalConfig,
      snapshotEm: new Date()
    });

    const periodo = await prisma.periodoFiscal.create({
      data: {
        competencia,
        dataInicio,
        dataFim,
        layoutVersao: layoutVersao || '017',
        snapshotConfig,
        status: 'ABERTO'
      }
    });

    await prisma.spedAuditoria.create({
      data: {
        periodoFiscalId: periodo.id,
        usuarioId: (req as any).user?.id,
        acao: 'CRIAR_PERIODO',
        detalhes: `Período fiscal ${competencia} criado com sucesso.`
      }
    });

    return res.status(201).json(periodo);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Competência fiscal já cadastrada.' });
    }
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 3. POST /api/sped/periodos/:id/processar
 * Processa o período fiscal, consolidando Entradas, Saídas, Inventário e gerando o Motor de Validação
 */
export async function processarPeriodoFiscal(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const periodo = await prisma.periodoFiscal.findUnique({ where: { id } });

    if (!periodo) return res.status(404).json({ error: 'Período fiscal não encontrado.' });
    if (periodo.status === 'FECHADO') return res.status(400).json({ error: 'Período fiscal fechado não pode ser reprocessado.' });

    // Atualiza status para EM_PROCESSAMENTO
    await prisma.periodoFiscal.update({
      where: { id },
      data: { status: 'EM_PROCESSAMENTO' }
    });

    // Limpa inconsistências anteriores
    await prisma.spedInconsistencia.deleteMany({ where: { periodoFiscalId: id } });

    const inconsistencias: {
      tipo: 'ERRO' | 'AVISO';
      entidade: string;
      registroId?: string;
      campo?: string;
      valorAtual?: string;
      motivo: string;
      acaoRecomendada?: string;
    }[] = [];

    // --- A. AUDITORIA DA EMPRESA & PARÂMETROS FISCAIS ---
    const empresa = await prisma.empresaConfig.findFirst();
    const fiscal = await prisma.configuracaoFiscal.findFirst();

    if (!empresa?.cnpj || empresa.cnpj.includes('00000000')) {
      inconsistencias.push({
        tipo: 'ERRO',
        entidade: 'EmpresaConfig',
        campo: 'cnpj',
        valorAtual: empresa?.cnpj || 'Vazio',
        motivo: 'CNPJ da empresa inválido ou não preenchido.',
        acaoRecomendada: 'Acesse Configurações da Empresa e informe o CNPJ oficial.'
      });
    }

    if (!empresa?.codigoIbge) {
      inconsistencias.push({
        tipo: 'ERRO',
        entidade: 'EmpresaConfig',
        campo: 'codigoIbge',
        valorAtual: 'Vazio',
        motivo: 'Código IBGE do município da empresa não configurado.',
        acaoRecomendada: 'Cadastre o Código IBGE do município nas Configurações.'
      });
    }

    // --- B. AUDITORIA DAS ENTRADAS (Compras Confirmadas) ---
    const compras = await prisma.compra.findMany({
      where: {
        dataEntrada: { gte: periodo.dataInicio, lte: periodo.dataFim },
        status: 'CONFIRMADA'
      },
      include: { fornecedor: true, itens: { include: { produto: true } } }
    });

    let totalEntradas = 0;
    for (const c of compras) {
      totalEntradas += Number(c.valorTotal || 0);

      // Validação do Fornecedor
      if (!c.fornecedor.documento) {
        inconsistencias.push({
          tipo: 'ERRO',
          entidade: 'Fornecedor',
          registroId: c.fornecedor.id,
          campo: 'documento',
          motivo: `Fornecedor '${c.fornecedor.razaoSocial}' sem CPF/CNPJ.`,
          acaoRecomendada: 'Cadastre o documento do fornecedor no módulo de Fornecedores.'
        });
      }

      // Validação dos Itens da Compra
      for (const item of c.itens) {
        if (!item.produto.ncm) {
          inconsistencias.push({
            tipo: 'ERRO',
            entidade: 'Produto',
            registroId: item.produto.id,
            campo: 'ncm',
            valorAtual: 'Vazio',
            motivo: `Produto '${item.produto.descricao}' (Entrada Compra #${c.numeroCompra}) sem NCM.`,
            acaoRecomendada: 'Preencha o código NCM no cadastro do produto.'
          });
        }
      }
    }

    // --- C. AUDITORIA DAS SAÍDAS (OS Concluídas / Faturadas + Documentos Fiscais) ---
    // Regra de Não Duplicidade: Se a OS possui DocumentoFiscal AUTORIZADA, considera o DocumentoFiscal.
    const ordensConcluidas = await prisma.ordemServico.findMany({
      where: {
        createdAt: { gte: periodo.dataInicio, lte: periodo.dataFim },
        status: { in: ['COMPLETED', 'BILLED'] }
      },
      include: {
        cliente: true,
        produtos: { include: { produto: true } },
        servicos: true,
        documentosFiscais: true
      }
    });

    let totalSaidas = 0;
    let totalDocumentos = 0;

    for (const os of ordensConcluidas) {
      totalSaidas += Number(os.valorTotal || 0);
      totalDocumentos += 1;

      // Validação de Cliente PJ
      if (os.cliente.tipoDocumento === 'CNPJ' && !os.cliente.inscricaoEstadual) {
        inconsistencias.push({
          tipo: 'AVISO',
          entidade: 'Cliente',
          registroId: os.cliente.id,
          campo: 'inscricaoEstadual',
          motivo: `Cliente Pessoa Jurídica '${os.cliente.nome}' sem Inscrição Estadual.`,
          acaoRecomendada: 'Verifique se o cliente é isento ou informe a IE.'
        });
      }

      // Validação dos Itens de Peças
      for (const p of os.produtos) {
        if (p.produto && !p.produto.ncm) {
          inconsistencias.push({
            tipo: 'ERRO',
            entidade: 'Produto',
            registroId: p.produto.id,
            campo: 'ncm',
            motivo: `Peça '${p.descricao}' na OS #${os.numeroOs} sem NCM fiscal.`,
            acaoRecomendada: 'Atualize o NCM da peça no catálogo de produtos.'
          });
        }
      }
    }

    // --- D. GRAVAÇÃO DAS INCONSISTÊNCIAS E STATUS DO PERÍODO ---
    if (inconsistencias.length > 0) {
      await prisma.spedInconsistencia.createMany({
        data: inconsistencias.map(inc => ({
          periodoFiscalId: id,
          ...inc
        }))
      });
    }

    const errosCriticos = inconsistencias.filter(i => i.tipo === 'ERRO').length;
    const novoStatus = errosCriticos === 0 ? 'VALIDADO' : 'EM_PROCESSAMENTO';

    const periodoAtualizado = await prisma.periodoFiscal.update({
      where: { id },
      data: {
        totalEntradas,
        totalSaidas,
        totalDocumentos,
        totalInconsistencias: inconsistencias.length,
        status: novoStatus
      },
      include: {
        inconsistencias: true,
        arquivos: true
      }
    });

    await prisma.spedAuditoria.create({
      data: {
        periodoFiscalId: id,
        usuarioId: (req as any).user?.id,
        acao: 'PROCESSAR',
        detalhes: `Processamento concluído. Entradas: R$${totalEntradas.toFixed(2)}, Saídas: R$${totalSaidas.toFixed(2)}, Inconsistências: ${inconsistencias.length}.`
      }
    });

    return res.json(periodoAtualizado);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 4. POST /api/sped/periodos/:id/gerar-arquivo
 * Geração da estrutura TXT oficial do SPED EFD ICMS/IPI (Blocos 0, C, E, H, 1, 9)
 */
export async function gerarArquivoSped(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const periodo = await prisma.periodoFiscal.findUnique({
      where: { id },
      include: { inconsistencias: true }
    });

    if (!periodo) return res.status(404).json({ error: 'Período fiscal não encontrado.' });

    const errosCriticos = periodo.inconsistencias.filter(i => i.tipo === 'ERRO');
    if (errosCriticos.length > 0) {
      return res.status(400).json({
        error: `Não é possível gerar o arquivo SPED. Existem ${errosCriticos.length} erro(s) crítico(s) de validação.`,
        erros: errosCriticos
      });
    }

    const empresa = await prisma.empresaConfig.findFirst();

    // GERADOR DE REGISTROS SPED EFD ICMS/IPI (FORMATO ESTRUTURADO PIPED)
    const lines: string[] = [];

    // BLOCO 0: ABERTURA, IDENTIFICAÇÃO E CADASTROS
    lines.push(`|0000|${periodo.layoutVersao}|0|${periodo.dataInicio.toISOString().slice(0,10).replace(/-/g,'')}|${periodo.dataFim.toISOString().slice(0,10).replace(/-/g,'')}|${empresa?.razaoSocial || 'LEMOKA CENTRO AUTOMOTIVO'}|${empresa?.cnpj?.replace(/\D/g,'') || ''}|RJ||${empresa?.codigoIbge || '3304557'}|||A|0|`);
    lines.push(`|0001|0|`); // Abertura Bloco 0
    lines.push(`|0005|${empresa?.nomeFantasia || 'LEMOKA CENTRO AUTOMOTIVO'}|${empresa?.cep?.replace(/\D/g,'') || ''}|${empresa?.endereco || ''}|${empresa?.numero || ''}||${empresa?.bairro || ''}|${empresa?.telefone?.replace(/\D/g,'') || ''}||${empresa?.email || ''}|`);
    lines.push(`|0990|${lines.length + 1}|`); // Encerramento Bloco 0

    // BLOCO C: DOCUMENTOS FISCAIS III - MERCADORIAS (ICMS/IPI)
    lines.push(`|C001|0|`); // Abertura Bloco C
    // Síntese das saídas e entradas
    lines.push(`|C100|1|0|000|01|00|1|${periodo.dataInicio.toISOString().slice(0,10).replace(/-/g,'')}|${periodo.dataFim.toISOString().slice(0,10).replace(/-/g,'')}|${Number(periodo.totalSaidas).toFixed(2)}|0|0,00|${Number(periodo.totalSaidas).toFixed(2)}|9|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|`);
    lines.push(`|C990|3|`); // Encerramento Bloco C

    // BLOCO E: APURAÇÃO DO ICMS E IPI
    lines.push(`|E001|0|`); // Abertura Bloco E
    lines.push(`|E100|${periodo.dataInicio.toISOString().slice(0,10).replace(/-/g,'')}|${periodo.dataFim.toISOString().slice(0,10).replace(/-/g,'')}|`);
    lines.push(`|E110|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|0,00|`);
    lines.push(`|E990|4|`); // Encerramento Bloco E

    // BLOCO H: INVENTÁRIO FÍSICO
    lines.push(`|H001|0|`); // Abertura Bloco H
    const produtosEstoque = await prisma.produto.findMany({ where: { status: true } });
    let valorTotalInventario = 0;
    for (const p of produtosEstoque) {
      const qtd = Math.max(0, Number(p.estoqueFisico || 0));
      const custo = Number(p.precoCusto || 0);
      valorTotalInventario += qtd * custo;
    }
    lines.push(`|H005|${periodo.dataFim.toISOString().slice(0,10).replace(/-/g,'')}|${valorTotalInventario.toFixed(2)}|01|`);
    lines.push(`|H990|3|`); // Encerramento Bloco H

    // BLOCO 1: OUTRAS INFORMAÇÕES
    lines.push(`|1001|0|`);
    lines.push(`|1010|N|N|N|N|N|N|N|N|N|`);
    lines.push(`|1990|3|`);

    // BLOCO 9: CONTROLE E ENCERRAMENTO DO ARQUIVO DIGITAL
    const totalLinhasGeral = lines.length + 3;
    lines.push(`|9001|0|`);
    lines.push(`|9900|0000|1|`);
    lines.push(`|9990|4|`);
    lines.push(`|9999|${totalLinhasGeral}|`);

    const conteudoTxt = lines.join('\r\n');
    const hashArquivo = crypto.createHash('sha256').update(conteudoTxt).digest('hex');
    const nomeArquivo = `SPED_EFD_LEMOKA_${periodo.competencia}_v${periodo.layoutVersao}.txt`;

    const arquivoSped = await prisma.spedFile.create({
      data: {
        periodoFiscalId: id,
        nomeArquivo,
        conteudoTxt,
        hashArquivo,
        layoutVersao: periodo.layoutVersao,
        totalRegistros: totalLinhasGeral,
        usuarioId: (req as any).user?.id
      }
    });

    await prisma.periodoFiscal.update({
      where: { id },
      data: { status: 'EXPORTADO' }
    });

    await prisma.spedAuditoria.create({
      data: {
        periodoFiscalId: id,
        usuarioId: (req as any).user?.id,
        acao: 'GERAR_ARQUIVO',
        detalhes: `Arquivo SPED ${nomeArquivo} gerado com sucesso. Hash: ${hashArquivo.substring(0, 10)}...`
      }
    });

    return res.status(201).json(arquivoSped);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 5. POST /api/sped/periodos/:id/fechar
 * Transita o Período Fiscal para FECHADO impedindo modificações posteriores
 */
export async function fecharPeriodoFiscal(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const periodo = await prisma.periodoFiscal.findUnique({ where: { id } });

    if (!periodo) return res.status(404).json({ error: 'Período fiscal não encontrado.' });
    if (periodo.status === 'FECHADO') return res.status(400).json({ error: 'Este período fiscal já se encontra FECHADO.' });

    const periodoFechado = await prisma.periodoFiscal.update({
      where: { id },
      data: {
        status: 'FECHADO',
        fechadoEm: new Date(),
        fechadoPorUsuarioId: (req as any).user?.id
      }
    });

    await prisma.spedAuditoria.create({
      data: {
        periodoFiscalId: id,
        usuarioId: (req as any).user?.id,
        acao: 'FECHAR',
        detalhes: `Período fiscal ${periodo.competencia} fechado e auditado administrativamente.`
      }
    });

    return res.json(periodoFechado);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
