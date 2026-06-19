const bcrypt = require('bcrypt');
const db = require('../database/connection');

async function run() {
  try {
    console.log("Setting everyone's password to '123'...");
    const hashed = await bcrypt.hash('123', 10);
    const [result] = await db.query('UPDATE usuarios SET contrasena = ?', [hashed]);
    console.log(`Successfully updated ${result.affectedRows} users.`);
    process.exit(0);
  } catch (error) {
    console.error("Error setting passwords:", error);
    process.exit(1);
  }
}

run();
