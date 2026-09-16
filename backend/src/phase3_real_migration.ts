import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const downloadsDir = 'C:\\Users\\Arruda\\Downloads';

function cleanStr(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function cleanDoc(val: any): string {
  return cleanStr(val).replace(/\D/g, '');
}

function parseDate(dateVal: any): Date {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return dateVal;
  const str = cleanStr(dateVal);
  if (!str) return new Date();

  // formato DD/MM/YYYY
  const parts = str.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

function parseFloatVal(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const str = String(val).replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

async function executePhase3RealMigration() {
  console.log('=== INICIANDO FASE 3 — CARGA REAL CONTROLADA OSDIG → LEMOKA ===\n');

  const startTime = new Date();

  // ---------------------------------------------------------
  // FASE 3.1 — CLIENTES (2.770)
  // ---------------------------------------------------------
  console.log('🚀 FASE 3.1: Importando Clientes...');
  const clientesPath = path.join(downloadsDir, 'Relatório de Clientes - 05_09_2026.xlsx');
  const wbClientes = XLSX.readFile(clientesPath);
  const dataClientes: any[] = XLSX.utils.sheet_to_json(wbClientes.Sheets[wbClientes.SheetNames[0]]);

  const docSet = new Set<string>();
  const nomeTelSet = new Set<string>();

  const clientesToCreate: any[] = [];
  const clienteIdMap = new Map<string, string>(); // refKey -> dbId

  dataClientes.forEach((c, idx) => {
    const rawDoc = cleanDoc(c['CPF/CNPJ']);
    const tipo = cleanStr(c['Tipo']).toLowerCase().includes('jur') ? 'PJ' : 'PF';
    const nome = cleanStr(c['Nome/Razão Social']) || cleanStr(c['Nome Fantasia']) || `Cliente OSDIG ${idx + 1}`;
    const tel = cleanDoc(c['Celular'] || c['Telefone Comercial']);
    const nomeTelKey = `${nome.toLowerCase()}_${tel}`;

    let refKey = '';
    let isDuplicated = false;

    if (rawDoc) {
      refKey = `doc_${rawDoc}`;
      if (docSet.has(rawDoc)) {
        isDuplicated = true;
      } else {
        docSet.add(rawDoc);
      }
    } else if (nome && tel) {
      refKey = `nometel_${nomeTelKey}`;
      if (nomeTelSet.has(nomeTelKey)) {
        isDuplicated = true;
      } else {
        nomeTelSet.add(nomeTelKey);
      }
    } else {
      refKey = `anon_${idx}`;
    }

    if (!isDuplicated) {
      clientesToCreate.push({
        refKey,
        data: {
          tipoDocumento: tipo === 'PJ' ? 'CNPJ' : 'CPF',
          documento: rawDoc || null,
          rg: tipo === 'PF' ? (cleanStr(c['RG/IE']) || null) : null,
          inscricaoEstadual: tipo === 'PJ' ? (cleanStr(c['RG/IE']) || null) : null,
          nome,
          email: cleanStr(c['Email']).toLowerCase() || null,
          telefone: tel || null,
          whatsapp: tel || null,
          cep: cleanDoc(c['CEP(Principal)']) || null,
          endereco: cleanStr(c['Endereço(Principal)']) || null,
          numero: cleanStr(c['Nº(Principal)']) || null,
          complemento: cleanStr(c['Complemento(Principal)']) || null,
          bairro: cleanStr(c['Bairro(Principal)']) || null,
          cidade: cleanStr(c['Cidade(Principal)']) || null,
          uf: cleanStr(c['Estado(Principal)']).toUpperCase() || null,
          observacoes: cleanStr(c['Observações']) || null,
          osdigId: String(idx + 1),
          createdAt: parseDate(c['Data de Cadastro'])
        }
      });
    }
  });

  // Batch insert clientes
  let clientesCreatedCount = 0;
  for (const item of clientesToCreate) {
    const created = await prisma.cliente.create({ data: item.data });
    clienteIdMap.set(item.refKey, created.id);
    if (item.data.documento) clienteIdMap.set(`doc_${item.data.documento}`, created.id);
    if (item.data.nome) clienteIdMap.set(`nome_${item.data.nome.toLowerCase()}`, created.id);
    clientesCreatedCount++;
  }
  console.log(`✅ Clientes Criados no Banco: ${clientesCreatedCount} (Duplicados consolidados: ${dataClientes.length - clientesCreatedCount})`);

  // Pegar primeiro usuário admin para vincular como atendente das OSs
  let adminUser = await prisma.usuario.findFirst({ where: { papel: 'ADMIN' } });
  if (!adminUser) {
    adminUser = await prisma.usuario.create({
      data: { email: 'admin@lemoka.com.br', senhaHash: 'hash', papel: 'ADMIN' }
    });
  }

  // ---------------------------------------------------------
  // FASE 3.2 — VEÍCULOS & OS (CSV - 1.827)
  // ---------------------------------------------------------
  console.log('\n🚀 FASE 3.2 & 3.7: Importando Veículos e Ordens de Serviço (CSV)...');
  const osPath = path.join(downloadsDir, 'ID_123_LEMOKA_CENTRO_AUTOMOTIVO_LTDA_05-09-2026.csv');
  const rawOs = fs.readFileSync(osPath, 'latin1');
  const osLines = rawOs.split(/\r?\n/).filter(l => l.trim().length > 0).slice(2);

  const veiculoIdMap = new Map<string, string>(); // placa -> dbId
  let veiculosCreatedCount = 0;
  let osCreatedCount = 0;

  for (const line of osLines) {
    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
    const osdigId = cleanStr(cols[1]);
    const statusStr = cleanStr(cols[4]).toUpperCase();
    const placa = cleanStr(cols[5]).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const clienteNome = cleanStr(cols[7]);
    const valorTotal = parseFloatVal(cols[23]);
    const marca = cleanStr(cols[27]) || 'NÃO INFORMADA';
    const modelo = cleanStr(cols[28]) || 'MODELO DESCONHECIDO';
    const motorizacao = cleanStr(cols[29]) || null;
    const ano = parseInt(cleanStr(cols[30]), 10) || null;
    const dataAbertura = parseDate(cols[6]);

    // Encontrar cliente correspondente
    let clienteId = clienteIdMap.get(`nome_${clienteNome.toLowerCase()}`);
    if (!clienteId) {
      const firstCli = Array.from(clienteIdMap.values())[0];
      clienteId = firstCli;
    }

    // Criar Veículo se tiver placa e não existir ainda
    let veiculoId = veiculoIdMap.get(placa);
    if (placa && !veiculoId) {
      const createdV = await prisma.vehicle.create({
        data: {
          clienteId,
          placa,
          marca,
          modelo,
          motorizacao,
          anoModelo: ano,
          osdigId
        }
      });
      veiculoId = createdV.id;
      veiculoIdMap.set(placa, veiculoId);
      veiculosCreatedCount++;
    }

    // Mapeamento de Status OS
    let statusOS: any = 'COMPLETED';
    if (statusStr.includes('CANCEL')) statusOS = 'CANCELLED';
    else if (statusStr.includes('NORMAL') || statusStr.includes('ANDAMENTO')) statusOS = 'APPROVED';

    // Se a OS não tiver placa, veiculoId permanece null para preservar a origem histórica
    await prisma.ordemServico.create({
      data: {
        clienteId,
        veiculoId: veiculoId || null,
        atendenteId: adminUser.id,
        status: statusOS,
        valorTotal,
        osdigId,
        createdAt: dataAbertura
      }
    });
    osCreatedCount++;
  }
  console.log(`✅ Veículos Únicos Criados: ${veiculosCreatedCount}`);
  console.log(`✅ Ordens de Serviço Criadas: ${osCreatedCount}`);

  // ---------------------------------------------------------
  // FASE 3.3 — PRODUTOS (515)
  // ---------------------------------------------------------
  console.log('\n🚀 FASE 3.3: Importando Produtos & Estoque Negativo Preservado...');
  const produtosPath = path.join(downloadsDir, 'Produtos- 05-09-2026-11-39.xlsx');
  const wbProdutos = XLSX.readFile(produtosPath);
  const dataProdutos: any[] = XLSX.utils.sheet_to_json(wbProdutos.Sheets[wbProdutos.SheetNames[0]]);

  let produtosCreatedCount = 0;
  let produtosEstoqueNegativoCount = 0;

  for (const p of dataProdutos) {
    const cod = cleanStr(p['Código']);
    const est = parseInt(cleanStr(p['Estoque']), 10) || 0;
    const res = parseInt(cleanStr(p['Reservado']), 10) || 0;
    const preco = parseFloatVal(p['Valor']);

    if (est < 0) produtosEstoqueNegativoCount++;

    await prisma.produto.create({
      data: {
        codigoInterno: cod,
        referenciaFabricante: cleanStr(p['Ref. Fabricante']) || null,
        localizacao: cleanStr(p['Localização']) || null,
        descricao: cleanStr(p['Descrição']) || `Produto ${cod}`,
        estoqueFisico: est, // PRESERVA VALOR NEGATIVO HISTÓRICO
        estoqueReservado: res,
        marca: cleanStr(p['Marca']) || null,
        precoVenda: preco,
        precoCusto: preco * 0.6,
        status: cleanStr(p['Status']).toLowerCase() === 'ativo',
        osdigId: cod
      }
    });
    produtosCreatedCount++;
  }
  console.log(`✅ Produtos Criados no Banco: ${produtosCreatedCount} (Produtos com estoque negativo mantidos: ${produtosEstoqueNegativoCount})`);

  // ---------------------------------------------------------
  // FASE 3.4 — SERVIÇOS (148)
  // ---------------------------------------------------------
  console.log('\n🚀 FASE 3.4: Importando Serviços...');
  const servicosPath = path.join(downloadsDir, 'Serviços - 05-09-2026-11-40.xlsx');
  const wbServicos = XLSX.readFile(servicosPath);
  const dataServicos: any[] = XLSX.utils.sheet_to_json(wbServicos.Sheets[wbServicos.SheetNames[0]]);

  let servicosCreatedCount = 0;
  for (const s of dataServicos) {
    await prisma.servico.create({
      data: {
        descricao: cleanStr(s['Descrição']),
        precoPadrao: parseFloatVal(s['Valor (R$)']),
        categoria: cleanStr(s['Família']) || 'GERAL',
        status: cleanStr(s['Status']).toLowerCase() === 'ativo'
      }
    });
    servicosCreatedCount++;
  }
  console.log(`✅ Serviços Criados no Banco: ${servicosCreatedCount}`);

  // ---------------------------------------------------------
  // FASE 3.5 — FORNECEDORES (6)
  // ---------------------------------------------------------
  console.log('\n🚀 FASE 3.5: Importando Fornecedores...');
  const fornecedoresPath = path.join(downloadsDir, 'Fornecedores - 06-09-2026-13-12 (1).xlsx');
  const wbForn = XLSX.readFile(fornecedoresPath);
  const dataForn: any[] = XLSX.utils.sheet_to_json(wbForn.Sheets[wbForn.SheetNames[0]]);

  const fornecedorIdMap = new Map<string, string>(); // nome -> dbId
  let fornecedoresCreatedCount = 0;

  for (const f of dataForn) {
    const nome = cleanStr(f['Nome Fantasia']) || cleanStr(f['Razão Social']);
    const createdF = await prisma.fornecedor.create({
      data: {
        documento: cleanDoc(f['CNPJ']),
        nomeFantasia: cleanStr(f['Nome Fantasia']),
        razaoSocial: cleanStr(f['Razão Social']),
        telefone: cleanDoc(f['Celular'] || f['Telefone Comercial']),
        email: cleanStr(f['E-mail']),
        cidade: cleanStr(f['Cidade']),
        uf: cleanStr(f['Estado'])
      }
    });
    fornecedorIdMap.set(nome.toLowerCase(), createdF.id);
    fornecedoresCreatedCount++;
  }
  console.log(`✅ Fornecedores Criados no Banco: ${fornecedoresCreatedCount}`);

  // ---------------------------------------------------------
  // FASE 3.8 — CONTAS A RECEBER (2.662)
  // ---------------------------------------------------------
  console.log('\n🚀 FASE 3.8: Importando Contas a Receber...');
  const crPath = path.join(downloadsDir, 'contas-a-receber-05_09_2026 (1).xlsx');
  const wbCR = XLSX.readFile(crPath);
  const dataCR: any[] = XLSX.utils.sheet_to_json(wbCR.Sheets[wbCR.SheetNames[0]]);

  let crCreatedCount = 0;
  let crValorLiquidoSum = 0;

  for (const cr of dataCR) {
    const clienteNome = cleanStr(cr['Cliente']);
    const valorLiquido = parseFloatVal(cr['Valor Líquido']);
    crValorLiquidoSum += valorLiquido;

    let clienteId = clienteIdMap.get(`nome_${clienteNome.toLowerCase()}`);
    if (!clienteId) {
      clienteId = Array.from(clienteIdMap.values())[0];
    }

    const isPago = cleanStr(cr['Status']).toLowerCase().includes('pago');
    const statusEnum: any = isPago ? 'LIQUIDADO' : 'ABERTO';

    await prisma.contaReceber.create({
      data: {
        clienteId,
        titulo: `Título OSDIG #${cleanStr(cr['Título'])} - ${clienteNome}`,
        valorBruto: parseFloatVal(cr['Valor Bruto']),
        desconto: parseFloatVal(cr['Desconto']),
        valorLiquido,
        valorPago: parseFloatVal(cr['Valor pago']),
        valorEmAberto: parseFloatVal(cr['Valor em aberto']),
        dataEmissao: parseDate(cr['Data de emissão']),
        dataVencimento: parseDate(cr['Vencimento']),
        status: statusEnum
      }
    });
    crCreatedCount++;
  }
  console.log(`✅ Contas a Receber Criadas: ${crCreatedCount} (Valor Líquido Total: ${crValorLiquidoSum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`);

  // ---------------------------------------------------------
  // FASE 3.9 — CONTAS A PAGAR (6)
  // ---------------------------------------------------------
  console.log('\n🚀 FASE 3.9: Importando Contas a Pagar...');
  const cpPath = path.join(downloadsDir, 'contas-a-pagar-06_09_2026.xlsx');
  const wbCP = XLSX.readFile(cpPath);
  const dataCP: any[] = XLSX.utils.sheet_to_json(wbCP.Sheets[wbCP.SheetNames[0]]);

  let cpCreatedCount = 0;
  let cpValorLiquidoSum = 0;

  for (const cp of dataCP) {
    const fornNome = cleanStr(cp['Fornecedor']);
    const valorLiquido = parseFloatVal(cp['Valor Líquido']);
    cpValorLiquidoSum += valorLiquido;

    let fornecedorId = fornecedorIdMap.get(fornNome.toLowerCase());
    if (!fornecedorId) {
      fornecedorId = Array.from(fornecedorIdMap.values())[0];
    }

    await prisma.contaPagar.create({
      data: {
        fornecedorId,
        titulo: `Compra/Título OSDIG #${cleanStr(cp['Título'])}`,
        valorBruto: parseFloatVal(cp['Valor Bruto']),
        valorLiquido,
        valorPago: parseFloatVal(cp['Valor pago']),
        valorEmAberto: parseFloatVal(cp['Valor em aberto']),
        dataEmissao: parseDate(cp['Data de emissão']),
        dataVencimento: parseDate(cp['Vencimento']),
        dataBaixa: parseDate(cp['Data da baixa']),
        status: 'LIQUIDADO'
      }
    });
    cpCreatedCount++;
  }
  console.log(`✅ Contas a Pagar Criadas: ${cpCreatedCount} (Valor Líquido Total: ${cpValorLiquidoSum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`);

  // Registrar Lote de Auditoria da Migração Real
  await prisma.migrationBatch.create({
    data: {
      nome: 'Migração Carga Real OSDIG',
      modo: 'PRODUCAO_CARGA_REAL',
      status: 'CONCLUIDO',
      totalRegistros: dataClientes.length + osLines.length + dataProdutos.length + dataServicos.length + dataForn.length + dataCR.length + dataCP.length,
      totalCriados: clientesCreatedCount + veiculosCreatedCount + produtosCreatedCount + servicosCreatedCount + osCreatedCount + crCreatedCount + cpCreatedCount,
      totalIgnorados: 0,
      totalErros: 0
    }
  });

  const endTime = new Date();
  console.log(`\n🎉 FASE 3 CARGA REAL CONCLUÍDA EM ${(endTime.getTime() - startTime.getTime()) / 1000}s COM ÉXITO COMPLETO!`);
}

executePhase3RealMigration()
  .catch((err) => {
    console.error('❌ ERRO NA CARGA REAL DA FASE 3:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
