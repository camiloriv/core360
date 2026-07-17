const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env' });

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Admin368*',
    database: process.env.DB_NAME || 'core360'
  });

  const [empresas] = await connection.execute('SELECT id FROM empresas WHERE nombre LIKE "%Olitel%"');
  if (empresas.length > 0) {
    const empresaId = empresas[0].id;
    console.log("Empresa ID:", empresaId);
    
    const [minutas] = await connection.execute('SELECT id, id_minuta FROM minutas WHERE empresa_id = ? ORDER BY created_at DESC LIMIT 1', [empresaId]);
    if (minutas.length > 0) {
      console.log("Minuta a eliminar:", minutas[0]);
      
      await connection.execute('DELETE FROM minutas WHERE id = ?', [minutas[0].id]);
      console.log("¡Minuta eliminada con éxito!");
    } else {
      console.log("No se encontraron minutas para esta empresa.");
    }
  } else {
    console.log("Empresa no encontrada.");
  }
  
  await connection.end();
}

run().catch(console.error);
