const mysql = require('mysql2/promise');
require('dotenv').config({ path: '../backend/.env' });

async function addAgendar() {
    const db = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    const [users] = await db.query('SELECT id, vistas_permitidas FROM usuarios WHERE vistas_permitidas IS NOT NULL');
    
    let count = 0;
    for (const user of users) {
        try {
            const vistas = JSON.parse(user.vistas_permitidas);
            if (!vistas.includes('/agendar')) {
                vistas.push('/agendar');
                await db.query('UPDATE usuarios SET vistas_permitidas = ? WHERE id = ?', [JSON.stringify(vistas), user.id]);
                count++;
            }
        } catch (e) {
            console.error(`Error parsing user ${user.id}: ${e.message}`);
        }
    }
    
    console.log(`Updated ${count} users to include /agendar view.`);
    await db.end();
}

addAgendar().catch(console.error);
