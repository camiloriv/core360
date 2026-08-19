const { sql, poolPromise } = require('../mssql');

async function seed() {
  try {
    const pool = await poolPromise;
    console.log('Iniciando carga de datos iniciales...');

    // 1. Zonas por defecto
    const zonas = [
      { id: 1, nombre: 'Matriz' },
      { id: 2, nombre: 'Zona Norte 1' },
      { id: 3, nombre: 'Zona Norte 2' },
      { id: 4, nombre: 'Concepción' },
      { id: 5, nombre: 'Puerto Montt' },
      { id: 6, nombre: 'Viña del Mar' }
    ];

    for (const zona of zonas) {
      const res = await pool.request()
        .input('nombre', sql.VarChar, zona.nombre)
        .query('SELECT TOP 1 id FROM zonas WHERE nombre = @nombre');
        
      if (res.recordset.length === 0) {
        await pool.request()
          .input('nombre', sql.VarChar, zona.nombre)
          .query('INSERT INTO zonas (nombre) VALUES (@nombre)');
        console.log(`Zona '\${zona.nombre}' insertada.`);
      }
    }

    // 2. Empresa "PROFORMA INTERNA"
    const proformaRes = await pool.request()
      .query("SELECT TOP 1 id FROM empresas WHERE nombre = 'PROFORMA INTERNA'");
      
    if (proformaRes.recordset.length === 0) {
      await pool.request()
        .query("INSERT INTO empresas (nombre, zona_id, estado_seguimiento) VALUES ('PROFORMA INTERNA', 1, 'pendiente')");
      console.log("Empresa 'PROFORMA INTERNA' insertada.");
    }

    console.log('Carga de datos iniciales completada.');
    process.exit(0);
  } catch (error) {
    console.error('Error al ejecutar semillas:', error);
    process.exit(1);
  }
}

seed();
