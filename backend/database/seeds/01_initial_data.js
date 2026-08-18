/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // 1. Zonas por defecto
  const zonas = [
    { id: 1, nombre: 'Matriz' },
    { id: 2, nombre: 'Zona Norte 1' },
    { id: 3, nombre: 'Zona Norte 2' },
    { id: 4, nombre: 'Concepción' },
    { id: 5, nombre: 'Puerto Montt' },
    { id: 6, nombre: 'Viña del Mar' }
  ];

  for (const zona of zonas) {
    const exists = await knex('zonas').where('nombre', zona.nombre).first();
    if (!exists) {
      await knex('zonas').insert({ nombre: zona.nombre });
    }
  }

  // 2. Empresa "PROFORMA INTERNA"
  const proformaExists = await knex('empresas').where('nombre', 'PROFORMA INTERNA').first();
  if (!proformaExists) {
    await knex('empresas').insert({
      nombre: 'PROFORMA INTERNA',
      jefatura_id: null,
      zona_id: 1,
      estado_seguimiento: 'pendiente'
    });
  }
};
