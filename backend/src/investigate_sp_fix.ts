import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const downloadsDir = 'C:\\Users\\Arruda\\Downloads';

async function investigateBeforeFix() {
  console.log('=== FASE 1 — INVESTIGAÇÃO COMPLETA ANTES DA ALTERAÇÃO (READ-ONLY) ===\n');

  // A) Localizar os 23 veículos SP-*
  const veiculosSp = await prisma.vehicle.findMany({
    where: { placa: { startsWith: 'SP-' } },
    include: {
      cliente: { select: { id: true, nome: true } },
      ordensServico: { select: { id: true, numeroOs: true, osdigId: true, valorTotal: true, status: true, createdAt: true } }
    }
  });

  console.log(`A) Total de Veículos Técnicos 'SP-*' Localizados no Banco: ${veiculosSp.length}\n`);

  veiculosSp.forEach((v, i) => {
    console.log(`[${i + 1}] ID: ${v.id} | Placa: ${v.placa} | Cliente: ${v.cliente?.nome} (${v.clienteId})`);
    console.log(`    OSs Vinculadas (${v.ordensServico.length}):`, v.ordensServico.map(o => `OS #${o.numeroOs} (OSDIG ${o.osdigId}, R$ ${o.valorTotal}, ${o.status})`).join('; '));
  });

  // B & C) Localizar as 24 OSs sem placa na exportação OSDIG
  const osPath = path.join(downloadsDir, 'ID_123_LEMOKA_CENTRO_AUTOMOTIVO_LTDA_05-09-2026.csv');
  const rawOs = fs.readFileSync(osPath, 'latin1');
  const osLines = rawOs.split(/\r?\n/).filter(l => l.trim().length > 0).slice(2);

  const osSemPlacaFonte: any[] = [];
  osLines.forEach(line => {
    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
    const placa = cols[5] || '';
    if (!placa) {
      osSemPlacaFonte.push({
        osdigId: cols[1],
        clienteNome: cols[7],
        data: cols[6],
        valor: cols[23]
      });
    }
  });

  console.log(`\nB & C) Total de OSs Sem Placa Identificadas na Exportação OSDIG: ${osSemPlacaFonte.length}`);

  // D) Explicar por que existem 24 OSs sem placa e 23 veículos SP-*
  console.log('\nD) Investigação da relação entre 24 OSs sem placa e 23 veículos SP-*:');
  let totalOsVinculadasSp = 0;
  veiculosSp.forEach(v => {
    totalOsVinculadasSp += v.ordensServico.length;
    if (v.ordensServico.length > 1) {
      console.log(`👉 Veículo ${v.placa} do Cliente '${v.cliente?.nome}' possui ${v.ordensServico.length} OSs vinculadas!`);
    }
  });
  console.log(`   - Total de Ordens de Serviço Vinculadas aos Veículos SP-*: ${totalOsVinculadasSp}`);
}

investigateBeforeFix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
