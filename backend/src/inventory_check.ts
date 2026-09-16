import fs from 'fs';
import path from 'path';

const downloadsDir = 'C:\\Users\\Arruda\\Downloads';

const expectedFiles = [
  { name: 'Relatório de Clientes - 05_09_2026.xlsx', key: 'Clientes' },
  { name: 'Produtos- 05-09-2026-11-39.xlsx', key: 'Produtos' },
  { name: 'Serviços - 05-09-2026-11-40.xlsx', key: 'Servicos' },
  { name: 'contas-a-receber-05_09_2026 (1).xlsx', fallback: 'contas-a-receber-05_09_2026.xlsx', key: 'ContasReceber' },
  { name: 'Fornecedores - 06-09-2026-13-12 (1).xlsx', fallback: 'Fornecedores - 06-09-2026-13-12.xlsx', key: 'Fornecedores' },
  { name: 'contas-a-pagar-06_09_2026.xlsx', key: 'ContasPagar' },
  { name: 'ID_123_LEMOKA_CENTRO_AUTOMOTIVO_LTDA_05-09-2026.csv', key: 'OSVendas' }
];

console.log('=== INVENTÁRIO FÍSICO DOS ARQUIVOS EM DOWNLOADS ===');

expectedFiles.forEach(item => {
  let filePath = path.join(downloadsDir, item.name);
  if (!fs.existsSync(filePath) && item.fallback) {
    filePath = path.join(downloadsDir, item.fallback);
  }

  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`\n[ENCONTRADO] ${item.key}:`);
    console.log(`  Arquivo: ${path.basename(filePath)}`);
    console.log(`  Tamanho: ${(stats.size / 1024).toFixed(2)} KB (${stats.size} bytes)`);
    console.log(`  Modificado em: ${stats.mtime.toISOString()}`);
  } else {
    console.log(`\n[NÃO ENCONTRADO] ${item.key}: ${item.name}`);
  }
});
