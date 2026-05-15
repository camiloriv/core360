const db = require("./database/connection");

const run = async () => {
  try {
    // Actualizar pregunta 4
    await db.query(
      "UPDATE encuesta_preguntas SET texto = ?, opciones_json = ? WHERE orden = 4 AND template_id = 1",
      [
        "¿Qué tan probable es que recomiende nuestro servicio? (Escala de 1 a 10, donde 1 = Nada probable y 10 = Muy probable)",
        JSON.stringify(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"])
      ]
    );

    console.log("Opciones de pregunta 4 actualizadas.");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
};

run();
