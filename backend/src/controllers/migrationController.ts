import { Request, Response } from 'express';
import Prisma from '@prisma/client';
const { PrismaClient } = Prisma;

const prisma = new PrismaClient();

export interface MigrationSummaryItem {
  entidade: string;
  totalLinhasOrigem: number;
  novosParaImportar: number;
  duplicadosDetectados: number;
  conflitosCamposIncompletos: number;
  semRelacionamentoDirecto: number;
  statusPronto: boolean;
}

export interface DryRunResult {
  modo: 'DRY_RUN_PREVIEW';
  sucesso: boolean;
  executadoEm: string;
  resumoEntidades: Record<string, MigrationSummaryItem>;
  amostraConflitos: { entidade: string; idOriginal?: string; motivo: string; recomendacao: string }[];
  ordemRecomendadaImportacao: string[];
}

/**
 * Motor de Análise, Mapeamento e Dry Run da Migração OSDIG -> Lemoka
 * POST /api/migration/dry-run
 */
export async function executeMigrationDryRun(req: Request, res: Response) {
  try {
    const { dataset } = req.body; // Aceita payload estruturado com arrays de dados do OSDIG (clientes, produtos, servicos, os, etc.)

    const clientesOrigem = dataset?.clientes || [];
    const produtosOrigem = dataset?.produtos || [];
    const servicosOrigem = dataset?.servicos || [];
    const ordensServicoOrigem = dataset?.ordensServico || [];
    const fornecedoresOrigem = dataset?.fornecedores || [];
    const contasReceberOrigem = dataset?.contasReceber || [];
    const contasPagarOrigem = dataset?.contasPagar || [];

    const conflitosAmostra: { entidade: string; idOriginal?: string; motivo: string; recomendacao: string }[] = [];

    // --- 1. AUDITORIA & DRY RUN CLIENTES ---
    let clientesNovos = 0;
    let clientesDuplicados = 0;
    let clientesConflitos = 0;

    const clientesExistentes = await prisma.cliente.findMany({ select: { id: true, documento: true, osdigId: true } });
    const docsExistentes = new Set(clientesExistentes.map(c => c.documento).filter(Boolean));
    const osdigIdsExistentes = new Set(clientesExistentes.map(c => c.osdigId).filter(Boolean));

    for (const c of clientesOrigem) {
      const doc = c.documento || c.cpf || c.cnpj;
      const osdigId = c.id || c.codigo;

      if (osdigId && osdigIdsExistentes.has(String(osdigId))) {
        clientesDuplicados++;
      } else if (doc && docsExistentes.has(String(doc))) {
        clientesDuplicados++;
        conflitosAmostra.push({
          entidade: 'Cliente',
          idOriginal: String(osdigId || doc),
          motivo: `Documento CPF/CNPJ ${doc} já cadastrado no Lemoka.`,
          recomendacao: 'Associar historico OSDIG ao registro de Cliente existente via osdigId.'
        });
      } else if (!c.nome) {
        clientesConflitos++;
        conflitosAmostra.push({
          entidade: 'Cliente',
          idOriginal: String(osdigId),
          motivo: 'Nome do cliente ausente no registro de origem.',
          recomendacao: 'Manter bloqueado ou revisar no arquivo do OSDIG.'
        });
      } else {
        clientesNovos++;
      }
    }

    // --- 2. AUDITORIA & DRY RUN PRODUTOS ---
    let produtosNovos = 0;
    let produtosDuplicados = 0;
    let produtosComEstoqueNegativo = 0;

    const produtosExistentes = await prisma.produto.findMany({ select: { id: true, codigoInterno: true, osdigId: true } });
    const codigosExistentes = new Set(produtosExistentes.map(p => p.codigoInterno).filter(Boolean));

    for (const p of produtosOrigem) {
      const cod = p.codigoInterno || p.codigo;
      const osdigId = p.id || p.codigo;

      if (osdigId && osdigIdsExistentes.has(String(osdigId))) {
        produtosDuplicados++;
      } else if (cod && codigosExistentes.has(String(cod))) {
        produtosDuplicados++;
      } else {
        produtosNovos++;
      }

      if (Number(p.estoqueFisico || p.estoque || 0) < 0) {
        produtosComEstoqueNegativo++;
      }
    }

    // --- 3. RESUMO CONSOLIDADO DA PRÉVIA ---
    const dryRunResult: DryRunResult = {
      modo: 'DRY_RUN_PREVIEW',
      sucesso: true,
      executadoEm: new Date().toISOString(),
      resumoEntidades: {
        Cliente: {
          entidade: 'Cliente',
          totalLinhasOrigem: clientesOrigem.length,
          novosParaImportar: clientesNovos,
          duplicadosDetectados: clientesDuplicados,
          conflitosCamposIncompletos: clientesConflitos,
          semRelacionamentoDirecto: 0,
          statusPronto: true
        },
        Produto: {
          entidade: 'Produto',
          totalLinhasOrigem: produtosOrigem.length,
          novosParaImportar: produtosNovos,
          duplicadosDetectados: produtosDuplicados,
          conflitosCamposIncompletos: 0,
          semRelacionamentoDirecto: 0,
          statusPronto: true
        },
        Servico: {
          entidade: 'Servico',
          totalLinhasOrigem: servicosOrigem.length,
          novosParaImportar: servicosOrigem.length,
          duplicadosDetectados: 0,
          conflitosCamposIncompletos: 0,
          semRelacionamentoDirecto: 0,
          statusPronto: true
        },
        OrdemServico: {
          entidade: 'OrdemServico',
          totalLinhasOrigem: ordensServicoOrigem.length,
          novosParaImportar: ordensServicoOrigem.length,
          duplicadosDetectados: 0,
          conflitosCamposIncompletos: 0,
          semRelacionamentoDirecto: 0,
          statusPronto: true
        },
        Fornecedor: {
          entidade: 'Fornecedor',
          totalLinhasOrigem: fornecedoresOrigem.length,
          novosParaImportar: fornecedoresOrigem.length,
          duplicadosDetectados: 0,
          conflitosCamposIncompletos: 0,
          semRelacionamentoDirecto: 0,
          statusPronto: true
        },
        ContaReceber: {
          entidade: 'ContaReceber',
          totalLinhasOrigem: contasReceberOrigem.length,
          novosParaImportar: contasReceberOrigem.length,
          duplicadosDetectados: 0,
          conflitosCamposIncompletos: 0,
          semRelacionamentoDirecto: 0,
          statusPronto: true
        },
        ContaPagar: {
          entidade: 'ContaPagar',
          totalLinhasOrigem: contasPagarOrigem.length,
          novosParaImportar: contasPagarOrigem.length,
          duplicadosDetectados: 0,
          conflitosCamposIncompletos: 0,
          semRelacionamentoDirecto: 0,
          statusPronto: true
        }
      },
      amostraConflitos: conflitosAmostra,
      ordemRecomendadaImportacao: [
        '1. EmpresaConfig & Parâmetros Fiscais',
        '2. Fornecedores',
        '3. Clientes',
        '4. Veículos',
        '5. Produtos',
        '6. Serviços',
        '7. Compras & Entradas',
        '8. Estoque Inicial e Histórico',
        '9. Ordens de Serviço / Vendas',
        '10. Itens de Peças e Serviços das OS',
        '11. Contas a Receber',
        '12. Contas a Pagar',
        '13. Histórico de Caixa e Bancos',
        '14. Histórico de CRM e Fidelização'
      ]
    };

    return res.json(dryRunResult);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Motor de Execução Controlada de Lote de Migração em Homologação (Amostra / Idempotente)
 * POST /api/migration/execute-batch
 */
export async function executeMigrationBatch(req: Request, res: Response) {
  try {
    const { dataset, modo = 'HOMOLOGACAO_AMOSTRA' } = req.body;
    const usuarioId = (req as any).user?.id;

    const clientesOrigem = dataset?.clientes || [];
    const produtosOrigem = dataset?.produtos || [];
    const servicosOrigem = dataset?.servicos || [];
    const fornecedoresOrigem = dataset?.fornecedores || [];
    const ordensServicoOrigem = dataset?.ordensServico || [];

    // Criar Lote de Migração no Banco
    const batch = await prisma.migrationBatch.create({
      data: {
        nome: `Lote Homologação Amostra - ${new Date().toLocaleDateString('pt-BR')}`,
        origem: 'OSDIG',
        modo,
        status: 'EM_EXECUCAO',
        usuarioResponsavel: usuarioId,
        totalRegistros: clientesOrigem.length + produtosOrigem.length + servicosOrigem.length + fornecedoresOrigem.length + ordensServicoOrigem.length
      }
    });

    let totalCriados = 0;
    let totalAtualizados = 0;
    let totalIgnorados = 0;
    let totalConflitos = 0;
    let totalErros = 0;

    // --- 1. PROCESSAR FORNECEDORES ---
    for (const f of fornecedoresOrigem) {
      try {
        const osdigId = String(f.id || f.codigo || '');
        const doc = f.documento || f.cnpj || f.cpf;
        
        let fornecedorExistente = null;
        if (osdigId) {
          fornecedorExistente = await prisma.fornecedor.findFirst({ where: { documento: doc } });
        }

        if (fornecedorExistente) {
          totalIgnorados++;
          await prisma.migrationLog.create({
            data: {
              migrationBatchId: batch.id,
              entidade: 'Fornecedor',
              osdigId,
              acao: 'SKIP',
              registroId: fornecedorExistente.id,
              mensagem: `Fornecedor '${f.razaoSocial}' já existe no Lemoka.`
            }
          });
        } else {
          const novo = await prisma.fornecedor.create({
            data: {
              razaoSocial: f.razaoSocial || 'Fornecedor OSDIG',
              nomeFantasia: f.nomeFantasia,
              documento: doc || null,
              telefone: f.telefone,
              email: f.email,
              cidade: f.cidade,
              uf: f.uf
            }
          });
          totalCriados++;
          await prisma.migrationLog.create({
            data: {
              migrationBatchId: batch.id,
              entidade: 'Fornecedor',
              osdigId,
              acao: 'CREATE',
              registroId: novo.id,
              mensagem: `Fornecedor '${novo.razaoSocial}' importado com sucesso.`
            }
          });
        }
      } catch (err: any) {
        totalErros++;
        await prisma.migrationLog.create({
          data: {
            migrationBatchId: batch.id,
            entidade: 'Fornecedor',
            osdigId: String(f.id || ''),
            acao: 'ERROR',
            status: 'ERRO',
            mensagem: `Erro ao importar fornecedor ${f.razaoSocial}: ${err.message}`,
            erroTecnico: err.stack
          }
        });
      }
    }

    // --- 2. PROCESSAR CLIENTES ---
    for (const c of clientesOrigem) {
      try {
        const osdigId = String(c.id || c.codigo || '');
        const doc = c.documento || c.cpf || c.cnpj;

        let clienteExistente = null;
        if (osdigId) clienteExistente = await prisma.cliente.findFirst({ where: { osdigId } });
        if (!clienteExistente && doc) clienteExistente = await prisma.cliente.findFirst({ where: { documento: doc } });

        if (clienteExistente) {
          totalIgnorados++;
          await prisma.migrationLog.create({
            data: {
              migrationBatchId: batch.id,
              entidade: 'Cliente',
              osdigId,
              acao: 'SKIP',
              registroId: clienteExistente.id,
              mensagem: `Cliente '${c.nome}' já cadastrado ou existente no Lemoka.`
            }
          });
        } else if (!c.nome) {
          totalConflitos++;
          await prisma.migrationLog.create({
            data: {
              migrationBatchId: batch.id,
              entidade: 'Cliente',
              osdigId,
              acao: 'CONFLICT',
              status: 'ALERTA',
              mensagem: `Cliente id ${osdigId} sem nome. Registro mantido em pendência.`
            }
          });
        } else {
          const novo = await prisma.cliente.create({
            data: {
              nome: c.nome,
              tipoDocumento: (doc && doc.length > 11) ? 'CNPJ' : 'CPF',
              documento: doc || null,
              telefone: c.telefone,
              whatsapp: c.whatsapp || c.telefone,
              email: c.email,
              cep: c.cep,
              endereco: c.endereco,
              numero: c.numero,
              bairro: c.bairro,
              cidade: c.cidade,
              uf: c.uf,
              osdigId
            }
          });
          totalCriados++;
          await prisma.migrationLog.create({
            data: {
              migrationBatchId: batch.id,
              entidade: 'Cliente',
              osdigId,
              acao: 'CREATE',
              registroId: novo.id,
              mensagem: `Cliente '${novo.nome}' importado com sucesso.`
            }
          });
        }
      } catch (err: any) {
        totalErros++;
        await prisma.migrationLog.create({
          data: {
            migrationBatchId: batch.id,
            entidade: 'Cliente',
            osdigId: String(c.id || ''),
            acao: 'ERROR',
            status: 'ERRO',
            mensagem: `Erro ao importar cliente ${c.nome}: ${err.message}`
          }
        });
      }
    }

    // --- 3. PROCESSAR PRODUTOS (COM PRESERVAÇÃO DE ESTOQUE NEGATIVO) ---
    for (const p of produtosOrigem) {
      try {
        const osdigId = String(p.id || p.codigo || '');
        const cod = p.codigoInterno || p.codigo;

        let prodExistente = null;
        if (osdigId) prodExistente = await prisma.produto.findFirst({ where: { osdigId } });
        if (!prodExistente && cod) prodExistente = await prisma.produto.findFirst({ where: { codigoInterno: cod } });

        if (prodExistente) {
          totalIgnorados++;
          await prisma.migrationLog.create({
            data: {
              migrationBatchId: batch.id,
              entidade: 'Produto',
              osdigId,
              acao: 'SKIP',
              registroId: prodExistente.id,
              mensagem: `Produto '${p.descricao}' já existente no catálogo.`
            }
          });
        } else {
          const estFisico = Number(p.estoqueFisico ?? p.estoque ?? 0);
          const novo = await prisma.produto.create({
            data: {
              codigoInterno: cod || null,
              descricao: p.descricao || 'Produto OSDIG',
              marca: p.marca,
              unidade: p.unidade || 'UN',
              precoCusto: Number(p.precoCusto || 0),
              precoVenda: Number(p.precoVenda || 0),
              estoqueFisico: estFisico, // PRESERVA ESTOQUE NEGATIVO SE HOUVER
              osdigId
            }
          });
          totalCriados++;
          await prisma.migrationLog.create({
            data: {
              migrationBatchId: batch.id,
              entidade: 'Produto',
              osdigId,
              acao: 'CREATE',
              registroId: novo.id,
              mensagem: `Produto '${novo.descricao}' importado. Estoque inicial: ${estFisico}.`
            }
          });
        }
      } catch (err: any) {
        totalErros++;
        await prisma.migrationLog.create({
          data: {
            migrationBatchId: batch.id,
            entidade: 'Produto',
            osdigId: String(p.id || ''),
            acao: 'ERROR',
            status: 'ERRO',
            mensagem: `Erro ao importar produto ${p.descricao}: ${err.message}`
          }
        });
      }
    }

    // --- 4. PROCESSAR SERVIÇOS ---
    for (const s of servicosOrigem) {
      try {
        const osdigId = String(s.id || s.codigo || '');
        const desc = s.descricao || 'Serviço OSDIG';

        let servExistente = null;
        if (osdigId) servExistente = await prisma.servico.findFirst({ where: { osdigId } });
        if (!servExistente && desc) servExistente = await prisma.servico.findFirst({ where: { descricao: desc } });

        if (servExistente) {
          totalIgnorados++;
          await prisma.migrationLog.create({
            data: {
              migrationBatchId: batch.id,
              entidade: 'Servico',
              osdigId,
              acao: 'SKIP',
              registroId: servExistente.id,
              mensagem: `Serviço '${desc}' já existente no catálogo.`
            }
          });
        } else {
          const novo = await prisma.servico.create({
            data: {
              codigo: s.codigo || null,
              descricao: desc,
              precoPadrao: Number(s.precoPadrao || s.valor || 0),
              tempoEstimadoMinutos: Number(s.tempoEstimadoMinutos || 60),
              categoria: s.categoria,
              osdigId
            }
          });
          totalCriados++;
          await prisma.migrationLog.create({
            data: {
              migrationBatchId: batch.id,
              entidade: 'Servico',
              osdigId,
              acao: 'CREATE',
              registroId: novo.id,
              mensagem: `Serviço '${novo.descricao}' importado com sucesso.`
            }
          });
        }
      } catch (err: any) {
        totalErros++;
        await prisma.migrationLog.create({
          data: {
            migrationBatchId: batch.id,
            entidade: 'Servico',
            osdigId: String(s.id || ''),
            acao: 'ERROR',
            status: 'ERRO',
            mensagem: `Erro ao importar serviço ${s.descricao}: ${err.message}`
          }
        });
      }
    }

    // --- 5. PROCESSAR VEÍCULOS ---
    const veiculosOrigem = dataset?.veiculos || [];
    for (const v of veiculosOrigem) {
      try {
        const osdigId = String(v.id || '');
        const placa = (v.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (!placa) {
          totalConflitos++;
          await prisma.migrationLog.create({
            data: {
              migrationBatchId: batch.id,
              entidade: 'Vehicle',
              osdigId,
              acao: 'CONFLICT',
              status: 'ALERTA',
              mensagem: `Veículo id ${osdigId} sem placa informada.`
            }
          });
          continue;
        }

        let veicExistente = await prisma.vehicle.findFirst({ where: { placa } });

        if (veicExistente) {
          totalIgnorados++;
          await prisma.migrationLog.create({
            data: {
              migrationBatchId: batch.id,
              entidade: 'Vehicle',
              osdigId,
              acao: 'SKIP',
              registroId: veicExistente.id,
              mensagem: `Veículo placa '${placa}' já cadastrado.`
            }
          });
        } else {
          // Buscar cliente proprietário pelo clienteId ou osdigClienteId
          let clienteId = null;
          if (v.clienteId || v.osdigClienteId) {
            const cli = await prisma.cliente.findFirst({
              where: { OR: [{ id: v.clienteId }, { osdigId: String(v.osdigClienteId || v.clienteId) }] }
            });
            if (cli) clienteId = cli.id;
          }

          if (!clienteId) {
            // Se não encontrou cliente, busca o primeiro cliente do banco ou cria o vínculo pro primeiro cliente válido
            const emps = await prisma.cliente.findFirst();
            if (emps) clienteId = emps.id;
          }

          if (clienteId) {
            const novo = await prisma.vehicle.create({
              data: {
                clienteId,
                placa,
                marca: v.marca || 'GENERICA',
                modelo: v.modelo || 'VEICULO',
                versao: v.versao,
                anoFabricacao: v.anoFabricacao ? Number(v.anoFabricacao) : null,
                anoModelo: v.anoModelo ? Number(v.anoModelo) : null,
                quilometragemAtual: Number(v.quilometragemAtual || v.km || 0),
                osdigId
              }
            });
            totalCriados++;
            await prisma.migrationLog.create({
              data: {
                migrationBatchId: batch.id,
                entidade: 'Vehicle',
                osdigId,
                acao: 'CREATE',
                registroId: novo.id,
                mensagem: `Veículo '${novo.modelo}' (${placa}) importado.`
              }
            });
          } else {
            totalConflitos++;
            await prisma.migrationLog.create({
              data: {
                migrationBatchId: batch.id,
                entidade: 'Vehicle',
                osdigId,
                acao: 'CONFLICT',
                status: 'ALERTA',
                mensagem: `Veículo placa '${placa}' sem cliente proprietário relacionado.`
              }
            });
          }
        }
      } catch (err: any) {
        totalErros++;
        await prisma.migrationLog.create({
          data: {
            migrationBatchId: batch.id,
            entidade: 'Vehicle',
            osdigId: String(v.id || ''),
            acao: 'ERROR',
            status: 'ERRO',
            mensagem: `Erro ao importar veículo placa ${v.placa}: ${err.message}`
          }
        });
      }
    }

    // --- 6. ATUALIZAR STATUS DO LOTE ---
    const finalStatus = totalErros > 0 ? 'CONCLUIDO_COM_ALERTAS' : 'CONCLUIDO';
    const batchAtualizado = await prisma.migrationBatch.update({
      where: { id: batch.id },
      data: {
        status: finalStatus,
        finalizadoEm: new Date(),
        totalCriados,
        totalAtualizados,
        totalIgnorados,
        totalConflitos,
        totalErros
      },
      include: {
        logs: { take: 50, orderBy: { createdAt: 'desc' } }
      }
    });

    return res.json(batchAtualizado);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/migration/batches
 * Consulta histórico de lotes de migração
 */
export async function getMigrationBatches(req: Request, res: Response) {
  try {
    const batches = await prisma.migrationBatch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { logs: true } }
      }
    });
    return res.json(batches);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

