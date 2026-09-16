import { Request, Response } from 'express';
import { fragaService } from '../services/fragaService';
import { addItemProdutoToOS } from './osController';

/**
 * GET /api/fraga/buscar
 * Realiza consulta online na API oficial do Fraga
 */
export const buscarPecasFraga = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q, codigo, marca, modelo, versao, ano, motorizacao } = req.query;

    const result = await fragaService.buscarPecasOnline({
      q: typeof q === 'string' ? q : undefined,
      codigo: typeof codigo === 'string' ? codigo : undefined,
      marcaVeiculo: typeof marca === 'string' ? marca : undefined,
      modeloVeiculo: typeof modelo === 'string' ? modelo : undefined,
      versaoVeiculo: typeof versao === 'string' ? versao : undefined,
      anoVeiculo: ano ? Number(ano) : undefined,
      motorizacaoVeiculo: typeof motorizacao === 'string' ? motorizacao : undefined,
    });

    res.json(result);
  } catch (error: any) {
    console.error('Erro no controller de busca Fraga:', error);
    res.status(500).json({ error: 'Erro interno ao consultar catálogo Fraga' });
  }
};

/**
 * POST /api/fraga/importar
 * Importa uma peça encontrada no Fraga para o catálogo de produtos local da oficina
 */
export const importarPecaFraga = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      fragaPecaId,
      precoVenda,
      precoCusto,
      estoqueFisico,
      estoqueMinimo,
      localizacao,
      codigoFraga,
      codigoFabricante,
      codigoOEM,
      descricao,
      marca,
      categoria,
      unidade,
    } = req.body;

    if (!fragaPecaId || !descricao || precoVenda === undefined) {
      res.status(400).json({ error: 'fragaPecaId, descrição e precoVenda são obrigatórios para importar a peça' });
      return;
    }

    const produto = await fragaService.importarPecaParaCatalogoLocal({
      fragaPecaId,
      precoVenda: Number(precoVenda),
      precoCusto: precoCusto ? Number(precoCusto) : 0,
      estoqueFisico: estoqueFisico ? Number(estoqueFisico) : 0,
      estoqueMinimo: estoqueMinimo ? Number(estoqueMinimo) : 0,
      localizacao,
      codigoFraga,
      codigoFabricante,
      codigoOEM,
      descricao,
      marca,
      categoria,
      unidade,
    });

    res.status(201).json(produto);
  } catch (error: any) {
    console.error('Erro ao importar peça Fraga:', error);
    res.status(400).json({ error: error.message || 'Erro ao importar peça para o cadastro da oficina' });
  }
};
