const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', '..', '..', 'excel con empresas', 'regiones.xlsx');
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const json = xlsx.utils.sheet_to_json(sheet);

console.log("Número de registros:", json.length);
if (json.length > 0) {
    console.log("Primeras 3 filas:");
    console.log(json.slice(0, 3));
    console.log("Cabeceras:", Object.keys(json[0]));
} else {
    console.log("El archivo está vacío.");
}
