import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const downloadsDir = 'C:\\Users\\Arruda\\Downloads';

const files = [
  { key: 'Clientes', file: 'Relatório de Clientes - 05_09_2026.xlsx' },
  { key: 'Produtos', file: 'Produtos- 05-09-2026-11-39.xlsx' },
  { key: 'Servicos', file: 'Serviços - 05-09-2026-11-40.xlsx' },
  { key: 'ContasReceber', file: 'contas-a-receber-05_09_2026 (1).xlsx' },
  { key: 'Fornecedores', file: 'Fornecedores - 06-09-2026-13-12 (1).xlsx' },
  { key: 'ContasPagar', file: 'contas-a-pagar-06_09_2026.xlsx' }
];

console.log('=== AUDITORIA DETALHADA DOS ARQUIVOS EXCEL (XLSX) ===\n');

files.forEach(item => {
  const filePath = path.join(downloadsDir, item.file);
  if (!fs.existsSync(filePath)) {
    console.log(`❌ [AUSENTE] ${item.key}: ${item.file}`);
    return;
  }

  const workbook = XLSX.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  const sheet = workbook.Sheets[sheetNames[0]];
  const data: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const totalRows = data.length;
  const headers = data[0] || [];
  const sampleRow1 = data[1] || [];
  const sampleRowLast = data[totalRows - 1] || [];

  console.log(`----------------------------------------------------`);
  console.log(`📌 ENTIDADE: ${item.key}`);
  console.log(`   Arquivo: ${item.file}`);
  console.log(`   Abas: ${sheetNames.join(', ')}`);
  console.log(`   Total de Linhas (incluindo cabeçalho): ${totalRows}`);
  console.log(`   Total de Registros de Dados: ${Math.max(0, totalRows - 1)}`);
  console.log(`   Total de Colunas: ${headers.length}`);
  console.log(`   Colunas (${headers.length}):`, headers);
  console.log(`   Amostra 1ª Linha Dados:`, sampleRow1);
  console.log(`   Amostra Última Linha Dados:`, sampleRowLast);
});
