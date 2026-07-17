const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', 'reuniones febrero camilo.xlsx');

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    const local = data.filter(d => d.entorno === 'local');
    const dev = data.filter(d => d.entorno === 'develop');
    
    const normalize = str => (str || '').toString().trim().toLowerCase();
    const devMotivos = dev.map(d => normalize(d.Motivo || d.Asunto));
    
    const missingInDev = local.filter(l => !devMotivos.includes(normalize(l.Motivo || l.Asunto)));
    
    console.log(JSON.stringify(missingInDev, null, 2));

} catch (error) {
    console.error("Error reading file:", error);
}
