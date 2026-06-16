const db = require("../backend/database/connection");

async function obtenerDefaultCcTest(empresa_id, ejecutiva_id, enviado_por_correo) {
    try {
        // 1. Obtener datos de Lilian Ortega (Gerencia)
        const [gerenteRows] = await db.query("SELECT correo FROM usuarios WHERE nombre = 'Lilian Ortega' LIMIT 1");
        const lilianCorreo = gerenteRows[0]?.correo || "lortega@proforma.cl";

        // 2. Obtener el perfil del usuario logueado (enviado_por_correo)
        let userPermisos = 'ejecutiva';
        let loggedInUser = null;
        if (enviado_por_correo) {
            const [userRows] = await db.query("SELECT id, permisos, jefatura_id, correo FROM usuarios WHERE correo = ? LIMIT 1", [enviado_por_correo]);
            if (userRows.length > 0) {
                loggedInUser = userRows[0];
                userPermisos = loggedInUser.permisos || 'ejecutiva';
            }
        }

        console.log(`[TEST] Usuario logueado: ${enviado_por_correo} | Rol: ${userPermisos}`);

        let correosCcArray = [];

        // Siempre incluir al remitente en el CC para que tenga respaldo
        if (enviado_por_correo) {
            correosCcArray.push(enviado_por_correo);
        }

        if (userPermisos === 'ejecutiva') {
            // Ejecutiva: su jefatura y gerencia (Lilian Ortega)
            let jefaturaId = loggedInUser?.jefatura_id;
            if (!jefaturaId && ejecutiva_id) {
                // Fallback: buscar la ejecutiva seleccionada
                const [ejRows] = await db.query("SELECT jefatura_id FROM usuarios WHERE id = ? LIMIT 1", [ejecutiva_id]);
                jefaturaId = ejRows[0]?.jefatura_id;
            }

            if (jefaturaId) {
                const [jefRows] = await db.query("SELECT correo FROM usuarios WHERE id = ? LIMIT 1", [jefaturaId]);
                if (jefRows[0]?.correo) {
                    correosCcArray.push(jefRows[0].correo);
                }
            }
            correosCcArray.push(lilianCorreo);

        } else if (userPermisos === 'jefatura') {
            // Jefatura: su ejecutiva(s) y gerencia (Lilian Ortega)
            const jefaturaId = loggedInUser?.id || ejecutiva_id;
            const [ejRows] = await db.query("SELECT correo FROM usuarios WHERE jefatura_id = ? AND permisos = 'ejecutiva'", [jefaturaId]);
            ejRows.forEach(row => {
                if (row.correo) correosCcArray.push(row.correo);
            });
            correosCcArray.push(lilianCorreo);

        } else {
            // Gerencia / Admin: jefatura y ejecutiva + gerencia
            // Obtenemos la ejecutiva seleccionada
            if (ejecutiva_id) {
                const [ejRows] = await db.query("SELECT correo, jefatura_id FROM usuarios WHERE id = ? LIMIT 1", [ejecutiva_id]);
                if (ejRows[0]) {
                    const ejCorreo = ejRows[0].correo;
                    const jefId = ejRows[0].jefatura_id;
                    if (ejCorreo) correosCcArray.push(ejCorreo);

                    if (jefId) {
                        const [jefRows] = await db.query("SELECT correo FROM usuarios WHERE id = ? LIMIT 1", [jefId]);
                        if (jefRows[0]?.correo) {
                            correosCcArray.push(jefRows[0].correo);
                        }
                    }
                }
            }
            correosCcArray.push(lilianCorreo);
        }

        // Limpiar duplicados y valores vacíos (sin filtrar al remitente)
        let correosCcFiltered = correosCcArray
            .filter(Boolean)
            .map(email => email.trim());

        // Eliminar duplicados
        correosCcFiltered = [...new Set(correosCcFiltered)];

        // En todos los casos debe estar uno en copia siempre
        if (correosCcFiltered.length === 0) {
            correosCcFiltered.push(lilianCorreo);
        }

        const ccString = correosCcFiltered.join(', ');
        console.log(`[TEST] CC Result: "${ccString}"\n`);
        return ccString;

    } catch (err) {
        console.error("Error:", err);
    }
}

(async () => {
  // Test case 1: Ejecutiva (Camilo Rivera - crivera@proforma.cl)
  await obtenerDefaultCcTest(1, 9, 'crivera@proforma.cl');

  // Test case 2: Jefatura (Beatriz Silva - test_bsilva@proforma.cl)
  await obtenerDefaultCcTest(1, 1, 'test_bsilva@proforma.cl');

  // Test case 3: Gerencia (Lilian Ortega - test_lortega@proforma.cl)
  await obtenerDefaultCcTest(1, 13, 'test_lortega@proforma.cl');

  process.exit(0);
})();
