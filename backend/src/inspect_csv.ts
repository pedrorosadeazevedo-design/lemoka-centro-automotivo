import fs from 'fs';
import path from 'path';
import readline from 'readline';

const csvPath = 'C:\\Users\\Arruda\\Downloads\\ID_123_LEMOKA_CENTRO_AUTOMOTIVO_LTDA_05-09-2026.csv';

console.log('=== AUDITORIA DO ARQUIVO CSV DE OS / VENDAS ===\n');

if (!fs.existsSync(csvPath)) {
  console.log('❌ Arquivo CSV não encontrado!');
  process.exit(1);
}

const stats = fs.statSync(csvPath);
console.log(`Arquivo: ${path.basename(csvPath)}`);
console.log(`Tamanho: ${(stats.size / 1024).toFixed(2)} KB (${stats.size} bytes)\n`);

const fileStream = fs.createReadStream(csvPath, { encoding: 'utf8' });
const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

let lineCount = 0;
let headerLine = '';
let sampleRow1 = '';
let lastLine = '';

rl.on('line', (line) => {
  lineCount++;
  if (lineCount === 1) {
    headerLine = line;
  } else if (lineCount === 2) {
    sampleRow1 = line;
  }
  if (line.trim()) {
    lastLine = line;
  }
});

rl.on('close', () => {
  console.log(`Total de Linhas no Arquivo CSV: ${lineCount}`);
  console.log(`Total de Registros de Dados: ${lineCount - 1}`);

  // Testar delimitadores no cabeçalho
  const commaCols = headerLine.split(',');
  const semiCols = headerLine.split(';');
  const tabCols = headerLine.split('\t');

  console.log('\n--- DETECÇÃO DE DELIMITADOR DE CABEÇALHO ---');
  console.log(`Comma (,) split count: ${commaCols.length}`);
  console.log(`Semicolon (;) split count: ${semiCols.length}`);
  console.log(`Tab (\\t) split count: ${tabCols.length}`);

  let activeCols: string[] = [];
  let delimiter = '';

  if (semiCols.length > commaCols.length && semiCols.length > tabCols.length) {
    activeCols = semiCols;
    delimiter = ';';
  } else if (commaCols.length > semiCols.length && commaCols.length > tabCols.length) {
    activeCols = commaCols;
    delimiter = ',';
  } else {
    activeCols = tabCols;
    delimiter = '\\t';
  }

  console.log(`\nDelimitador Detectado: "${delimiter}" (${activeCols.length} colunas)`);
  console.log('Colunas Identificadas:', activeCols.map(c => c.replace(/^"|"$/g, '').trim()));
  console.log('\nAmostra 1ª Linha Dados (Bruto):', sampleRow1.slice(0, 150) + '...');
  console.log('Amostra Última Linha Dados (Bruto):', lastLine.slice(0, 150) + '...');
});
