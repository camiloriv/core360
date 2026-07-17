const db = require("../database/connection");

async function checkSeeding() {
  try {
    console.log("--- CHECKING SEED DATA ---");
    
    // Check users
    const [users] = await db.query("SELECT id, nombre, correo, permisos FROM usuarios WHERE correo IN ('demo.jefatura@proforma.cl', 'demo.ejecutiva@proforma.cl')");
    console.log("Demo Users:", users);
    
    // Check companies
    const [companies] = await db.query("SELECT id, nombre FROM empresas WHERE nombre LIKE 'Empresa Demo Alpha SpA' OR nombre LIKE 'Tecnologías Beta Ltda' OR nombre LIKE 'Servicios Globales Gamma S.A.'");
    console.log("Demo Companies:", companies);
    
    // Check domains
    const [domains] = await db.query("SELECT * FROM empresa_dominios WHERE dominio IN ('@demoalpha.cl', '@alpha-group.com', '@tecnobeta.cl', '@globalgamma.com')");
    console.log("Demo Domains:", domains);
    
    // Check contacts
    const [contacts] = await db.query("SELECT * FROM empresa_contactos WHERE correo IN ('juan.perez@demoalpha.cl', 'maria.gonzalez@alpha-group.com', 'carlos.silva@tecnobeta.cl', 'ana.martinez@globalgamma.com')");
    console.log("Demo Contacts:", contacts);
    
    // Check meetings
    const [meetings] = await db.query("SELECT id, id_reunion, lugar, motivo_reu, estado_envio FROM reuniones WHERE id_reunion IN ('REU-DEMO-0001', 'REU-DEMO-0002')");
    console.log("Demo Meetings:", meetings);

    // Check orphan meetings
    const [huerfanas] = await db.query("SELECT id, event_id, asunto FROM reuniones_huerfanas WHERE event_id = 'teams-event-demo-12345'");
    console.log("Demo Orphan Meetings:", huerfanas);

  } catch (error) {
    console.error("Error checking seeding:", error);
  } finally {
    process.exit(0);
  }
}

checkSeeding();
