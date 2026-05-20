const pool = require("./database/connection.js");

async function checkJefaturas() {
  try {
    // 1. Obtener todas las jefaturas registradas
    const [jefaturas] = await pool.query(`
      SELECT id, nombre, correo 
      FROM usuarios 
      WHERE permisos = 'jefatura'
    `);

    // 2. Obtener total de empresas
    const [totalEmpresasRes] = await pool.query("SELECT COUNT(*) AS total FROM empresas");
    const totalEmpresas = totalEmpresasRes[0].total;

    // 3. Obtener empresas asignadas a jefaturas
    const [empresasConJefaturaRes] = await pool.query(`
      SELECT COUNT(*) AS total 
      FROM empresas 
      WHERE jefatura_id IS NOT NULL
    `);
    const totalConJefatura = empresasConJefaturaRes[0].total;

    // 4. Detalle de empresas asociadas a cada jefatura
    const [detalleJefaturas] = await pool.query(`
      SELECT 
        u.id AS jefatura_id, 
        u.nombre AS jefatura_nombre, 
        u.correo AS jefatura_correo,
        COUNT(e.id) AS cantidad_empresas
      FROM usuarios u
      LEFT JOIN empresas e ON e.jefatura_id = u.id
      WHERE u.permisos = 'jefatura'
      GROUP BY u.id, u.nombre, u.correo
    `);

    // 5. Empresas sin jefatura
    const [empresasSinJefatura] = await pool.query(`
      SELECT id, nombre 
      FROM empresas 
      WHERE jefatura_id IS NULL
    `);

    console.log("=== RESULTADOS DEL ANÁLISIS ===");
    console.log(`\n1. Jefaturas totales encontradas: ${jefaturas.length}`);
    jefaturas.forEach(j => {
      console.log(`   - Jefatura: "${j.nombre}" (ID: ${j.id}, Correo: ${j.correo})`);
    });

    console.log(`\n2. Empresas totales: ${totalEmpresas}`);
    console.log(`   - Empresas con jefatura asignada: ${totalConJefatura}`);
    console.log(`   - Empresas sin jefatura asignada: ${totalEmpresas - totalConJefatura}`);

    console.log("\n3. Distribución de empresas por Jefatura:");
    detalleJefaturas.forEach(dj => {
      console.log(`   - "${dj.jefatura_nombre}" tiene ${dj.cantidad_empresas} empresa(s) asignada(s)`);
    });

    if (empresasSinJefatura.length > 0) {
      console.log("\n4. Empresas sin Jefatura asignada:");
      empresasSinJefatura.forEach(e => {
        console.log(`   - [ID: ${e.id}] ${e.nombre}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error("Error al consultar:", err);
    process.exit(1);
  }
}

checkJefaturas();
