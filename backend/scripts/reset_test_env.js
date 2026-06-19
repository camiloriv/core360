const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const db = require('../database/connection');

async function run() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    console.log("🧹 Buscando registros de prueba para eliminar...");

    // 1. Encontrar empresas de prueba
    const [empresasPrueba] = await connection.query(`SELECT id, nombre FROM empresas WHERE LOWER(nombre) LIKE '%prueba%' OR LOWER(nombre) LIKE '%demo%'`);
    const empresaIds = empresasPrueba.map(e => e.id);
    
    // 2. Encontrar usuarios de prueba
    const [usuariosPrueba] = await connection.query(`SELECT id, nombre, permisos FROM usuarios WHERE LOWER(nombre) LIKE '%prueba%' OR LOWER(nombre) LIKE '%demo%'`);
    const usuarioIds = usuariosPrueba.map(u => u.id);

    console.log(`Encontradas ${empresaIds.length} empresas de prueba y ${usuarioIds.length} usuarios de prueba.`);

    // Desactivar temporalmente validación de claves foráneas para limpieza profunda
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

    if (empresaIds.length > 0) {
      const placeholders = empresaIds.map(() => '?').join(',');
      await connection.query(`DELETE FROM reuniones WHERE empresa_id IN (${placeholders})`, empresaIds);
      try { await connection.query(`DELETE FROM empresa_seguimiento_log WHERE empresa_id IN (${placeholders})`, empresaIds); } catch(e){}
      await connection.query(`DELETE FROM empresas WHERE id IN (${placeholders})`, empresaIds);
      console.log("✅ Empresas de prueba y sus dependencias eliminadas.");
    }

    if (usuarioIds.length > 0) {
      const placeholders = usuarioIds.map(() => '?').join(',');
      try { await connection.query(`DELETE FROM reuniones WHERE ejecutiva_id IN (${placeholders})`, usuarioIds); } catch(e){}
      try { await connection.query(`DELETE FROM notificaciones WHERE usuario_id IN (${placeholders})`, usuarioIds); } catch(e){}
      await connection.query(`DELETE FROM usuarios WHERE id IN (${placeholders})`, usuarioIds);
      console.log("✅ Usuarios de prueba eliminados.");
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");

    console.log("🌱 Creando entorno de prueba limpio...");

    const passwordDefault = process.env.DEFAULT_PASSWORD || '123456';
    const hashedPwd = await bcrypt.hash(passwordDefault, 10);

    // Insertar Jefatura de Prueba
    const [jefaturaRes] = await connection.query(
      `INSERT INTO usuarios (nombre, correo, permisos, contrasena, requiere_cambio_clave) VALUES (?, ?, 'jefatura', ?, 0)`,
      ['Jefatura de Prueba', 'jefatura.prueba@proforma.cl', hashedPwd]
    );
    const jefaturaId = jefaturaRes.insertId;

    // Insertar Ejecutiva de Prueba
    const [ejecutivaRes] = await connection.query(
      `INSERT INTO usuarios (nombre, correo, permisos, jefatura_id, contrasena, requiere_cambio_clave) VALUES (?, ?, 'ejecutiva', ?, ?, 0)`,
      ['Ejecutiva de Prueba', 'ejecutiva.prueba@proforma.cl', jefaturaId, hashedPwd]
    );
    const ejecutivaId = ejecutivaRes.insertId;

    // Insertar Empresa de Prueba
    await connection.query(
      `INSERT INTO empresas (nombre, jefatura_id) VALUES (?, ?)`,
      ['Empresa Demo SpA', jefaturaId]
    );

    await connection.commit();
    console.log("🎉 Entorno de prueba reconstruido con éxito.");
    console.log(`- Jefatura: jefatura.prueba@proforma.cl`);
    console.log(`- Ejecutiva: ejecutiva.prueba@proforma.cl`);
    console.log(`- Contraseña de ambos: ${passwordDefault}`);
    
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error en el proceso:", error);
  } finally {
    connection.release();
    process.exit(0);
  }
}

run();
