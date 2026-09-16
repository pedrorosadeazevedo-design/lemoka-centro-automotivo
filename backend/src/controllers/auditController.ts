import { Request, Response } from 'express';
import Prisma from '@prisma/client';
const { PrismaClient } = Prisma;

const prisma = new PrismaClient();

/**
 * 1. POST /api/migration/audit/run
 * Executa varredura profunda de integridade e conciliação pós-migração
 */
export async function runMigrationAudit(req: Request, res: Response) {
  try {
    // Limpa auditorias anteriores não resolvidas para re-auditar a base inteira
    await prisma.migrationAuditRecord.deleteMany({ where: { status: 'PENDENTE' } });

    const auditRecords: {
      entidade: string;
      registroId?: string;
      osdigId?: string;
      descricao: string;
      severidade: 'OK' | 'ALERTA' | 'CONFLITO' | 'ERRO';
      motivo: string;
      acaoRecomendada?: string;
    }[] = [];

    // --- A. AUDITORIA DE PRODUTOS & ESTOQUE ---
    const produtos = await prisma.produto.findMany();
    let totalEstoqueNegativo = 0;
    let totalSemCusto = 0;

    for (const p of produtos) {
      const estFisico = Number(p.estoqueFisico || 0);
      const estReservado = Number(p.estoqueReservado || 0);
      const estDisponivel = estFisico - estReservado;
      const custo = Number(p.precoCusto || 0);

      if (estFisico < 0) {
        totalEstoqueNegativo++;
        auditRecords.push({
          entidade: 'Produto',
          registroId: p.id,
          osdigId: p.osdigId || undefined,
          descricao: `Produto '${p.descricao}'`,
          severidade: 'ALERTA',
          motivo: `Estoque físico negativo (${estFisico} UN). Dado válido preservado da migração OSDIG.`,
          acaoRecomendada: 'Realizar inventário físico ou entrada de ajuste quando apropriado.'
        });
      }

      if (custo === 0) {
        totalSemCusto++;
        auditRecords.push({
          entidade: 'Produto',
          registroId: p.id,
          osdigId: p.osdigId || undefined,
          descricao: `Produto '${p.descricao}'`,
          severidade: 'ALERTA',
          motivo: 'Preço de custo cadastrado como R$ 0,00.',
          acaoRecomendada: 'Atualizar o custo unitário para cálculo exato de CMV e margem na DRE.'
        });
      }
    }

    // --- B. AUDITORIA DE VEÍCULOS & TRANSFERÊNCIA DE PROPRIETÁRIO ---
    const veiculos = await prisma.vehicle.findMany({ include: { cliente: true } });
    for (const v of veiculos) {
      if (!v.clienteId) {
        auditRecords.push({
          entidade: 'Vehicle',
          registroId: v.id,
          osdigId: v.osdigId || undefined,
          descricao: `Veículo modelo '${v.modelo}' (Placa: ${v.placa})`,
          severidade: 'CONFLITO',
          motivo: 'Veículo órfão sem cliente proprietário relacionado.',
          acaoRecomendada: 'Vincular a placa ao cadastro do cliente correto.'
        });
      }
    }

    // --- C. AUDITORIA DE ORDENS DE SERVIÇO & DUPLICIDADE DE RECEITA ---
    const ordens = await prisma.ordemServico.findMany({
      include: {
        cliente: true,
        veiculo: true,
        contasReceber: true,
        documentosFiscais: true
      }
    });

    for (const os of ordens) {
      // OS Cancelada com títulos em aberto ou liquidados
      if (os.status === 'CANCELLED') {
        const contasAtivas = os.contasReceber.filter(c => c.status !== 'CANCELADO');
        if (contasAtivas.length > 0) {
          auditRecords.push({
            entidade: 'OrdemServico',
            registroId: os.id,
            osdigId: os.osdigId || undefined,
            descricao: `OS #${os.numeroOs} Cancelada`,
            severidade: 'ERRO',
            motivo: `OS cancelada possui ${contasAtivas.length} título(s) financeiro(s) ativo(s).`,
            acaoRecomendada: 'Cancelar os títulos a receber vinculados para evitar receita indevida.'
          });
        }
      }
    }

    // --- D. AUDITORIA DE CONTAS A RECEBER / PAGAR ---
    const contasReceber = await prisma.contaReceber.findMany();
    for (const cr of contasReceber) {
      const liq = Number(cr.valorLiquido || 0);
      const pago = Number(cr.valorPago || 0);
      const aberto = Number(cr.valorEmAberto || 0);

      const emAbertoCalculado = Math.max(0, liq - pago);
      if (Math.abs(aberto - emAbertoCalculado) > 0.01 && cr.status !== 'LIQUIDADO') {
        auditRecords.push({
          entidade: 'ContaReceber',
          registroId: cr.id,
          descricao: `Título #${cr.numeroTitulo} - ${cr.titulo}`,
          severidade: 'CONFLITO',
          motivo: `Divergência financeira: Em Aberto cadastrado (R$${aberto.toFixed(2)}) != Calculado (R$${emAbertoCalculado.toFixed(2)}).`,
          acaoRecomendada: 'Recalcular saldo em aberto do título.'
        });
      }
    }

    // Salvar no Banco os Registros de Auditoria
    if (auditRecords.length > 0) {
      await prisma.migrationAuditRecord.createMany({
        data: auditRecords.map(r => ({
          ...r,
          status: 'PENDENTE'
        }))
      });
    }

    // --- E. SÍNTESE E RESUMO DE AUDITORIA ---
    const resumo = {
      totalAuditados: produtos.length + veiculos.length + ordens.length + contasReceber.length,
      registrosOK: (produtos.length + veiculos.length + ordens.length + contasReceber.length) - auditRecords.length,
      alertas: auditRecords.filter(r => r.severidade === 'ALERTA').length,
      conflitos: auditRecords.filter(r => r.severidade === 'CONFLITO').length,
      erros: auditRecords.filter(r => r.severidade === 'ERRO').length,
      estoqueNegativoCount: totalEstoqueNegativo,
      produtosSemCustoCount: totalSemCusto
    };

    return res.json({
      sucesso: true,
      executadoEm: new Date().toISOString(),
      resumo,
      registrosAuditoria: auditRecords
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 2. GET /api/migration/audit/records
 * Retorna os registros de auditoria salvos com filtros
 */
export async function getMigrationAuditRecords(req: Request, res: Response) {
  try {
    const { entidade, severidade, status } = req.query;

    const where: any = {};
    if (entidade) where.entidade = String(entidade);
    if (severidade) where.severidade = String(severidade);
    if (status) where.status = String(status);

    const records = await prisma.migrationAuditRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return res.json(records);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

/**
 * 3. PATCH /api/migration/audit/records/:id/status
 * Permite marcar um registro de auditoria como REVISADO ou RESOLVIDO
 */
export async function updateAuditRecordStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body; // REVISADO | RESOLVIDO | PENDENTE

    const updated = await prisma.migrationAuditRecord.update({
      where: { id },
      data: { status }
    });

    return res.json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
