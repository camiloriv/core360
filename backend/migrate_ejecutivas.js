const pool = require('./database/connection.js');

async function migrate() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS ejecutiva_cargos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(50) NOT NULL
            );
        `);
        console.log("Tabla ejecutiva_cargos creada");

        // Insertar cargos iniciales
        await pool.query(`
            INSERT IGNORE INTO ejecutiva_cargos (id, nombre) VALUES 
            (1, 'Jefa'),
            (2, 'Ejecutiva');
        `);
        console.log("Cargos iniciales insertados");

        // Agregar columnas a ejecutivas
        try {
            await pool.query(`ALTER TABLE ejecutivas ADD COLUMN cargo_id INT DEFAULT 2;`);
            console.log("Columna cargo_id agregada");
        } catch(e) {
            console.log("Columna cargo_id ya existe o error:", e.message);
        }

        try {
            await pool.query(`ALTER TABLE ejecutivas ADD COLUMN correo VARCHAR(150);`);
            console.log("Columna correo agregada");
        } catch(e) {
            console.log("Columna correo ya existe o error:", e.message);
        }
        
        try {
            await pool.query(`ALTER TABLE ejecutivas ADD CONSTRAINT fk_cargo FOREIGN KEY (cargo_id) REFERENCES ejecutiva_cargos(id);`);
            console.log("Constraint fk_cargo agregada");
        } catch(e) {
            console.log("Constraint fk_cargo ya existe o error:", e.message);
        }

        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
