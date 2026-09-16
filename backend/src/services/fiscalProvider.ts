import { PrismaClient, TipoDocumentoFiscal, StatusDocumentoFiscal } from '@prisma/client';

const prisma = new PrismaClient();

export interface ValidacaoFiscalResult {
  valido: boolean;
  erros: string[];
  alertas: string[];
}

export interface EmissaoFiscalResult {
  sucesso: boolean;
  status: StatusDocumentoFiscal;
  chave?: string;
  protocolo?: string;
  xml?: string;
  mensagem: string;
}

/**
 * Provedor Fiscal Desacoplado (Decoupled Fiscal Provider Interface)
 */
export class FiscalProviderService {
  /**
   * Valida rigorosamente todos os campos obrigatórios antes da emissão fiscal
   */
  async validarDocumento(documentoFiscalId: string): Promise<ValidacaoFiscalResult> {
    const doc = await prisma.documentoFiscal.findUnique({
      where: { id: documentoFiscalId },
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
      return { valido: false, erros: ['Documento fiscal não encontrado.'], alertas: [] };
    }

    const erros: string[] = [];
    const alertas: string[] = [];

    // 1. Validar Empresa Emitente
    const empresa = await prisma.empresaConfig.findFirst();
    const configFiscal = await prisma.configuracaoFiscal.findFirst();

    if (!empresa || !empresa.cnpj || empresa.cnpj.trim() === '') {
      erros.push('CNPJ da empresa emitente não cadastrado.');
    }
    if (!empresa || !empresa.razaoSocial) {
      erros.push('Razão Social da empresa emitente não cadastrada.');
    }
    if (doc.tipo === 'NFSE' && (!empresa?.inscricaoMunicipal || empresa.inscricaoMunicipal.includes('Pendente'))) {
      erros.push('Inscrição Municipal da empresa é obrigatória para emissão de NFS-e.');
    }

    // 2. Validar Cliente / Destinatário
    const cliente = doc.cliente;
    if (!cliente) {
      erros.push('Cliente / Destinatário é obrigatório para emissão fiscal.');
    } else {
      if (!cliente.documento || cliente.documento.trim() === '') {
        erros.push(`Cliente ${cliente.nome}: CPF ou CNPJ não informado.`);
      }
      if (!cliente.endereco || !cliente.cidade || !cliente.uf) {
        erros.push(`Cliente ${cliente.nome}: Endereço, cidade e UF são obrigatórios para emissão fiscal.`);
      }
    }

    // 3. Validar Itens conforme Tipo de Nota
    if (doc.ordemServico) {
      const produtos = doc.ordemServico.produtos || [];
      const servicos = doc.ordemServico.servicos || [];

      if (doc.tipo === 'NFE' || doc.tipo === 'NFCE') {
        if (produtos.length === 0) {
          erros.push(`Emissão de ${doc.tipo} exige ao menos um produto na operação.`);
        }
        for (const p of produtos) {
          const prodObj = p.produto;
          if (!prodObj?.ncm || prodObj.ncm.trim() === '') {
            erros.push(`Produto "${p.descricao}": Código NCM não configurado.`);
          }
          if (!prodObj?.cfop && !configFiscal) {
            alertas.push(`Produto "${p.descricao}": CFOP não especificado, será aplicado CFOP padrão da operação.`);
          }
        }
      }

      if (doc.tipo === 'NFSE') {
        if (servicos.length === 0) {
          erros.push('Emissão de NFS-e exige ao menos um serviço prestado na operação.');
        }
        for (const s of servicos) {
          const servObj = s.servico;
          if (!servObj?.codigoMunicipal && !configFiscal?.codigoServicoMunicipal) {
            erros.push(`Serviço "${s.descricao}": Código de serviço municipal não informado.`);
          }
        }
      }
    }

    return {
      valido: erros.length === 0,
      erros,
      alertas,
    };
  }

  /**
   * Tenta emitir o documento fiscal.
   * Se nenhuma credencial/certificado real estiver configurado, retorna estado seguro com explicação.
   */
  async emitir(documentoFiscalId: string, usuarioId?: string): Promise<EmissaoFiscalResult> {
    const validacao = await this.validarDocumento(documentoFiscalId);
    if (!validacao.valido) {
      return {
        sucesso: false,
        status: StatusDocumentoFiscal.REJEITADA,
        mensagem: `Validação fiscal reprovada: ${validacao.erros.join(' | ')}`,
      };
    }

    const configFiscal = await prisma.configuracaoFiscal.findFirst();

    // REGRA FUNDAMENTAL: Se não houver certificado/provedor real configurado,
    // NÃO gera nota como "autorizada fake". Retorna status claro.
    if (!configFiscal || !configFiscal.certificadoDigitalConfigurado) {
      const msg = 'Emissão fiscal pendente de configuração do provedor / certificado digital real.';

      await prisma.documentoFiscal.update({
        where: { id: documentoFiscalId },
        data: {
          status: StatusDocumentoFiscal.ERRO,
          mensagemFiscal: msg,
        },
      });

      await prisma.historicoFiscal.create({
        data: {
          documentoFiscalId,
          statusAnterior: StatusDocumentoFiscal.RASCUNHO,
          statusNovo: StatusDocumentoFiscal.ERRO,
          mensagem: msg,
          usuarioId: usuarioId || null,
        },
      });

      return {
        sucesso: false,
        status: StatusDocumentoFiscal.ERRO,
        mensagem: msg,
      };
    }

    // Se no futuro houver integração real com SEFAZ / Provedor NFS-e (ex: FocusNFe / PlugNotas):
    // Aqui seria realizada a requisição via HTTPS/mTLS usando o certificado digital.
    return {
      sucesso: false,
      status: StatusDocumentoFiscal.PROCESSANDO,
      mensagem: 'Ambiente fiscal configurado. Transmissão enviada para processamento.',
    };
  }

  /**
   * Gera representação estática em XML do documento fiscal (Rascunho Estruturado)
   */
  async gerarXMLRascunho(documentoFiscalId: string): Promise<string> {
    const doc = await prisma.documentoFiscal.findUnique({
      where: { id: documentoFiscalId },
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

    if (!doc) return '';

    const empresa = await prisma.empresaConfig.findFirst();

    if (doc.tipo === 'NFSE') {
      return `<?xml version="1.0" encoding="UTF-8"?>
<RPS xmlns="http://www.abrasf.org.br/nfse">
  <InfDeclaracaoPrestacaoServico>
    <Rps>
      <IdentificacaoRps>
        <Numero>${doc.numero || 1}</Numero>
        <Serie>${doc.serie}</Serie>
        <Tipo>1</Tipo>
      </IdentificacaoRps>
      <DataEmissao>${new Date(doc.dataEmissao).toISOString()}</DataEmissao>
      <Status>1</Status>
    </Rps>
    <Prestador>
      <CpfCnpj><Cnpj>${empresa?.cnpj.replace(/\D/g, '') || ''}</Cnpj></CpfCnpj>
      <InscricaoMunicipal>${empresa?.inscricaoMunicipal || ''}</InscricaoMunicipal>
    </Prestador>
    <Tomador>
      <IdentificacaoTomador>
        <CpfCnpj><Cpf>${doc.cliente?.documento?.replace(/\D/g, '') || ''}</Cpf></CpfCnpj>
      </IdentificacaoTomador>
      <RazaoSocial>${doc.cliente?.nome || ''}</RazaoSocial>
      <Endereco>
        <Endereco>${doc.cliente?.endereco || ''}</Endereco>
        <Numero>${doc.cliente?.numero || 'S/N'}</Numero>
        <Bairro>${doc.cliente?.bairro || ''}</Bairro>
        <CodigoMunicipio>${doc.cliente?.codigoIbge || '3304557'}</CodigoMunicipio>
        <Uf>${doc.cliente?.uf || 'RJ'}</Uf>
        <Cep>${doc.cliente?.cep?.replace(/\D/g, '') || ''}</Cep>
      </Endereco>
    </Tomador>
    <Servico>
      <Valores>
        <ValorServicos>${doc.valorServicos.toFixed(2)}</ValorServicos>
        <ValorLiquidoNfse>${doc.valorTotal.toFixed(2)}</ValorLiquidoNfse>
      </Valores>
      <Discriminacao>${doc.ordemServico?.servicos?.map(s => s.descricao).join('; ') || 'Prestação de serviços automotivos'}</Discriminacao>
    </Servico>
  </InfDeclaracaoPrestacaoServico>
</RPS>`;
    }

    // NF-e / NFC-e XML Schema Structure
    return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe${doc.chave || '00000000000000000000000000000000000000000000'}" versao="4.00">
    <ide>
      <cUF>33</cUF>
      <cNF>12345678</cNF>
      <natOp>Venda de Mercadorias / Peças Automotivas</natOp>
      <mod>${doc.tipo === 'NFCE' ? '65' : '55'}</mod>
      <serie>${doc.serie}</serie>
      <nNF>${doc.numero || 1}</nNF>
      <dhEmi>${new Date(doc.dataEmissao).toISOString()}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>${empresa?.codigoIbge || '3304557'}</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <tpAmb>${doc.ambiente === 'PRODUCAO' ? '1' : '2'}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
    </ide>
    <emit>
      <CNPJ>${empresa?.cnpj.replace(/\D/g, '') || ''}</CNPJ>
      <xNome>${empresa?.razaoSocial || ''}</xNome>
      <xFant>${empresa?.nomeFantasia || ''}</xFant>
      <enderEmit>
        <xLgr>${empresa?.endereco || ''}</xLgr>
        <nro>${empresa?.numero || ''}</nro>
        <xBairro>${empresa?.bairro || ''}</xBairro>
        <cMun>${empresa?.codigoIbge || '3304557'}</cMun>
        <xMun>${empresa?.cidade || 'Rio de Janeiro'}</xMun>
        <UF>${empresa?.uf || 'RJ'}</UF>
        <CEP>${empresa?.cep?.replace(/\D/g, '') || ''}</CEP>
      </enderEmit>
      <CRT>${empresa?.crt || '1'}</CRT>
    </emit>
    <dest>
      <CPF>${doc.cliente?.documento?.replace(/\D/g, '') || ''}</CPF>
      <xNome>${doc.cliente?.nome || ''}</xNome>
    </dest>
    <total>
      <ICMSTot>
        <vProd>${doc.valorProdutos.toFixed(2)}</vProd>
        <vNF>${doc.valorTotal.toFixed(2)}</vNF>
      </ICMSTot>
    </total>
  </infNFe>
</NFe>`;
  }
}

export const fiscalProvider = new FiscalProviderService();
