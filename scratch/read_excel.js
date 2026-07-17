const XLSX = require('xlsx');

const filePath = 'C:\\Users\\Proforma5\\OneDrive - CENTRO INTERMEDIO PARA CAPACITACIÓN PROFORMA (1)\\Escritorio\\core360\\Seguimiento Nuevos Negocios 2026 V2.xlsx';
console.log('Reading file:', filePath);

const workbook = XLSX.readFile(filePath);

console.log('=== SHEET NAMES ===');
console.log(JSON.stringify(workbook.SheetNames));

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n\n========== SHEET: "${sheetName}" ==========`);
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  console.log(`Range: ${sheet['!ref']}`);
  console.log(`Rows: ${range.e.r - range.s.r + 1}, Cols: ${range.e.c - range.s.c + 1}`);
  
  // Get merged cells
  if (sheet['!merges'] && sheet['!merges'].length > 0) {
    console.log(`\nMerged cells: ${sheet['!merges'].length}`);
    sheet['!merges'].slice(0, 30).forEach(m => {
      const startCell = XLSX.utils.encode_cell(m.s);
      const endCell = XLSX.utils.encode_cell(m.e);
      const cellValue = sheet[startCell] ? sheet[startCell].v : '';
      console.log(`  ${startCell}:${endCell} = "${cellValue}"`);
    });
  }
  
  // Read all data row by row
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  
  // Print first 25 rows
  console.log('\n--- First 25 rows ---');
  data.slice(0, 25).forEach((row, i) => {
    // Filter out empty trailing cells
    const trimmed = row.slice();
    while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') trimmed.pop();
    if (trimmed.length > 0) {
      console.log(`Row ${i}: ${JSON.stringify(trimmed)}`);
    }
  });
  
  console.log(`\nTotal rows: ${data.length}`);
  
  // Print rows 25-50
  if (data.length > 25) {
    console.log('\n--- Rows 25-50 ---');
    data.slice(25, 50).forEach((row, i) => {
      const trimmed = row.slice();
      while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') trimmed.pop();
      if (trimmed.length > 0) {
        console.log(`Row ${i+25}: ${JSON.stringify(trimmed)}`);
      }
    });
  }
});
