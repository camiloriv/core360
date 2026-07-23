require('dotenv').config({ path: 'backend/.env' });
const db = require('../database/connection');
const fs = require('fs');
const path = require('path');

const normalize = (name) => (name || 'default').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, '_');

async function check() {
  const [users] = await db.query('SELECT nombre, correo FROM usuarios');
  const firmasDir = path.join(__dirname, '..', 'assets', 'firmas');
  let files = [];
  if (fs.existsSync(firmasDir)) {
    files = fs.readdirSync(firmasDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  }
  
  const filesWithoutExt = files.map(f => f.replace(/\.(png|jpg)$/, ''));
  
  let missing = [];
  let found = [];
  
  for (let u of users) {
    const norm = normalize(u.nombre);
    if (filesWithoutExt.includes(norm)) {
      found.push(u.nombre);
    } else {
      missing.push(u.nombre + ' (' + norm + ') - ' + u.correo);
    }
  }
  
  console.log('Total Usuarios Activos:', users.length);
  console.log('Total Archivos de Firma (incl. default):', files.length);
  console.log('\nUsuarios CON firma encontrada (', found.length, '):');
  console.log(found.join('\n'));
  console.log('\nUsuarios SIN firma especifica (', missing.length, '):');
  console.log(missing.join('\n'));
  
  process.exit(0);
}

check().catch(console.error);
