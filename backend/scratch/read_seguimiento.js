const XLSX = require('xlsx');

const filePath = String.raw`C:\Users\Proforma5\OneDrive - CENTRO INTERMEDIO PARA CAPACITACIÓN PROFORMA (1)\Escritorio\core360\Seguimiento Nuevos Negocios 2026 V2.xlsx`;

const workbook = XLSX.readFile(filePath);

const sheet = workbook.Sheets['2026'];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

// Print rows 50-100
process.stdout.write('=== ROWS 50-100 ===\n');
for (let i = 50; i < Math.min(100, data.length); i++) {
  const trimmed = data[i].slice();
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') trimmed.pop();
  if (trimmed.length > 0) {
    process.stdout.write(`R${i}: ${JSON.stringify(trimmed)}\n`);
  }
}

// Print rows 100-183
process.stdout.write('\n=== ROWS 100-183 ===\n');
for (let i = 100; i < data.length; i++) {
  const trimmed = data[i].slice();
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') trimmed.pop();
  if (trimmed.length > 0) {
    process.stdout.write(`R${i}: ${JSON.stringify(trimmed)}\n`);
  }
}

process.exit(0);
