const http = require('http');

function getCC(params) {
  return new Promise((resolve, reject) => {
    const query = Object.entries(params)
      .map(([key, val]) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
      .join('&');

    const options = {
      hostname: 'localhost',
      port: 8080,
      path: `/reuniones/default-cc?${query}`,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

(async () => {
  try {
    console.log("=== INICIANDO PRUEBAS DE ENDPOINT /reuniones/default-cc ===");

    // Test case 1: Ejecutiva (Camilo Rivera - crivera@proforma.cl, id: 9)
    console.log("Caso 1: Ejecutiva crivera@proforma.cl");
    const res1 = await getCC({ empresa_id: 1, ejecutiva_id: 9, enviado_por_correo: 'crivera@proforma.cl', enviado_por_id: 9 });
    console.log("Response:", res1);

    // Test case 2: Jefatura (Beatriz Silva - test_bsilva@proforma.cl, id: 1)
    console.log("\nCaso 2: Jefatura test_bsilva@proforma.cl");
    const res2 = await getCC({ empresa_id: 1, ejecutiva_id: 9, enviado_por_correo: 'test_bsilva@proforma.cl', enviado_por_id: 1 });
    console.log("Response:", res2);

    // Test case 3: Gerencia (Lilian Ortega - test_lortega@proforma.cl, id: 13)
    console.log("\nCaso 3: Gerencia test_lortega@proforma.cl");
    const res3 = await getCC({ empresa_id: 1, ejecutiva_id: 9, enviado_por_correo: 'test_lortega@proforma.cl', enviado_por_id: 13 });
    console.log("Response:", res3);

  } catch (error) {
    console.error("Error en las pruebas HTTP:", error);
  }
})();
