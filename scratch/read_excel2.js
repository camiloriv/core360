const XLSX = require('xlsx');

const filePath = String.raw`C:\Users\Proforma5\OneDrive - CENTRO INTERMEDIO PARA CAPACITACIÓN PROFORMA (1)\Escritorio\core360\Seguimiento Nuevos Negocios 2026 V2.xlsx`;

const workbook = XLSX.readFile(filePath);

process.stdout.write('SHEET_NAMES: ' + JSON.stringify(workbook.SheetNames) + '\n');

workbook.SheetNames.forEach(sheetName => {
  process.stdout.write(`\nSHEET: ${sheetName}\n`);
  const sheet = workbook.Sheets[sheetName];
  process.stdout.write(`REF: ${sheet['!ref']}\n`);
  
  if (sheet['!merges'] && sheet['!merges'].length > 0) {
    process.stdout.write(`MERGES: ${sheet['!merges'].length}\n`);
    sheet['!merges'].slice(0, 30).forEach(m => {
      const sc = XLSX.utils.encode_cell(m.s);
      const ec = XLSX.utils.encode_cell(m.e);
      const v = sheet[sc] ? sheet[sc].v : '';
      process.stdout.write(`  M: ${sc}:${ec} = ${JSON.stringify(v)}\n`);
    });
  }
  
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  for (let i = 0; i < Math.min(40, data.length); i++) {
    const row = data[i];
    const trimmed = row.slice();
    while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') trimmed.pop();
    if (trimmed.length > 0) {
      process.stdout.write(`R${i}: ${JSON.stringify(trimmed)}\n`);
    }
  }
  
  process.stdout.write(`TOTAL_ROWS: ${data.length}\n`);
});

process.exit(0);
