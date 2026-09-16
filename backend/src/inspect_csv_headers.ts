import fs from 'fs';
import path from 'path';

const csvPath = 'C:\\Users\\Arruda\\Downloads\\ID_123_LEMOKA_CENTRO_AUTOMOTIVO_LTDA_05-09-2026.csv';

const rawContent = fs.readFileSync(csvPath, 'utf8');
const lines = rawContent.split(/\r?\n/).filter(l => l.trim().length > 0);

console.log('=== AUDITORIA DE CABEÇALHO REAL DO CSV DE OS / VENDAS ===\n');
console.log('Linha 1 (sep= directive):', lines[0]);
console.log('Linha 2 (Cabeçalho real das colunas):', lines[1]);

const headers = lines[1].split(',').map(c => c.replace(/^"|"$/g, '').trim());
console.log(`\nTotal de Colunas Reais: ${headers.length}`);
console.log('Nomes Exatos das Colunas:', headers);

console.log('\nTotal de Linhas no Arquivo:', lines.length);
console.log('Total de Registros de Dados Reais:', lines.length - 2);

const sample1 = lines[2].split(',').map(c => c.replace(/^"|"$/g, '').trim());
const sampleLast = lines[lines.length - 1].split(',').map(c => c.replace(/^"|"$/g, '').trim());

console.log('\nAmostra 1ª Linha Dados (Linha 3):', sample1.slice(0, 10));
console.log('Amostra Última Linha Dados:', sampleLast.slice(0, 10));
