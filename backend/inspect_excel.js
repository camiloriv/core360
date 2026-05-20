const xlsx = require('xlsx');
const path = require('path');

function analyze() {
  const filePath = path.join(__dirname, '..', 'excel con empresas', 'empresas.xlsx');
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  
  const counts = {};
  data.forEach(row => {
    const id = row['ejecutiva id'];
    counts[id] = (counts[id] || 0) + 1;
  });
  
  console.log("Counts per ejecutiva id in Excel:");
  console.log(counts);
}
analyze();
