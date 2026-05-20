const xlsx = require('xlsx');
const path = require('path');
const pool = require('../database/connection.js');

async function syncEmpresas() {
  try {
    const filePath = path.join(__dirname, '..', '..', 'excel con empresas', 'empresas.xlsx');
    console.log("Reading file:", filePath);
    
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet);
    
    let updated = 0;
    let inserted = 0;
    
    for (const row of data) {
      const nombreEmpresa = row['Empresa/holding'];
      const jefaturaId = row['ejecutiva id'];
      
      if (!nombreEmpresa || !jefaturaId) continue;

      // Intentar actualizar primero
      const [updateResult] = await pool.query(
        "UPDATE empresas SET jefatura_id = ? WHERE nombre = ?", 
        [jefaturaId, nombreEmpresa]
      );

      if (updateResult.affectedRows > 0) {
        updated++;
      } else {
        // Si no se actualizó ninguna, entonces no existía. La insertamos.
        await pool.query(
          "INSERT INTO empresas (nombre, jefatura_id) VALUES (?, ?)",
          [nombreEmpresa, jefaturaId]
        );
        inserted++;
      }
    }

    console.log("=== SINCRONIZACIÓN COMPLETADA ===");
    console.log(`Empresas actualizadas: ${updated}`);
    console.log(`Nuevas empresas insertadas: ${inserted}`);

    // Mostrar el conteo final real en la base de datos
    const [detalleJefaturas] = await pool.query(`
      SELECT 
        u.id AS jefatura_id, 
        u.nombre AS jefatura_nombre, 
        COUNT(e.id) AS cantidad_empresas
      FROM usuarios u
      LEFT JOIN empresas e ON e.jefatura_id = u.id
      WHERE u.permisos = 'jefatura'
      GROUP BY u.id, u.nombre
    `);

    console.log("\n=== NUEVA DISTRIBUCIÓN EN BASE DE DATOS ===");
    detalleJefaturas.forEach(dj => {
      console.log(`- "${dj.jefatura_nombre}" tiene ${dj.cantidad_empresas} empresa(s) asignada(s)`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Error sincronizando:", err);
    process.exit(1);
  }
}

syncEmpresas();
