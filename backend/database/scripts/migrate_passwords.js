const db = require('../connection');
const bcrypt = require('bcrypt');

async function migratePasswords() {
  try {
    console.log('[Migración] Iniciando migración de contraseñas a bcrypt...');
    const [usuarios] = await db.query('SELECT id, contrasena FROM usuarios');

    let migrados = 0;
    let yaHasheados = 0;

    for (const usuario of usuarios) {
      const { id, contrasena } = usuario;

      // Verificamos si la contraseña ya parece un hash de bcrypt.
      // Los hashes de bcrypt comienzan con $2b$, $2a$, o $2y$ y tienen 60 caracteres.
      if (contrasena && contrasena.startsWith('$2') && contrasena.length === 60) {
        yaHasheados++;
        continue; // Ya está hasheada
      }

      // Si no es un hash, asumimos que es texto plano y la hasheamos
      if (contrasena) {
        const hashed = await bcrypt.hash(contrasena, 10);
        await db.query('UPDATE usuarios SET contrasena = ? WHERE id = ?', [hashed, id]);
        migrados++;
      }
    }

    console.log(`[Migración] Completada. Contraseñas migradas: ${migrados}. Contraseñas ya seguras: ${yaHasheados}.`);
  } catch (error) {
    console.error('[Migración] Error al migrar las contraseñas:', error);
  }
}

module.exports = migratePasswords;
