import { Request, Response } from 'express';
import { PrismaClient, TipoDocumentoFiscal, StatusDocumentoFiscal } from '@prisma/client';
import { fiscalProvider } from '../services/fiscalProvider';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    papel: string;
  };
}

/**
 * GET /api/fiscal/config
 * Retorna configurações fiscais da empresa (segredos protegidos)
 */
export const getConfiguracaoFiscal = async (req: Request, res: Response): Promise<void> => {
  try {
    let empresa = await prisma.empresaConfig.findFirst();
    if (!empresa) {
      empresa = await prisma.empresaConfig.create({ data: {} });
    }

    let config = await prisma.configuracaoFiscal.findFirst();
    if (!config) {
      config = await prisma.configuracaoFiscal.create({ data: {} });
    }

    res.json({
      empresa,
      config: {
        ...config,
        cscToken: config.cscToken ? '***PROTEGIDO***' : null,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar configuração fiscal:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração fiscal' });
  }
};

/**
 * PUT /api/fiscal/config
 * Atualiza configurações fiscais da empresa
 */
export const updateConfiguracaoFiscal = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      razaoSocial,
      nomeFantasia,
      cnpj,
      inscricaoMunicipal,
      inscricaoEstadual,
      regimeTributario,
      crt,
      codigoIbge,
      cep,
      endereco,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      telefone,
      email,
      ambiente,
      serieNfe,
      serieNfce,
      serieNfse,
      provedorFiscal,
      certificadoDigitalConfigurado,
      cscId,
      cscToken,
    } = req.body;

    let empresa = await prisma.empresaConfig.findFirst();
    if (empresa) {
      empresa = await prisma.empresaConfig.update({
        where: { id: empresa.id },
        data: {
          razaoSocial: razaoSocial ?? empresa.razaoSocial,
          nomeFantasia: nomeFantasia ?? empresa.nomeFantasia,
          cnpj: cnpj ?? empresa.cnpj,
          inscricaoMunicipal: inscricaoMunicipal ?? empresa.inscricaoMunicipal,
          inscricaoEstadual: inscricaoEstadual ?? empresa.inscricaoEstadual,
          regimeTributario: regimeTributario ?? empresa.regimeTributario,
          crt: crt ?? empresa.crt,
          codigoIbge: codigoIbge ?? empresa.codigoIbge,
          cep: cep ?? empresa.cep,
          endereco: endereco ?? empresa.endereco,
          numero: numero ?? empresa.numero,
          complemento: complemento ?? empresa.complemento,
          bairro: bairro ?? empresa.bairro,
          cidade: cidade ?? empresa.cidade,
          uf: uf ?? empresa.uf,
          telefone: telefone ?? empresa.telefone,
          email: email ?? empresa.email,
        },
      });
    }

    let config = await prisma.configuracaoFiscal.findFirst();
    if (config) {
      config = await prisma.configuracaoFiscal.update({
        where: { id: config.id },
        data: {
          ambiente: ambiente ?? config.ambiente,
          serieNfe: serieNfe ?? config.serieNfe,
          serieNfce: serieNfce ?? config.serieNfce,
          serieNfse: serieNfse ?? config.serieNfse,
          provedorFiscal: provedorFiscal ?? config.provedorFiscal,
          certificadoDigitalConfigurado: certificadoDigitalConfigurado !== undefined ? Boolean(certificadoDigitalConfigurado) : config.certificadoDigitalConfigurado,
          cscId: cscId ?? config.cscId,
          ...(cscToken && cscToken !== '***PROTEGIDO***' ? { cscToken } : {}),
        },
      });
    }

    res.json({ empresa, config });
  } catch (error) {
    console.error('Erro ao atualizar configuração fiscal:', error);
    res.status(500).json({ error: 'Erro ao atualizar configuração fiscal' });
  }
};

/**
 * GET /api/fiscal/documentos
 * Lista documentos fiscais com filtros
 */
