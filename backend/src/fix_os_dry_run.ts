import fs from 'fs';
import path from 'path';

const csvPath = 'C:\\Users\\Arruda\\Downloads\\ID_123_LEMOKA_CENTRO_AUTOMOTIVO_LTDA_05-09-2026.csv';
const rawOs = fs.readFileSync(csvPath, 'latin1');
const osLines = rawOs.split(/\r?\n/).filter(l => l.trim().length > 0).slice(2);

let totalValorOS = 0;
let validValoresCount = 0;
let osConcluidasCount = 0;
let osOutrasCount = 0;

osLines.forEach((line, idx) => {
  const cols = line.split(',').map(c => c.replace(/^"|"$/g, '').trim());
  const etapa = cols[0] || '';
  const status = cols[4] || '';
  const valStr = (cols[23] || '').replace('R$', '').replace(/\./g, '').replace(',', '.').trim();
  const valNum = parseFloat(valStr) || 0;

  if (!isNaN(valNum)) {
    totalValorOS += valNum;
    validValoresCount++;
  }

  if (etapa.toUpperCase().includes('POS') || status.toUpperCase().includes('CONCLU') || status.toUpperCase().includes('FINALIZ')) {
    osConcluidasCount++;
  } else {
    osOutrasCount++;
  }
});

console.log('--- REVISÃO DE CÁLCULO DE VALOR DE OS ---');
console.log(`Total de Linhas OS: ${osLines.length}`);
console.log(`Linhas com Valor Válido: ${validValoresCount}`);
console.log(`Soma Total do Valor das OSs (R$): ${totalValorOS.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`);
console.log(`OSs em Estágio PÓS - VENDAS: ${osConcluidasCount}`);
console.log(`OSs em Outros Estágios: ${osOutrasCount}`);
