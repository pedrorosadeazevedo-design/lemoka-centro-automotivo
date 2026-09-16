import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const downloadsDir = 'C:\\Users\\Arruda\\Downloads';

async function list24OSWithoutPlate() {
  const osPath = path.join(downloadsDir, 'ID_123_LEMOKA_CENTRO_AUTOMOTIVO_LTDA_05-09-2026.csv');
  const rawOs = fs.readFileSync(osPath, 'latin1');
  const osLines = rawOs.split(/\r?\n/).filter(l => l.trim().length > 0).slice(2);

  const list: any[] = [];
  for (const line of osLines) {
    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
    const placa = cols[5] || '';
    if (!placa) {
      const osdigId = cols[1];
      const clienteNome = cols[7];

      // Buscar a OS no banco
      const dbOs = await prisma.ordemServico.findFirst({
        where: { osdigId },
        include: { veiculo: true, cliente: true }
      });

      list.push({
        osdigId,
        clienteNome,
        veiculoPlacaBanco: dbOs?.veiculo?.placa,
        veiculoIdBanco: dbOs?.veiculoId,
        veiculoModeloBanco: dbOs?.veiculo?.modelo
      });
    }
  }

  console.log('=== DETALHAMENTO COMPLETO DAS 24 OSs SEM PLACA ===\n');
  list.forEach((item, i) => {
    console.log(`${i + 1}. OS OSDIG #${item.osdigId} | Cliente: ${item.clienteNome} | Veículo Banco (Placa): ${item.veiculoPlacaBanco} | ID Veículo: ${item.veiculoIdBanco}`);
  });
}

list24OSWithoutPlate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
