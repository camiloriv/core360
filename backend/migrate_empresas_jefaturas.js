const pool = require('./database/connection.js');

async function migrate() {
    try {
        try {
            await pool.query(`ALTER TABLE empresas ADD COLUMN jefatura_id INT;`);
            console.log("Columna jefatura_id agregada a empresas");
        } catch(e) {
            console.log("Columna jefatura_id ya existe o error:", e.message);
        }

        try {
            await pool.query(`ALTER TABLE empresas ADD CONSTRAINT fk_empresa_jefatura FOREIGN KEY (jefatura_id) REFERENCES jefaturas(id);`);
            console.log("Constraint fk_empresa_jefatura agregada");
        } catch(e) {
            console.log("Constraint fk_empresa_jefatura ya existe o error:", e.message);
        }

        // Migrar datos existentes (opcional, asociando la jefatura de la ejecutiva actual de la empresa)
        try {
            await pool.query(`
                UPDATE empresas emp
                JOIN ejecutivas e ON emp.id_ejecutiva = e.id
                SET emp.jefatura_id = e.jefatura_id
                WHERE emp.jefatura_id IS NULL;
            `);
            console.log("Datos migrados");
        } catch(e) {
            console.log("Error migrando datos:", e.message);
        }

        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
