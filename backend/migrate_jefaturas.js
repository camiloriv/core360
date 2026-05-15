const pool = require('./database/connection.js');

async function migrate() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS jefaturas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                correo VARCHAR(150)
            );
        `);
        console.log("Tabla jefaturas creada");

        try {
            await pool.query(`ALTER TABLE ejecutivas ADD COLUMN jefatura_id INT;`);
            console.log("Columna jefatura_id agregada");
        } catch(e) {
            console.log("Columna jefatura_id ya existe o error:", e.message);
        }

        try {
            await pool.query(`ALTER TABLE ejecutivas ADD CONSTRAINT fk_jefatura FOREIGN KEY (jefatura_id) REFERENCES jefaturas(id);`);
            console.log("Constraint fk_jefatura agregada");
        } catch(e) {
            console.log("Constraint fk_jefatura ya existe o error:", e.message);
        }

        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
