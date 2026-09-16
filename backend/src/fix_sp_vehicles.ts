import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSpVehiclesAndOS() {
  console.log('=== EXECUÇÃO DA REMOÇÃO DOS 23 VEÍCULOS SP-* E DESVINCULAÇÃO DAS 24 OSs ===\n');

  // 1. Encontrar todos os veículos SP-*
  const veiculosSp = await prisma.vehicle.findMany({
    where: { placa: { startsWith: 'SP-' } },
    select: { id: true, placa: true }
  });

  console.log(`Encontrados ${veiculosSp.length} veículos 'SP-*' para remoção.`);
  const spIds = veiculosSp.map(v => v.id);

  // 2. Atualizar as Ordens de Serviço ligadas a esses veículos definindo veiculoId = null
  const updateResult = await prisma.ordemServico.updateMany({
    where: { veiculoId: { in: spIds } },
    data: { veiculoId: null }
  });

  console.log(`✅ Ordens de Serviço Atualizadas com veiculoId = null: ${updateResult.count}`);

  // 3. Deletar os 23 veículos genéricos SP-*
  const deleteResult = await prisma.vehicle.deleteMany({
    where: { id: { in: spIds } }
  });

  console.log(`✅ Veículos Genéricos 'SP-*' Removidos do Banco: ${deleteResult.count}`);

  // 4. Conferência Pós-Remoção
  const totalVeiculosRestantes = await prisma.vehicle.count();
  const totalVeiculosSpRestantes = await prisma.vehicle.count({
    where: { placa: { startsWith: 'SP-' } }
  });
  const totalOsRestantes = await prisma.ordemServico.count();
  const totalOsSemVeiculo = await prisma.ordemServico.count({
    where: { veiculoId: null }
  });

  console.log('\n--- CONFERÊNCIA PÓS-CORREÇÃO ---');
  console.log(`Total de Veículos Restantes no Banco: ${totalVeiculosRestantes} (Esperado Exato: 1.535)`);
  console.log(`Total de Veículos 'SP-*' Restantes: ${totalVeiculosSpRestantes} (Esperado Exato: 0)`);
  console.log(`Total de Ordens de Serviço no Banco: ${totalOsRestantes} (Esperado Exato: 1.827)`);
  console.log(`Total de OSs Historicamente Sem Veículo (veiculoId = null): ${totalOsSemVeiculo} (Esperado Exato: 24)`);
}

fixSpVehiclesAndOS()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
