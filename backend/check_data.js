const db = require("./database/connection");

const run = async () => {
  try {
    const [reuniones] = await db.query("SELECT COUNT(*) as count FROM reuniones");
    console.log("Reuniones count:", reuniones[0].count);

    const [respuestas] = await db.query("SELECT COUNT(*) as count FROM encuesta_respuestas");
    console.log("Respuestas detalle count:", respuestas[0].count);

    const [reuniones_join] = await db.query(`
        SELECT COUNT(*) as count
        FROM reuniones r
        LEFT JOIN ejecutivas e ON r.ejecutiva_id = e.id
        LEFT JOIN empresas emp ON r.empresa_id = emp.id
    `);
    console.log("Reuniones LEFT JOIN count:", reuniones_join[0].count);

    const [reuniones_inner] = await db.query(`
        SELECT COUNT(*) as count
        FROM reuniones r
        JOIN ejecutivas e ON r.ejecutiva_id = e.id
        JOIN empresas emp ON r.empresa_id = emp.id
    `);
    console.log("Reuniones INNER JOIN count:", reuniones_inner[0].count);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
