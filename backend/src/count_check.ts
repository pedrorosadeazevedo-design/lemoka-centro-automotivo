import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const batches = await prisma.migrationBatch.count();
  const logs = await prisma.migrationLog.count();
  const auditRecords = await prisma.migrationAuditRecord.count();
  const clientes = await prisma.cliente.count();
  const veiculos = await prisma.vehicle.count();
  const produtos = await prisma.produto.count();
  const servicos = await prisma.servico.count();
  const os = await prisma.ordemServico.count();
  const contasReceber = await prisma.contaReceber.count();
  const contasPagar = await prisma.contaPagar.count();

  console.log('--- AUDITORIA DE BANCO DE DADOS DE MIGRAÇÃO OSDIG ---');
  console.log('MigrationBatches:', batches);
  console.log('MigrationLogs:', logs);
  console.log('MigrationAuditRecords:', auditRecords);
  console.log('Clientes:', clientes);
  console.log('Veículos:', veiculos);
  console.log('Produtos:', produtos);
  console.log('Serviços:', servicos);
  console.log('Ordens de Serviço:', os);
  console.log('Contas a Receber:', contasReceber);
  console.log('Contas a Pagar:', contasPagar);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
