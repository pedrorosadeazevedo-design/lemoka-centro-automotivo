import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const downloadsDir = 'C:\\Users\\Arruda\\Downloads';

function cleanStr(val: any): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function runDeepDataValidation() {
  console.log('=== EXECUÇÃO DA FASE 1.3 — VALIDAÇÕES CRÍTICAS DE DADOS ===\n');

  // 1. CLIENTES
  const clientesPath = path.join(downloadsDir, 'Relatório de Clientes - 05_09_2026.xlsx');
  const wbClientes = XLSX.readFile(clientesPath);
  const dataClientes: any[] = XLSX.utils.sheet_to_json(wbClientes.Sheets[wbClientes.SheetNames[0]]);
  
  const totalClientes = dataClientes.length;
  const docsCount = new Map<string, number>();
  let clientesSemDoc = 0;
  let clientesDuplicadosDoc = 0;

  dataClientes.forEach(c => {
    const doc = cleanStr(c['CPF/CNPJ']).replace(/\D/g, '');
    if (!doc) {
      clientesSemDoc++;
    } else {
      docsCount.set(doc, (docsCount.get(doc) || 0) + 1);
    }
  });

  docsCount.forEach((count) => {
    if (count > 1) clientesDuplicadosDoc++;
  });

  console.log('--- 1. AUDITORIA DE CLIENTES ---');
  console.log(`Total de Clientes no Arquivo: ${totalClientes}`);
  console.log(`Clientes com CPF/CNPJ Preenchido: ${totalClientes - clientesSemDoc}`);
  console.log(`Clientes Sem CPF/CNPJ: ${clientesSemDoc}`);
  console.log(`CPFs/CNPJs Duplicados (Várias Ocorrências do Mesmo Doc): ${clientesDuplicadosDoc}`);

  // 2. PRODUTOS & ESTOQUE
  const produtosPath = path.join(downloadsDir, 'Produtos- 05-09-2026-11-39.xlsx');
  const wbProdutos = XLSX.readFile(produtosPath);
  const dataProdutos: any[] = XLSX.utils.sheet_to_json(wbProdutos.Sheets[wbProdutos.SheetNames[0]]);

  let estoqueNegativoCount = 0;
  let reservadoMaiorEstoqueCount = 0;
  const codigosProd = new Map<string, number>();
  let prodsDuplicadosCod = 0;

  dataProdutos.forEach(p => {
    const cod = cleanStr(p['Código']);
    const est = Number(p['Estoque'] || 0);
    const res = Number(p['Reservado'] || 0);

    if (est < 0) estoqueNegativoCount++;
    if (res > est) reservadoMaiorEstoqueCount++;

    if (cod) {
      codigosProd.set(cod, (codigosProd.get(cod) || 0) + 1);
    }
  });

  codigosProd.forEach((count) => {
    if (count > 1) prodsDuplicadosCod++;
  });

  console.log('\n--- 2. AUDITORIA DE PRODUTOS & ESTOQUE ---');
  console.log(`Total de Produtos: ${dataProdutos.length}`);
  console.log(`Produtos com Estoque Físico Negativo: ${estoqueNegativoCount}`);
  console.log(`Produtos com Reservado > Estoque: ${reservadoMaiorEstoqueCount}`);
  console.log(`Produtos Duplicados por Código: ${prodsDuplicadosCod}`);

  // 3. SERVIÇOS
  const servicosPath = path.join(downloadsDir, 'Serviços - 05-09-2026-11-40.xlsx');
  const wbServicos = XLSX.readFile(servicosPath);
  const dataServicos: any[] = XLSX.utils.sheet_to_json(wbServicos.Sheets[wbServicos.SheetNames[0]]);

  console.log('\n--- 3. AUDITORIA DE SERVIÇOS ---');
  console.log(`Total de Serviços: ${dataServicos.length}`);

  // 4. FORNECEDORES
  const fornecedoresPath = path.join(downloadsDir, 'Fornecedores - 06-09-2026-13-12 (1).xlsx');
  const wbForn = XLSX.readFile(fornecedoresPath);
  const dataForn: any[] = XLSX.utils.sheet_to_json(wbForn.Sheets[wbForn.SheetNames[0]]);

  console.log('\n--- 4. AUDITORIA DE FORNECEDORES ---');
  console.log(`Total de Fornecedores: ${dataForn.length}`);

  // 5. CONTAS A RECEBER
  const crPath = path.join(downloadsDir, 'contas-a-receber-05_09_2026 (1).xlsx');
  const wbCR = XLSX.readFile(crPath);
  const dataCR: any[] = XLSX.utils.sheet_to_json(wbCR.Sheets[wbCR.SheetNames[0]]);

  let crSemCliente = 0;
  let valorTotalLiquidoCR = 0;

  dataCR.forEach(cr => {
    if (!cleanStr(cr['Cliente'])) crSemCliente++;
    valorTotalLiquidoCR += Number(cr['Valor Líquido'] || 0);
  });

  console.log('\n--- 5. AUDITORIA DE CONTAS A RECEBER ---');
  console.log(`Total de Títulos Contas a Receber: ${dataCR.length}`);
  console.log(`Títulos Sem Nome do Cliente: ${crSemCliente}`);
  console.log(`Soma Total do Valor Líquido (R$): ${valorTotalLiquidoCR.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);

  // 6. CONTAS A PAGAR
  const cpPath = path.join(downloadsDir, 'contas-a-pagar-06_09_2026.xlsx');
  const wbCP = XLSX.readFile(cpPath);
  const dataCP: any[] = XLSX.utils.sheet_to_json(wbCP.Sheets[wbCP.SheetNames[0]]);

  console.log('\n--- 6. AUDITORIA DE CONTAS A PAGAR ---');
  console.log(`Total de Títulos Contas a Pagar: ${dataCP.length}`);

  // 7. OS / VENDAS (CSV)
  const osPath = path.join(downloadsDir, 'ID_123_LEMOKA_CENTRO_AUTOMOTIVO_LTDA_05-09-2026.csv');
  const rawOs = fs.readFileSync(osPath, 'latin1');
  const osLines = rawOs.split(/\r?\n/).filter(l => l.trim().length > 0);
  
  // descarta sep= e cabeçalho
  const osRows = osLines.slice(2);
  let osComPlaca = 0;
  let osSemPlaca = 0;
  let osComCliente = 0;
  let osSemCliente = 0;

  osRows.forEach(r => {
    const cols = r.split(',');
    const placa = cleanStr(cols[5]);
    const cliente = cleanStr(cols[7]);

    if (placa) osComPlaca++; else osSemPlaca++;
    if (cliente) osComCliente++; else osSemCliente++;
  });

  console.log('\n--- 7. AUDITORIA DE OS / VENDAS (CSV) ---');
  console.log(`Total de Registros de OS/Vendas: ${osRows.length}`);
  console.log(`OSs com Placa de Veículo Identificada: ${osComPlaca}`);
  console.log(`OSs Sem Placa de Veículo: ${osSemPlaca}`);
  console.log(`OSs com Nome do Cliente Identificado: ${osComCliente}`);
  console.log(`OSs Sem Nome do Cliente: ${osSemCliente}`);
}

runDeepDataValidation();
