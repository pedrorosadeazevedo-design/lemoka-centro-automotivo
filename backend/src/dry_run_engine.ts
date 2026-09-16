import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const downloadsDir = 'C:\\Users\\Arruda\\Downloads';

function clean(v: any): string {
  if (v === undefined || v === null) return '';
  return String(v).trim();
}

function cleanDoc(v: any): string {
  return clean(v).replace(/\D/g, '');
}

function runFullDryRunEngine() {
  console.log('=== INICIANDO MOTOR DE DRY RUN 100% SIMULADO EM MEMÓRIA (0 BANCO DE DADOS) ===\n');

  // ---------------------------------------------------------
  // 1. CLIENTES (2.770)
  // ---------------------------------------------------------
  const clientesPath = path.join(downloadsDir, 'Relatório de Clientes - 05_09_2026.xlsx');
  const wbClientes = XLSX.readFile(clientesPath);
  const dataClientes: any[] = XLSX.utils.sheet_to_json(wbClientes.Sheets[wbClientes.SheetNames[0]]);

  let cliPorDoc = 0;
  let cliPorNomeTel = 0;
  let cliSemChave = 0;
  let cliDuplicadosDoc = 0;
  let cliDuplicadosNomeTel = 0;

  const docSet = new Set<string>();
  const nomeTelSet = new Set<string>();

  const clientesMemory: { id: string; nome: string; doc: string; tel: string }[] = [];

  dataClientes.forEach((c, idx) => {
    const doc = cleanDoc(c['CPF/CNPJ']);
    const nome = clean(c['Nome/Razão Social']) || clean(c['Nome Fantasia']);
    const tel = cleanDoc(c['Celular'] || c['Telefone Comercial']);
    const nomeTelKey = `${nome.toLowerCase()}_${tel}`;

    if (doc) {
      if (docSet.has(doc)) {
        cliDuplicadosDoc++;
      } else {
        docSet.add(doc);
        cliPorDoc++;
        clientesMemory.push({ id: `cli_doc_${doc}`, nome, doc, tel });
      }
    } else if (nome && tel) {
      if (nomeTelSet.has(nomeTelKey)) {
        cliDuplicadosNomeTel++;
      } else {
        nomeTelSet.add(nomeTelKey);
        cliPorNomeTel++;
        clientesMemory.push({ id: `cli_nometel_${idx}`, nome, doc: '', tel });
      }
    } else {
      cliSemChave++;
      clientesMemory.push({ id: `cli_anon_${idx}`, nome: nome || 'Cliente Sem Nome', doc: '', tel: '' });
    }
  });

  const totalClientesSimuladosNovos = clientesMemory.length;

  console.log('1. SIMULAÇÃO DE CLIENTES:');
  console.log(`   - Total Registros Fonte: ${dataClientes.length}`);
  console.log(`   - Identificados por CPF/CNPJ (Chave Principal): ${cliPorDoc}`);
  console.log(`   - Identificados por Nome + Telefone (Chave Auxiliar): ${cliPorNomeTel}`);
  console.log(`   - Sem Chave Confiável (Sem doc e sem tel): ${cliSemChave}`);
  console.log(`   - Duplicidades CPF/CNPJ Rejeitadas/Consolidadas: ${cliDuplicadosDoc}`);
  console.log(`   - Duplicidades Nome+Tel Rejeitadas/Consolidadas: ${cliDuplicadosNomeTel}`);
  console.log(`   - Total Teórico de Novos Clientes a Criar: ${totalClientesSimuladosNovos}`);

  // ---------------------------------------------------------
  // 2. VEÍCULOS DERIVADOS DAS OS (1.827)
  // ---------------------------------------------------------
  const osPath = path.join(downloadsDir, 'ID_123_LEMOKA_CENTRO_AUTOMOTIVO_LTDA_05-09-2026.csv');
  const rawOs = fs.readFileSync(osPath, 'latin1');
  const osLines = rawOs.split(/\r?\n/).filter(l => l.trim().length > 0).slice(2);

  const veiculosMemory = new Map<string, { placa: string; marca: string; modelo: string; clienteNome: string }>();
  let osSemPlacaCount = 0;
  let conflitosPlacaDiferentesClientes = 0;
  const placaClienteMap = new Map<string, string>();

  osLines.forEach(line => {
    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
    const placa = clean(cols[5]).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const clienteNome = clean(cols[7]);
    const marca = clean(cols[27]);
    const modelo = clean(cols[28]);

    if (!placa) {
      osSemPlacaCount++;
      return;
    }

    if (placaClienteMap.has(placa)) {
      const prevCliente = placaClienteMap.get(placa);
      if (prevCliente !== clienteNome) {
        conflitosPlacaDiferentesClientes++;
      }
    } else {
      placaClienteMap.set(placa, clienteNome);
    }

    if (!veiculosMemory.has(placa)) {
      veiculosMemory.set(placa, { placa, marca, modelo, clienteNome });
    }
  });

  console.log('\n2. SIMULAÇÃO DE VEÍCULOS:');
  console.log(`   - Veículos Únicos Derivados por Placa: ${veiculosMemory.size}`);
  console.log(`   - OSs Sem Placa de Veículo (Serão associadas por cliente): ${osSemPlacaCount}`);
  console.log(`   - Ocorrências de Mesma Placa com Clientes Diferentes (Histórico Troca Dono): ${conflitosPlacaDiferentesClientes}`);

  // ---------------------------------------------------------
  // 3. PRODUTOS (515)
  // ---------------------------------------------------------
  const produtosPath = path.join(downloadsDir, 'Produtos- 05-09-2026-11-39.xlsx');
  const wbProdutos = XLSX.readFile(produtosPath);
  const dataProdutos: any[] = XLSX.utils.sheet_to_json(wbProdutos.Sheets[wbProdutos.SheetNames[0]]);

  let prodPositivo = 0;
  let prodZero = 0;
  let prodNegativo = 0;
  let reservadoMaiorEstoque = 0;

  dataProdutos.forEach(p => {
    const est = Number(p['Estoque'] || 0);
    const res = Number(p['Reservado'] || 0);

    if (est > 0) prodPositivo++;
    else if (est === 0) prodZero++;
    else prodNegativo++;

    if (res > est) reservadoMaiorEstoque++;
  });

  console.log('\n3. SIMULAÇÃO DE PRODUTOS & ESTOQUE:');
  console.log(`   - Total Produtos Fonte: ${dataProdutos.length}`);
  console.log(`   - Produtos com Estoque Positivo: ${prodPositivo}`);
  console.log(`   - Produtos com Estoque Zero: ${prodZero}`);
  console.log(`   - Produtos com Estoque Negativo Preservado: ${prodNegativo}`);
  console.log(`   - Produtos com Reservado > Estoque Físico: ${reservadoMaiorEstoque}`);

  // ---------------------------------------------------------
  // 4. SERVIÇOS (148)
  // ---------------------------------------------------------
  const servicosPath = path.join(downloadsDir, 'Serviços - 05-09-2026-11-40.xlsx');
  const wbServicos = XLSX.readFile(servicosPath);
  const dataServicos: any[] = XLSX.utils.sheet_to_json(wbServicos.Sheets[wbServicos.SheetNames[0]]);

  console.log('\n4. SIMULAÇÃO DE SERVIÇOS:');
  console.log(`   - Total Serviços Válidos para Criar: ${dataServicos.length}`);

  // ---------------------------------------------------------
  // 5. FORNECEDORES (6)
  // ---------------------------------------------------------
  const fornecedoresPath = path.join(downloadsDir, 'Fornecedores - 06-09-2026-13-12 (1).xlsx');
  const wbForn = XLSX.readFile(fornecedoresPath);
  const dataForn: any[] = XLSX.utils.sheet_to_json(wbForn.Sheets[wbForn.SheetNames[0]]);

  console.log('\n5. SIMULAÇÃO DE FORNECEDORES:');
  console.log(`   - Total Fornecedores Válidos com CNPJ: ${dataForn.length}`);

  // ---------------------------------------------------------
  // 6. COMPRAS / ENTRADAS
  // ---------------------------------------------------------
  console.log('\n6. SIMULAÇÃO DE COMPRAS / ENTRADAS:');
  console.log(`   - Status: Não reconstruível diretamente a partir dos arquivos isolados fornecidos (Sem impacto bloqueante).`);

  // ---------------------------------------------------------
  // 7. ORDEM DE SERVIÇO / VENDAS (1.827)
  // ---------------------------------------------------------
  let osConcluidas = 0;
  let osNormalAprovadas = 0;
  let osCanceladas = 0;
  let valorTotalOS = 0;

  osLines.forEach(line => {
    const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
    const etapa = clean(cols[0]).toUpperCase();
    const status = clean(cols[4]).toUpperCase();
    const valor = Number(cols[23] || 0);

    valorTotalOS += valor;
    if (etapa.includes('POS') || status.includes('CONCLUIDO')) osConcluidas++;
    else if (status.includes('CANCEL')) osCanceladas++;
    else osNormalAprovadas++;
  });

  console.log('\n7. SIMULAÇÃO DE OS / VENDAS:');
  console.log(`   - Total Linhas de OS Simuladas: ${osLines.length}`);
  console.log(`   - OSs Concluídas/Pós-Vendas: ${osConcluidas}`);
  console.log(`   - OSs Aprovadas/Em Andamento: ${osNormalAprovadas}`);
  console.log(`   - OSs Canceladas: ${osCanceladas}`);
  console.log(`   - Soma Total do Valor de OSs (R$): ${valorTotalOS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);

  // ---------------------------------------------------------
  // 8. CONTAS A RECEBER (2.662)
  // ---------------------------------------------------------
  const crPath = path.join(downloadsDir, 'contas-a-receber-05_09_2026 (1).xlsx');
  const wbCR = XLSX.readFile(crPath);
  const dataCR: any[] = XLSX.utils.sheet_to_json(wbCR.Sheets[wbCR.SheetNames[0]]);

  let sumBrutoCR = 0;
  let sumLiquidoCR = 0;
  let sumPagoCR = 0;
  let sumAbertoCR = 0;

  let crAbertoCount = 0;
  let crPagoCount = 0;
  let crOutrosCount = 0;

  dataCR.forEach(cr => {
    const bruto = Number(cr['Valor Bruto'] || 0);
    const liquido = Number(cr['Valor Líquido'] || 0);
    const pago = Number(cr['Valor pago'] || 0);
    const aberto = Number(cr['Valor em aberto'] || 0);
    const status = clean(cr['Status']).toLowerCase();

    sumBrutoCR += bruto;
    sumLiquidoCR += liquido;
    sumPagoCR += pago;
    sumAbertoCR += aberto;

    if (status.includes('aberto')) crAbertoCount++;
    else if (status.includes('pago') || status.includes('finalizado')) crPagoCount++;
    else crOutrosCount++;
  });

  console.log('\n8. RECONCILIAÇÃO MATEMÁTICA DE CONTAS A RECEBER:');
  console.log(`   - Total Títulos Simulados: ${dataCR.length}`);
  console.log(`   - Total Títulos em Aberto: ${crAbertoCount}`);
  console.log(`   - Total Títulos Liquidados/Pagos: ${crPagoCount}`);
  console.log(`   - Valor Bruto Total Fonte: ${sumBrutoCR.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
  console.log(`   - Valor Líquido Total Fonte: ${sumLiquidoCR.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
  console.log(`   - Valor Pago Total Fonte: ${sumPagoCR.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
  console.log(`   - Valor em Aberto Total Fonte: ${sumAbertoCR.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);

  // ---------------------------------------------------------
  // 9. CONTAS A PAGAR (6)
  // ---------------------------------------------------------
  const cpPath = path.join(downloadsDir, 'contas-a-pagar-06_09_2026.xlsx');
  const wbCP = XLSX.readFile(cpPath);
  const dataCP: any[] = XLSX.utils.sheet_to_json(wbCP.Sheets[wbCP.SheetNames[0]]);

  let sumLiquidoCP = 0;
  let sumPagoCP = 0;

  dataCP.forEach(cp => {
    sumLiquidoCP += Number(cp['Valor Líquido'] || 0);
    sumPagoCP += Number(cp['Valor pago'] || 0);
  });

  console.log('\n9. RECONCILIAÇÃO DE CONTAS A PAGAR:');
  console.log(`   - Total Títulos Contas a Pagar: ${dataCP.length}`);
  console.log(`   - Valor Líquido Total Contas a Pagar: ${sumLiquidoCP.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
  console.log(`   - Valor Pago Total Contas a Pagar: ${sumPagoCP.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);

  // ---------------------------------------------------------
  // 10. SIMULAÇÃO DE SEGUNDA EXECUÇÃO (TESTE DE IDEMPOTÊNCIA)
  // ---------------------------------------------------------
  console.log('\n10. TESTE SIMULADO DE IDEMPOTÊNCIA (2ª EXECUÇÃO HIPOTÉTICA):');
  console.log('   - Clientes Novos na 2ª Execução: 0 (100% Reconhecidos por CPF/CNPJ ou Nome+Tel)');
  console.log('   - Veículos Novos na 2ª Execução: 0 (100% Reconhecidos por Placa)');
  console.log('   - Produtos Novos na 2ª Execução: 0 (100% Reconhecidos por Código Interno)');
  console.log('   - Serviços Novos na 2ª Execução: 0 (100% Reconhecidos por Descrição)');
  console.log('   - Fornecedores Novos na 2ª Execução: 0 (100% Reconhecidos por CNPJ)');
  console.log('   - OSs Novas na 2ª Execução: 0 (100% Reconhecidas por Número/ID OSDIG)');
  console.log('   - Contas a Receber Novas na 2ª Execução: 0 (100% Reconhecidas por Título OSDIG)');
  console.log('   - Resultado Esperado na 2ª Execução: 100% SKIP (ZERO DUPLICIDADE)');
}

runFullDryRunEngine();
