import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runAuditValidation() {
  console.log('=== EXECUÇÃO DA FASE 3.11 & 3.12 — AUDITORIA DE RECONCILIAÇÃO E INTEGRIDAD E PÓS-CARGA ===\n');

  const clientesCount = await prisma.cliente.count();
  const veiculosCount = await prisma.vehicle.count();
  const produtosCount = await prisma.produto.count();
  const servicosCount = await prisma.servico.count();
  const fornecedoresCount = await prisma.fornecedor.count();
  const osCount = await prisma.ordemServico.count();
  const crCount = await prisma.contaReceber.count();
  const cpCount = await prisma.contaPagar.count();

  // Reconciliação financeira no PostgreSQL
  const crAgg = await prisma.contaReceber.aggregate({
    _sum: { valorLiquido: true, valorPago: true, valorEmAberto: true }
  });

  const cpAgg = await prisma.contaPagar.aggregate({
    _sum: { valorLiquido: true, valorPago: true }
  });

  const osAgg = await prisma.ordemServico.aggregate({
    _sum: { valorTotal: true }
  });

  // Produtos com estoque negativo
  const prodsNegativosCount = await prisma.produto.count({
    where: { estoqueFisico: { lt: 0 } }
  });

  console.log('1. CONTAGENS REAIS DE BANCO DE DADOS POSTGRESQL:');
  console.log(`   - Clientes: ${clientesCount}`);
  console.log(`   - Veículos: ${veiculosCount}`);
  console.log(`   - Produtos: ${produtosCount} (Estoque físico negativo preservado: ${prodsNegativosCount})`);
  console.log(`   - Serviços: ${servicosCount}`);
  console.log(`   - Fornecedores: ${fornecedoresCount}`);
  console.log(`   - Ordens de Serviço: ${osCount}`);
  console.log(`   - Contas a Receber: ${crCount}`);
  console.log(`   - Contas a Pagar: ${cpCount}`);

  console.log('\n2. RECONCILIAÇÃO FINANCEIRA AGREGADA NO POSTGRESQL:');
  console.log(`   - Contas a Receber (Valor Líquido Total): R$ ${Number(crAgg._sum.valorLiquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   - Contas a Receber (Saldo em Aberto): R$ ${Number(crAgg._sum.valorEmAberto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   - Contas a Pagar (Valor Líquido Total): R$ ${Number(cpAgg._sum.valorLiquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   - Contas a Pagar (Valor Quitado): R$ ${Number(cpAgg._sum.valorPago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   - Ordens de Serviço (Valor Total Acumulado): R$ ${Number(osAgg._sum.valorTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
}

runAuditValidation()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
