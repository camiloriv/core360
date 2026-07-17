const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', 'Seguimiento Nuevos Negocios 2026 V2.xlsx');
console.log('Reading file:', filePath);

try {
  const workbook = XLSX.readFile(filePath);
  console.log('SHEET_NAMES:', JSON.stringify(workbook.SheetNames));

  workbook.SheetNames.forEach(sheetName => {
    console.log(`\nSHEET: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    console.log(`REF: ${sheet['!ref']}`);
    
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    console.log('--- First 10 rows ---');
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      const trimmed = row.slice();
      while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') trimmed.pop();
      if (trimmed.length > 0) {
        console.log(`R${i}: ${JSON.stringify(trimmed)}`);
      }
    }
    console.log(`TOTAL_ROWS: ${data.length}`);
  });
} catch (err) {
  console.error('Error reading excel:', err.message);
}
process.exit(0);