export const getDocumentosFiscais = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tipo, status, clienteId, q, inicio, fim } = req.query;
    let whereClause: any = {};

    if (tipo && typeof tipo === 'string' && tipo !== 'ALL') {
      whereClause.tipo = tipo as TipoDocumentoFiscal;
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      whereClause.status = status as StatusDocumentoFiscal;
    }

    if (clienteId && typeof clienteId === 'string') {
      whereClause.clienteId = clienteId;
    }

    if (inicio && fim) {
      whereClause.dataEmissao = {
        gte: new Date(inicio as string),
        lte: new Date(fim as string),
      };
    }

    if (q && typeof q === 'string' && q.trim() !== '') {
      const search = q.trim();
      const numDoc = parseInt(search);

      whereClause.OR = [
        ...(!isNaN(numDoc) ? [{ numero: numDoc }] : []),
        { chave: { contains: search, mode: 'insensitive' } },
        { cliente: { nome: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const documentos = await prisma.documentoFiscal.findMany({
      where: whereClause,
      include: {
        cliente: true,
        ordemServico: true,
        historico: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { dataEmissao: 'desc' },
    });

    res.json(documentos);
  } catch (error) {
    console.error('Erro ao buscar documentos fiscais:', error);
    res.status(500).json({ error: 'Erro ao buscar documentos fiscais' });
  }
};

/**
 * GET /api/fiscal/documentos/:id
 * Detalhes do documento fiscal
 */
export const getDocumentoFiscalById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await prisma.documentoFiscal.findUnique({
      where: { id },
      include: {
        cliente: true,
        ordemServico: {
          include: {
            produtos: { include: { produto: true } },
            servicos: { include: { servico: true } },
          },
        },
        historico: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!doc) {
      res.status(404).json({ error: 'Documento fiscal não encontrado' });
      return;
    }

    res.json(doc);
  } catch (error) {
    console.error('Erro ao buscar documento fiscal:', error);
    res.status(500).json({ error: 'Erro ao buscar documento fiscal' });
  }
};

/**
 * POST /api/fiscal/gerar-rascunho
 * Gera rascunho de NF-e, NFC-e ou NFS-e a partir de uma OS (sem duplicar financeiro ou estoque)
 */
export const gerarRascunhoFiscal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { ordemServicoId, tipo } = req.body;
    const usuarioId = req.user?.id || 'sistema';

    if (!ordemServicoId || !tipo) {
      res.status(400).json({ error: 'Ordem de serviço e tipo fiscal (NFE, NFCE, NFSE) são obrigatórios.' });
      return;
    }

    const os = await prisma.ordemServico.findUnique({
      where: { id: ordemServicoId },
      include: {
        cliente: true,
        produtos: true,
        servicos: true,
      },
    });

    if (!os) {
      res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
      return;
    }

    const vProdutos = os.produtos.reduce((acc, item) => acc + Number(item.subtotal), 0);
    const vServicos = os.servicos.reduce((acc, item) => acc + Number(item.subtotal), 0);
    const vTotal = Number(os.valorTotal);

    const config = await prisma.configuracaoFiscal.findFirst();
    const serie = (tipo === 'NFSE' ? config?.serieNfse : tipo === 'NFCE' ? config?.serieNfce : config?.serieNfe) || '1';

    // Gerar rascunho do documento fiscal
    const rascunho = await prisma.documentoFiscal.create({
      data: {
        tipo: tipo as TipoDocumentoFiscal,
        serie,
        status: StatusDocumentoFiscal.RASCUNHO,
        ambiente: config?.ambiente || 'HOMOLOGACAO',
        valorTotal: vTotal,
        valorProdutos: vProdutos,
        valorServicos: vServicos,
        valorImpostos: +(vTotal * 0.05).toFixed(2), // Estimativa de imposto
        ordemServicoId: os.id,
        clienteId: os.clienteId,
        usuarioId,
      },
    });

    // Gerar XML inicial de rascunho
    const xmlRascunho = await fiscalProvider.gerarXMLRascunho(rascunho.id);
    await prisma.documentoFiscal.update({
      where: { id: rascunho.id },
      data: { xmlEnviado: xmlRascunho },
    });

    await prisma.historicoFiscal.create({
      data: {
        documentoFiscalId: rascunho.id,
        statusNovo: StatusDocumentoFiscal.RASCUNHO,
        mensagem: 'Rascunho fiscal criado a partir da OS',
        usuarioId,
      },
    });

    res.status(201).json(rascunho);
  } catch (error) {
    console.error('Erro ao gerar rascunho fiscal:', error);
    res.status(500).json({ error: 'Erro ao gerar rascunho fiscal' });
  }
};

/**
 * POST /api/fiscal/documentos/:id/validar
 * Executa validação de regras fiscais
 */
export const validarDocumentoFiscal = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const resultado = await fiscalProvider.validarDocumento(id);
    res.json(resultado);
  } catch (error) {
    console.error('Erro ao validar documento fiscal:', error);
    res.status(500).json({ error: 'Erro ao validar documento fiscal' });
  }
};

/**
 * POST /api/fiscal/documentos/:id/emitir
 * Tenta enviar o documento para o provedor fiscal
 */
