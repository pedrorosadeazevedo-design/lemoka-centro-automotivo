import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const downloadsDir = 'C:\\Users\\Arruda\\Downloads';

async function runReadOnlyPostAudit() {
  console.log('=== EXECUÇÃO DA AUDITORIA PÓS-FASE 3 (READ-ONLY) ===\n');

  // 1. Auditando Veículos
  const veiculos = await prisma.vehicle.findMany({
    include: { cliente: { select: { id: true, nome: true } } }
  });

  const totalVeiculos = veiculos.length;
  const veiculosReais = veiculos.filter(v => !v.placa.startsWith('SP-'));
  const veiculosGenericos = veiculos.filter(v => v.placa.startsWith('SP-'));

  console.log('1. AUDITORIA DE VEÍCULOS NO POSTGRESQL:');
  console.log(`   - Total no Banco: ${totalVeiculos}`);
  console.log(`   - Veículos Reais com Placa Válida OSDIG: ${veiculosReais.length}`);
  console.log(`   - Veículos Genéricos Criados com Prefixo 'SP-': ${veiculosGenericos.length}`);

  console.log('\n--- DETALHAMENTO DOS VEÍCULOS GENÉRICOS (SP-*) ---');
  veiculosGenericos.forEach(v => {
    console.log(`   [ID: ${v.id.slice(0, 8)}] Placa: ${v.placa} | Cliente: ${v.cliente?.nome} (${v.clienteId.slice(0, 8)}) | Marca/Modelo: ${v.marca} / ${v.modelo}`);
  });

  // 2. Investigação das 24 OSs sem placa
  const osPath = path.join(downloadsDir, 'ID_123_LEMOKA_CENTRO_AUTOMOTIVO_LTDA_05-09-2026.csv');
  const rawOs = fs.readFileSync(osPath, 'latin1');
  const osLines = rawOs.split(/\r?\n/).filter(l => l.trim().length > 0).slice(2);

  const osSemPlaca: any[] = [];
  osLines.forEach(line => {
    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
    const placa = (cols[5] || '').trim();
    if (!placa) {
      osSemPlaca.push({
        idOsdig: cols[1],
        clienteNome: cols[7],
        data: cols[6],
        valor: cols[23]
      });
    }
  });

  console.log(`\n2. INVESTIGAÇÃO DAS ${osSemPlaca.length} OSs SEM PLACA NA FONTE:`);
  console.log(`   - Total de OSs Sem Placa Identificadas no CSV: ${osSemPlaca.length}`);

  // Verificar a quantas OSs esses 23 veículos genéricos foram vinculados
  const osVinculadasGenericas = await prisma.ordemServico.count({
    where: { veiculo: { placa: { startsWith: 'SP-' } } }
  });
  console.log(`   - Ordens de Serviço Vinculadas a Veículos 'SP-*': ${osVinculadasGenericas}`);

  // 3. Auditoria de Estoque Negativo
  const prodsNegativos = await prisma.produto.findMany({
    where: { estoqueFisico: { lt: 0 } },
    select: { codigoInterno: true, descricao: true, estoqueFisico: true }
  });

  console.log('\n3. AUDITORIA DE ESTOQUE FISICO NEGATIVO:');
  console.log(`   - Total de Produtos com Estoque Negativo Preservado: ${prodsNegativos.length}`);
  console.log(`   - Amostra (Primeiros 3):`, prodsNegativos.slice(0, 3));

  // 4. Auditoria Financeira
  const crAgg = await prisma.contaReceber.aggregate({
    _sum: { valorLiquido: true, valorEmAberto: true }
  });

  const cpAgg = await prisma.contaPagar.aggregate({
    _sum: { valorLiquido: true, valorPago: true }
  });

  console.log('\n4. RECONCILIAÇÃO FINANCEIRA READ-ONLY:');
  console.log(`   - Contas a Receber (Valor Líquido): R$ ${Number(crAgg._sum.valorLiquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   - Contas a Receber (Saldo em Aberto): R$ ${Number(crAgg._sum.valorEmAberto || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   - Contas a Pagar (Valor Líquido): R$ ${Number(cpAgg._sum.valorLiquido || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`   - Contas a Pagar (Valor Quitado): R$ ${Number(cpAgg._sum.valorPago || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

  // 5. Audit Trail & Migration Batch
  const batch = await prisma.migrationBatch.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  console.log('\n5. REGISTRO DE AUDITORIA (MIGRATION BATCH):');
  console.log(`   - Batch Nome: ${batch?.nome}`);
  console.log(`   - Modo: ${batch?.modo}`);
  console.log(`   - Status: ${batch?.status}`);
  console.log(`   - Total Registros Criados: ${batch?.totalCriados}`);
}

runReadOnlyPostAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
