const xlsx = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const db = require('../connection');

async function main() {
    console.log("Iniciando carga de empresas desde regiones.xlsx...");
    const filePath = path.join(__dirname, '..', '..', '..', 'excel con empresas', 'regiones.xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = xlsx.utils.sheet_to_json(sheet);

    let insertadas = 0;
    let omitidas = 0;

    for (const row of json) {
        const empresaName = row.empresa ? row.empresa.trim() : null;
        const ejecutivoName = row.Ejecutivo ? row.Ejecutivo.trim() : null;

        if (!empresaName || !ejecutivoName) {
            console.log("Faltan datos en fila:", row);
            omitidas++;
            continue;
        }

        try {
            // Buscar al usuario por nombre (usando LIKE)
            const [users] = await db.query(
                "SELECT id, permisos, zona_id, jefatura_id FROM usuarios WHERE nombre LIKE ? LIMIT 1",
                ['%' + ejecutivoName + '%']
            );

            if (users.length === 0) {
                console.log("⚠️ Usuario no encontrado: " + ejecutivoName);
                omitidas++;
                continue;
            }

            const user = users[0];
            let jefatura_id = null;
            let zona_id = null;

            if (user.permisos === 'jefatura') {
                jefatura_id = user.id;
                zona_id = user.zona_id;
            } else if (user.permisos === 'ejecutiva') {
                // Si es ejecutiva, la empresa en realidad se asigna a su jefatura
                jefatura_id = user.jefatura_id;
                // Necesitamos la zona de su jefatura
                if (jefatura_id) {
                    const [jefaturas] = await db.query("SELECT zona_id FROM usuarios WHERE id = ?", [jefatura_id]);
                    if (jefaturas.length > 0) {
                        zona_id = jefaturas[0].zona_id;
                    }
                }
            } else {
                // Si es admin o gerencia, simplemente lo intentamos meter con la zona que tenga
                jefatura_id = user.id;
                zona_id = user.zona_id;
            }

            // Verificar si la empresa ya existe
            const [exists] = await db.query("SELECT id FROM empresas WHERE nombre = ?", [empresaName]);
            if (exists.length > 0) {
                // Si existe, la actualizamos
                await db.query(
                    "UPDATE empresas SET jefatura_id = ?, zona_id = ? WHERE id = ?",
                    [jefatura_id, zona_id, exists[0].id]
                );
                // console.log(\`✅ Empresa actualizada: \${empresaName}\`);
                insertadas++;
            } else {
                // Si no existe, la insertamos
                await db.query(
                    "INSERT INTO empresas (nombre, jefatura_id, zona_id) VALUES (?, ?, ?)",
                    [empresaName, jefatura_id, zona_id]
                );
                // console.log(\`✅ Empresa creada: \${empresaName}\`);
                insertadas++;
            }

        } catch (error) {
            console.error("❌ Error procesando " + empresaName + ":", error);
            omitidas++;
        }
    }

    console.log("\\n--- RESUMEN ---");
    console.log("✅ Procesadas/Insertadas: " + insertadas);
    console.log("⚠️ Omitidas o fallidas: " + omitidas);
    process.exit(0);
}

main();
