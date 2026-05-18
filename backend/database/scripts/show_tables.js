const db = require('../connection');

async function check() {
  try {
    const [tables] = await db.query('SHOW TABLES');
    console.log(tables);
    const [descEjecutivas] = await db.query('DESCRIBE ejecutivas');
    console.log('ejecutivas:', descEjecutivas);
    const [descJefaturas] = await db.query('DESCRIBE jefaturas');
    console.log('jefaturas:', descJefaturas);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
check();
