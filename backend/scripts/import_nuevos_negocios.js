/**
 * Script para importar los datos del Excel "Seguimiento Nuevos Negocios 2026 V2.xlsx"
 * a la tabla nuevos_negocios en MySQL.
 * 
 * Ejecutar desde /backend: node scripts/import_nuevos_negocios.js
 */

const XLSX = require("xlsx");
const path = require("path");
const db = require("../database/connection");

async function importData() {
  const filePath = path.resolve(__dirname, "..", "..", "Seguimiento Nuevos Negocios 2026 V2.xlsx");
  console.log("📂 Leyendo archivo:", filePath);

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets["2026"];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // Headers in row 0
  // Row 0: ["N°","HOLDING","Estado Contacto","RUT","Razón Social","EVENTO","Indicador","Evento2","Zona",
  //         "Monto 1% u Aporte","Tasa Propuesta Administración OTIC","Monto Admisnistración","OTIC Actual",
  //         "Mes Envío Propuesta","Jefa de Cartera Asignada","Estado","Aporte Ingresado","Diferencia",
  //         "Fecha Autoriza Propuesta","Contacto","Contacto 2","Correo","Cargo","Celular / Telefono",
  //         "Comentarios (Acciones / Reuniones)","Fecha Reunión"]

  let connection;
  try {
    connection = await db.getConnection();

    // Check if table exists
    const [tables] = await connection.query("SHOW TABLES LIKE 'nuevos_negocios'");
    if (tables.length === 0) {
      console.error("❌ La tabla nuevos_negocios no existe. Ejecuta primero la migración.");
      process.exit(1);
    }

    // Check if already imported
    const [[{ count }]] = await connection.query("SELECT COUNT(*) as count FROM nuevos_negocios");
    if (count > 0) {
      console.log(`⚠️  La tabla ya tiene ${count} registros. ¿Importar de todos modos?`);
      console.log("   Para forzar la re-importación, ejecuta con --force");
      if (!process.argv.includes("--force")) {
        console.log("   Saliendo sin importar.");
        process.exit(0);
      }
      console.log("   --force detectado, limpiando tabla...");
      await connection.query("DELETE FROM nuevos_negocios_historial");
      await connection.query("DELETE FROM nuevos_negocios");
      await connection.query("ALTER TABLE nuevos_negocios AUTO_INCREMENT = 1");
    }

    let imported = 0;
    let skipped = 0;

    // Data rows start at index 1 (after headers)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Skip rows without holding/razon social (likely totals or empty)
      const holding = (row[1] || "").toString().trim();
      const estadoContacto = (row[2] || "").toString().trim();
      const razonSocial = (row[4] || "").toString().trim();

      if (!holding && !razonSocial) {
        skipped++;
        continue;
      }

      // Skip if it's a totals row (only has numbers)
      if (!holding && !estadoContacto) {
        skipped++;
        continue;
      }

      const rut = (row[3] || "").toString().trim();
      const evento = (row[5] || "").toString().trim();
      const indicador = (row[6] || "").toString().trim();
      const asistioEvento = (row[7] || "").toString().trim() || "No";
      const zona = (row[8] || "").toString().trim();
      const monto1 = parseFloat(row[9]) || 0;
      const tasa = parseFloat(row[10]) || 0;
      const montoAdm = parseFloat(row[11]) || 0;
      const oticActual = (row[12] || "").toString().trim();
      const mesEnvio = (row[13] || "").toString().trim();
      const jefaCartera = (row[14] || "").toString().trim();
      const estado = (row[15] || "").toString().trim();
      const aporteIngresado = parseFloat(row[16]) || 0;
      // row[17] = Diferencia (calculada, no importar)
      const fechaAutoriza = (row[18] || "").toString().trim();
      const contacto = (row[19] || "").toString().trim();
      const contacto2 = (row[20] || "").toString().trim();
      const correo = (row[21] || "").toString().trim();
      const cargo = (row[22] || "").toString().trim();
      const celular = (row[23] || "").toString().trim();
      const comentarios = (row[24] || "").toString().trim();

      // Parse date
      let fechaReunion = null;
      if (row[25]) {
        const dateVal = row[25];
        if (typeof dateVal === "number" && dateVal > 40000) {
          // Excel serial date
          const d = XLSX.SSF.parse_date_code(dateVal);
          if (d) {
            fechaReunion = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
          }
        } else if (typeof dateVal === "string" && dateVal !== "No Aplica" && dateVal !== "") {
          // Try parsing as date string
          const parsed = new Date(dateVal);
          if (!isNaN(parsed.getTime())) {
            fechaReunion = parsed.toISOString().split("T")[0];
          }
        }
      }

      // Normalize estado_contacto
      let normalizedEstadoContacto = estadoContacto.toUpperCase();
      if (!["AFILIADA", "EN GESTIÓN", "PROSPECTO"].includes(normalizedEstadoContacto)) {
        normalizedEstadoContacto = "PROSPECTO";
      }

      try {
        await connection.query(
          `INSERT INTO nuevos_negocios (
            holding, estado_contacto, rut, razon_social, evento, indicador,
            asistio_evento, zona, monto_1_porciento, tasa_administracion,
            monto_administracion, otic_actual, mes_envio_propuesta, jefa_cartera,
            estado, aporte_ingresado, fecha_autoriza_propuesta, contacto,
            contacto_2, correo, cargo, celular_telefono, comentarios, fecha_reunion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            holding || null,
            normalizedEstadoContacto,
            rut === "-" ? null : rut || null,
            razonSocial === "-" ? null : razonSocial || null,
            evento || null,
            indicador || null,
            asistioEvento === "Si" ? "Si" : "No",
            zona || null,
            monto1,
            tasa,
            montoAdm,
            oticActual || null,
            mesEnvio || null,
            jefaCartera || null,
            estado || "Prospecto",
            aporteIngresado,
            fechaAutoriza === "No Aplica" ? null : fechaAutoriza || null,
            contacto === "-" ? null : contacto || null,
            contacto2 === "-" ? null : contacto2 || null,
            correo === "-" ? null : correo || null,
            cargo || null,
            celular || null,
            comentarios || null,
            fechaReunion,
          ]
        );
        imported++;
      } catch (err) {
        console.error(`  ⚠️  Error fila ${i}: ${err.message}`);
        console.error(`  Data: ${JSON.stringify({ holding, rut, razonSocial })}`);
        skipped++;
      }
    }

    console.log(`\n✅ Importación completada:`);
    console.log(`   Importados: ${imported}`);
    console.log(`   Omitidos: ${skipped}`);
    console.log(`   Total filas procesadas: ${data.length - 1}`);

  } catch (error) {
    console.error("❌ Error durante la importación:", error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

importData();
