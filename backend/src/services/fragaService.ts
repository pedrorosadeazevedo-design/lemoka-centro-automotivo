import { FragaProvider, FragaSearchFilters } from '../providers/FragaProvider';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const fragaProvider = new FragaProvider();

export const fragaService = {
  /**
   * Consulta o catálogo online Fraga por texto livre ou filtros de veículo
   */
  buscarPecasOnline: async (filters: FragaSearchFilters) => {
    return await fragaProvider.searchPecas(filters);
  },

  /**
   * Importa uma peça Fraga como Produto local no cadastro da oficina
   */
  importarPecaParaCatalogoLocal: async (params: {
    fragaPecaId: string;
    precoVenda: number;
    precoCusto?: number;
    estoqueFisico?: number;
    estoqueMinimo?: number;
    localizacao?: string;
    // Dados da peça Fraga passados diretamente ou consultados
    codigoFraga?: string;
    codigoFabricante?: string;
    codigoOEM?: string;
    descricao: string;
    marca?: string;
    categoria?: string;
    unidade?: string;
  }) => {
    const {
      fragaPecaId,
      precoVenda,
      precoCusto = 0,
      estoqueFisico = 0,
      estoqueMinimo = 0,
      localizacao,
      codigoFraga,
      codigoFabricante,
      codigoOEM,
      descricao,
      marca,
      categoria,
      unidade = 'UN',
    } = params;

    if (!descricao || precoVenda === undefined || precoVenda <= 0) {
      throw new Error('Descrição e Preço de Venda válido são obrigatórios para importar uma peça para o estoque.');
    }

    // 1. Tentar encontrar se já existe um produto cadastrado com este externalId ou mesmo código OEM / Fabricante
    let produtoExistente = await prisma.produto.findFirst({
      where: {
        OR: [
          { externalProvider: 'FRAGA', externalId: fragaPecaId },
          ...(codigoFraga ? [{ codigoInterno: codigoFraga }] : []),
          ...(codigoFabricante ? [{ referenciaFabricante: codigoFabricante }] : []),
          ...(codigoOEM ? [{ codigoOEM }] : []),
        ],
      },
    });

    if (produtoExistente) {
      // Se o produto já existe no catálogo da oficina, apenas atualiza a referência Fraga e preço/estoque se desejado
      return await prisma.produto.update({
        where: { id: produtoExistente.id },
        data: {
          externalProvider: 'FRAGA',
          externalId: fragaPecaId,
          precoVenda: Number(precoVenda),
          ...(precoCusto ? { precoCusto: Number(precoCusto) } : {}),
        },
      });
    }

    // 2. Se não existe, cria um novo Produto no catálogo local da oficina
    return await prisma.produto.create({
      data: {
        descricao,
        marca: marca || null,
        categoria: categoria || null,
        unidade: unidade || 'UN',
        codigoInterno: codigoFraga || null,
        referenciaFabricante: codigoFabricante || null,
        codigoOEM: codigoOEM || null,
        precoCusto: Number(precoCusto) || 0,
        precoVenda: Number(precoVenda),
        estoqueFisico: Number(estoqueFisico) || 0,
        estoqueMinimo: Number(estoqueMinimo) || 0,
        localizacao: localizacao || null,
        externalProvider: 'FRAGA',
        externalId: fragaPecaId,
      },
    });
  },
};
