import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function traceOSWithNoPlate() {
  const osList = await prisma.ordemServico.findMany({
    take: 50,
    include: { veiculo: true, cliente: true }
  });

  const withSp = osList.filter(o => o.veiculo?.placa?.startsWith('SP-'));
  console.log(`Encontradas ${withSp.length} OSs com veiculo SP-* nas primeiras 50.`);
  withSp.forEach(o => {
    console.log(`OS ID: ${o.id.slice(0, 8)} | NumeroOS: ${o.numeroOs} | osdigId: ${o.osdigId} | Cliente: ${o.cliente?.nome} | Veiculo Placa: ${o.veiculo?.placa}`);
  });
}

traceOSWithNoPlate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
