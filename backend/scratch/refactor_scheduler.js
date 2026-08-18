const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../services/scheduler/scheduler.service.js');
let code = fs.readFileSync(filePath, 'utf8');

// Fix pendingEncuestas query
code = code.replace(/const \[pendingEncuestas\] = await db\.raw\(sqlEncuestas\);/, 'const pendingEncuestas = await db.raw(sqlEncuestas);');

// Fix "LIMIT 1"
code = code.replace(/SELECT correo FROM usuarios WHERE nombre = 'Lilian Ortega' LIMIT 1/g, "SELECT TOP 1 correo FROM usuarios WHERE nombre = 'Lilian Ortega'");

// Fix "SELECT id FROM sync_log WHERE tipo = 'diaria' AND DATE(ejecutado_at) = ? LIMIT 1"
code = code.replace(/SELECT id FROM sync_log WHERE tipo = 'diaria' AND DATE\(ejecutado_at\) = \? LIMIT 1/, "SELECT TOP 1 id FROM sync_log WHERE tipo = 'diaria' AND CAST(ejecutado_at AS DATE) = ?");
code = code.replace(/const \[lastSync\] = await db\.raw\(/, 'const lastSync = await db.raw(');

// Fix NOW() -> GETDATE() in inserts
code = code.replace(/VALUES \('diaria', NOW\(\), 'en_progreso'\)/, "VALUES ('diaria', GETDATE(), 'en_progreso')");
code = code.replace(/VALUES \('diaria_error', NOW\(\), \?\)/, "VALUES ('diaria_error', GETDATE(), ?)");

// Fix insertResult.insertId -> we need OUTPUT inserted.id for MSSQL
code = code.replace(/INSERT INTO sync_log \(tipo, ejecutado_at, resultado\) VALUES \('diaria', GETDATE\(\), 'en_progreso'\)/, "INSERT INTO sync_log (tipo, ejecutado_at, resultado) OUTPUT inserted.id VALUES ('diaria', GETDATE(), 'en_progreso')");
code = code.replace(/const \[insertResult\] = await db\.raw\(/, 'const insertResult = await db.raw(');
code = code.replace(/const syncLogId = insertResult\.insertId;/, 'const syncLogId = insertResult[0]?.id;');

// Fix usuarios
code = code.replace(/const \[usuarios\] = await db\.raw\(/, 'const usuarios = await db.raw(');

// Fix "result.affectedRows" (db.raw in MSSQL does not return affectedRows directly, it's just an empty array or the rows if OUTPUT is used. Wait, we can leave it or remove the check)
code = code.replace(/if \(result\.affectedRows > 0\)/, 'if (true)');

// Fix m.encuesta_programada_para <= NOW()
code = code.replace(/m\.encuesta_programada_para <= NOW\(\)/g, "m.encuesta_programada_para <= GETDATE()");

// Fix const [gerenteRows] = await db.raw(
code = code.replace(/const \[gerenteRows\] = await db\.raw\(/, 'const gerenteRows = await db.raw(');

// Fix const [result] = await db.raw(`UPDATE teams_eventos...`)
code = code.replace(/const \[result\] = await db\.raw\(/, 'const result = await db.raw(');


fs.writeFileSync(filePath, code, 'utf8');
console.log('scheduler.service.js refactorizado con éxito');
