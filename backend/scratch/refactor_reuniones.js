const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../modules/reuniones/reuniones.controller.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Reemplazar import
code = code.replace('const db = require("../../database/connection");', 'const db = require("../../database/knex");');

// 2. Reemplazar const [var] = await db.query( con const var = await db.raw(
code = code.replace(/const\s+\[([a-zA-Z0-9_]+)\]\s*=\s*await\s+db\.query\(/g, 'const $1 = await db.raw(');

// 3. Reemplazar resto de await db.query(
code = code.replace(/await\s+db\.query\(/g, 'await db.raw(');

// 4. Reemplazar LIMIT 1 en las queries
// MySQL: SELECT * FROM tabla WHERE condicion LIMIT 1
// MSSQL: SELECT TOP 1 * FROM tabla WHERE condicion
code = code.replace(/SELECT\s+(.*?)\s+FROM\s+(.*?)\s+LIMIT\s+1/gi, 'SELECT TOP 1 $1 FROM $2');

// 5. Reemplazar INSERT IGNORE
// "INSERT IGNORE INTO empresa_dominios (empresa_id, dominio) VALUES (?, ?)"
// "INSERT IGNORE INTO empresa_contactos (empresa_id, correo) VALUES (?, ?)"
// En SQL Server podemos hacer: 
// "IF NOT EXISTS (SELECT 1 FROM tabla WHERE col = val) INSERT INTO tabla ..."
// O simplemente manejarlo con un try-catch si hay constraint única.
// Mejor lo cambio manualmente.
code = code.replace(
    /"INSERT IGNORE INTO empresa_dominios \(empresa_id, dominio\) VALUES \(\?, \?\)"/,
    `"IF NOT EXISTS (SELECT 1 FROM empresa_dominios WHERE empresa_id = ? AND dominio = ?) INSERT INTO empresa_dominios (empresa_id, dominio) VALUES (?, ?)", [empresa_id, dominio, empresa_id, dominio]`
).replace(
    /await db\.raw\("IF NOT EXISTS[\s\S]*?\[empresa_id, dominio\]\);/,
    `await db.raw("IF NOT EXISTS (SELECT 1 FROM empresa_dominios WHERE empresa_id = ? AND dominio = ?) INSERT INTO empresa_dominios (empresa_id, dominio) VALUES (?, ?)", [empresa_id, dominio, empresa_id, dominio]);`
);

code = code.replace(
    /"INSERT IGNORE INTO empresa_contactos \(empresa_id, correo\) VALUES \(\?, \?\)"/,
    `"IF NOT EXISTS (SELECT 1 FROM empresa_contactos WHERE empresa_id = ? AND correo = ?) INSERT INTO empresa_contactos (empresa_id, correo) VALUES (?, ?)", [empresa_id, correo.toLowerCase(), empresa_id, correo.toLowerCase()]`
).replace(
    /await db\.raw\("IF NOT EXISTS[\s\S]*?\[empresa_id, correo\.toLowerCase\(\)\]\);/,
    `await db.raw("IF NOT EXISTS (SELECT 1 FROM empresa_contactos WHERE empresa_id = ? AND correo = ?) INSERT INTO empresa_contactos (empresa_id, correo) VALUES (?, ?)", [empresa_id, correo.toLowerCase(), empresa_id, correo.toLowerCase()]);`
);

// 6. Fix `CURDATE()` que no existe en MSSQL, es `CAST(GETDATE() AS DATE)`
code = code.replace(/CURDATE\(\)/g, 'CAST(GETDATE() AS DATE)');

// 7. Fix `YEAR(...)` and `MONTH(...)` works in MSSQL, but DATE_SUB doesn't exist
// DATE_SUB(CURDATE(), INTERVAL 6 MONTH) -> DATEADD(month, -6, CAST(GETDATE() AS DATE))
code = code.replace(/DATE_SUB\(CAST\(GETDATE\(\) AS DATE\),\s*INTERVAL\s*6\s*MONTH\)/g, 'DATEADD(month, -6, CAST(GETDATE() AS DATE))');

// 8. Fix DATE_FORMAT(te.fecha, '%Y-%m') -> FORMAT(te.fecha, 'yyyy-MM')
code = code.replace(/DATE_FORMAT\((.*?), '%Y-%m'\)/g, "FORMAT($1, 'yyyy-MM')");

fs.writeFileSync(filePath, code, 'utf8');
console.log('reuniones.controller.js refactorizado con éxito');
