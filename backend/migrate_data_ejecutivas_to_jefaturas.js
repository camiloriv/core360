const pool = require('./database/connection.js');

async function migrate() {
    try {
        const [ejecutivas] = await pool.query('SELECT * FROM ejecutivas');
        
        for (let ej of ejecutivas) {
            // Verificar si ya existe una jefatura con ese nombre para no duplicar si se corre dos veces
            const [existing] = await pool.query('SELECT id FROM jefaturas WHERE nombre = ?', [ej.nombre]);
            let jefaturaId;
            
            if (existing.length > 0) {
                jefaturaId = existing[0].id;
                console.log(`La jefatura ${ej.nombre} ya existe (ID: ${jefaturaId}).`);
            } else {
                const [result] = await pool.query('INSERT INTO jefaturas (nombre, correo) VALUES (?, ?)', [ej.nombre, ej.correo || '']);
                jefaturaId = result.insertId;
                console.log(`Creada nueva jefatura para ${ej.nombre} (ID: ${jefaturaId}).`);
            }
            
            // Asociar la ejecutiva a esta jefatura
            await pool.query('UPDATE ejecutivas SET jefatura_id = ? WHERE id = ?', [jefaturaId, ej.id]);
            
            // Migrar empresas: Las empresas que tenían id_ejecutiva igual a esta ejecutiva, ahora apuntan a esta jefatura_id
            const [updateEmpresas] = await pool.query('UPDATE empresas SET jefatura_id = ? WHERE id_ejecutiva = ?', [jefaturaId, ej.id]);
            console.log(` -> Actualizadas ${updateEmpresas.affectedRows} empresas.`);
        }
        
        console.log("Migración de datos completada exitosamente.");
        process.exit(0);
    } catch(err) {
        console.error("Error durante la migración:", err);
        process.exit(1);
    }
}

migrate();