export const emitirDocumentoFiscal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const usuarioId = req.user?.id || 'sistema';
    const resultado = await fiscalProvider.emitir(id, usuarioId);
    res.json(resultado);
  } catch (error: any) {
    console.error('Erro ao emitir documento fiscal:', error);
    res.status(400).json({ error: error.message || 'Erro ao emitir documento fiscal' });
  }
};

/**
 * POST /api/fiscal/documentos/:id/cancelar
 * Registra solicitação de cancelamento com justificativa
 */
export const cancelarDocumentoFiscal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuarioId = req.user?.id || 'sistema';

    if (!motivo) {
      res.status(400).json({ error: 'Motivo do cancelamento fiscal é obrigatório.' });
      return;
    }

    const doc = await prisma.documentoFiscal.findUnique({ where: { id } });
    if (!doc) {
      res.status(404).json({ error: 'Documento fiscal não encontrado.' });
      return;
    }

    const docAtualizado = await prisma.documentoFiscal.update({
      where: { id },
      data: {
        status: StatusDocumentoFiscal.CANCELADA,
        dataCancelamento: new Date(),
        motivo,
        mensagemFiscal: `Cancelamento registrado: ${motivo}`,
      },
    });

    await prisma.historicoFiscal.create({
      data: {
        documentoFiscalId: id,
        statusAnterior: doc.status,
        statusNovo: StatusDocumentoFiscal.CANCELADA,
        mensagem: `Solicitação de cancelamento: ${motivo}`,
        usuarioId,
      },
    });

    res.json(docAtualizado);
  } catch (error) {
    console.error('Erro ao cancelar documento fiscal:', error);
    res.status(500).json({ error: 'Erro ao cancelar documento fiscal' });
  }
};

/**
 * POST /api/fiscal/inutilizar
 * Registra inutilização de faixa numérica
 */
export const inutilizarNumeracao = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { tipo, serie, numeroInicial, numeroFinal, justificativa } = req.body;
    const usuarioId = req.user?.id || 'sistema';

    if (!tipo || !justificativa) {
      res.status(400).json({ error: 'Tipo e justificativa de inutilização são obrigatórios.' });
      return;
    }

    // Registrar rascunho de inutilização no histórico
    const docInutilizado = await prisma.documentoFiscal.create({
      data: {
        tipo: tipo as TipoDocumentoFiscal,
        serie: serie || '1',
        numero: Number(numeroInicial) || 0,
        status: StatusDocumentoFiscal.INUTILIZADA,
        valorTotal: 0,
        motivo: justificativa,
        mensagemFiscal: `Inutilização de faixa ${numeroInicial} a ${numeroFinal}: ${justificativa}`,
        usuarioId,
      },
    });

    await prisma.historicoFiscal.create({
      data: {
        documentoFiscalId: docInutilizado.id,
        statusNovo: StatusDocumentoFiscal.INUTILIZADA,
        mensagem: `Faixa inutilizada (${numeroInicial}-${numeroFinal}): ${justificativa}`,
        usuarioId,
      },
    });

    res.status(201).json(docInutilizado);
  } catch (error) {
    console.error('Erro ao inutilizar numeração:', error);
    res.status(500).json({ error: 'Erro ao inutilizar numeração' });
  }
};

/**
 * GET /api/fiscal/documentos/:id/xml
 * Retorna o XML do documento
 */
export const downloadXML = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await prisma.documentoFiscal.findUnique({ where: { id } });

    if (!doc) {
      res.status(404).json({ error: 'Documento fiscal não encontrado.' });
      return;
    }

    let xml = doc.xmlAutorizado || doc.xmlEnviado;
    if (!xml) {
      xml = await fiscalProvider.gerarXMLRascunho(doc.id);
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.tipo}_${doc.numero || 'RASCUNHO'}.xml"`);
    res.send(xml);
  } catch (error) {
    console.error('Erro ao baixar XML:', error);
    res.status(500).json({ error: 'Erro ao baixar XML' });
  }
};

/**
 * GET /api/fiscal/documentos/:id/danfe
 * Renderiza o DANFE / DANFSE em HTML imprimível
 */
