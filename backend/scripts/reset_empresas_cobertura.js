const db = require("../database/connection");

async function resetEmpresasCobertura() {
    try {
        console.log("Iniciando limpieza de la cobertura de empresas...");

        // Resetear el estado_seguimiento a 'pendiente' y fechas a NULL para TODAS las empresas
        const [res] = await db.query(`
            UPDATE empresas 
            SET estado_seguimiento = 'pendiente', 
                fecha_solicitada = NULL, 
                fecha_concretada = NULL
        `);
        
        console.log(`Cobertura reseteada exitosamente en ${res.affectedRows} empresas.`);
        console.log("Ahora la vista 'Cobertura' debería mostrar todas las empresas en estado Pendiente / Sin Gestión.");
    } catch (error) {
        console.error("Error durante la limpieza:", error);
    } finally {
        process.exit(0);
    }
}

resetEmpresasCobertura();