export const renderDANFE = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = await prisma.documentoFiscal.findUnique({
      where: { id },
      include: {
        cliente: true,
        ordemServico: {
          include: {
            produtos: { include: { produto: true } },
            servicos: { include: { servico: true } },
          },
        },
      },
    });

    if (!doc) {
      res.status(404).send('Documento fiscal não encontrado');
      return;
    }

    const empresa = await prisma.empresaConfig.findFirst();

    const isNfse = doc.tipo === 'NFSE';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${isNfse ? 'DANFSE - Documento Auxiliar da NFS-e' : 'DANFE - Documento Auxiliar da NF-e'}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 20px; }
    .header { border: 2px solid #000; padding: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; }
    .title { font-size: 16px; font-weight: bold; text-align: center; }
    .box { border: 1px solid #000; padding: 8px; margin-bottom: 10px; }
    .box-title { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #444; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #000; padding: 6px; font-size: 11px; text-align: left; }
    th { background: #f0f0f0; }
    .watermark { text-align: center; font-size: 14px; font-weight: bold; color: #c00; margin: 15px 0; border: 1px dashed #c00; padding: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h2>${empresa?.razaoSocial || 'EMPRESA EMITENTE'}</h2>
      <p>${empresa?.endereco}, ${empresa?.numero} - ${empresa?.bairro} - ${empresa?.cidade}/${empresa?.uf}</p>
      <p>CNPJ: ${empresa?.cnpj || ''} | IE: ${empresa?.inscricaoEstadual || ''} | IM: ${empresa?.inscricaoMunicipal || ''}</p>
    </div>
    <div style="text-align: right;">
      <div class="title">${isNfse ? 'DANFSE' : 'DANFE'}</div>
      <p><strong>Nº:</strong> ${doc.numero || 'RASCUNHO'}</p>
      <p><strong>Série:</strong> ${doc.serie}</p>
      <p><strong>Ambiente:</strong> ${doc.ambiente}</p>
    </div>
  </div>

  ${doc.status !== 'AUTORIZADA' ? `<div class="watermark">DOCUMENTO SEM VALOR FISCAL - STATUS: ${doc.status} (${doc.mensagemFiscal || 'PENDENTE DE CONFIGURAÇÃO DO PROVEDOR REAL'})</div>` : ''}

  <div class="box">
    <div class="box-title">CHAVE DE ACESSO</div>
    <div style="font-family: monospace; font-size: 14px; font-weight: bold;">${doc.chave || '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000'}</div>
  </div>

  <div class="box">
    <div class="box-title">DESTINATÁRIO / TOMADOR</div>
    <p><strong>Nome / Razão Social:</strong> ${doc.cliente?.nome || 'CLIENTE NÃO IDENTIFICADO'}</p>
    <p><strong>CPF / CNPJ:</strong> ${doc.cliente?.documento || ''} | <strong>IE / RG:</strong> ${doc.cliente?.inscricaoEstadual || doc.cliente?.rg || '-'}</p>
    <p><strong>Endereço:</strong> ${doc.cliente?.endereco || ''}, ${doc.cliente?.numero || ''} - ${doc.cliente?.bairro || ''} - ${doc.cliente?.cidade || ''}/${doc.cliente?.uf || ''} - CEP: ${doc.cliente?.cep || ''}</p>
  </div>

  <div class="box">
    <div class="box-title">ITENS DA OPERAÇÃO</div>
    <table>
      <thead>
        <tr>
          <th>Código</th>
          <th>Descrição</th>
          <th>NCM/Serviço</th>
          <th>Qtd</th>
          <th>Unitário</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${doc.ordemServico?.produtos?.map(p => `
          <tr>
            <td>${p.codigoInterno || '-'}</td>
            <td>${p.descricao}</td>
            <td>${p.produto?.ncm || '-'}</td>
            <td>${p.quantidade}</td>
            <td>R$ ${Number(p.precoUnitario).toFixed(2)}</td>
            <td>R$ ${Number(p.subtotal).toFixed(2)}</td>
          </tr>
        `).join('') || ''}
        ${doc.ordemServico?.servicos?.map(s => `
          <tr>
            <td>${s.servico?.codigo || '-'}</td>
            <td>${s.descricao}</td>
            <td>${s.servico?.codigoMunicipal || '-'}</td>
            <td>${s.quantidade}</td>
            <td>R$ ${Number(s.precoUnitario).toFixed(2)}</td>
            <td>R$ ${Number(s.subtotal).toFixed(2)}</td>
          </tr>
        `).join('') || ''}
      </tbody>
    </table>
  </div>

  <div class="box" style="display: flex; justify-content: space-between;">
    <div><strong>Base Cálculo ISS/ICMS:</strong> R$ ${Number(doc.valorTotal).toFixed(2)}</div>
    <div><strong>Valor Impostos:</strong> R$ ${Number(doc.valorImpostos).toFixed(2)}</div>
    <div><strong>Valor Total da Nota:</strong> <span style="font-size: 16px; font-weight: bold;">R$ ${Number(doc.valorTotal).toFixed(2)}</span></div>
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Erro ao renderizar DANFE:', error);
    res.status(500).send('Erro ao renderizar DANFE');
  }
};
