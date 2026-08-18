/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // 1. Zonas
  await knex.schema.createTable('zonas', (table) => {
    table.increments('id').primary();
    table.string('nombre', 100).notNullable().unique();
    table.timestamps(true, true);
  });

  // 2. Usuarios
  await knex.schema.createTable('usuarios', (table) => {
    table.increments('id').primary();
    table.string('nombre').notNullable();
    table.string('correo').notNullable().unique();
    table.string('contrasena').notNullable();
    table.string('permisos').notNullable();
    table.string('cargos').nullable();
    table.integer('jefatura_id').unsigned().nullable();
    table.integer('gerencia_id').unsigned().nullable();
    table.integer('zona_id').unsigned().nullable().references('id').inTable('zonas');
    table.text('vistas_permitidas').nullable();
    table.boolean('requiere_cambio_clave').defaultTo(false);
    table.boolean('permite_traspaso').defaultTo(false);
    table.text('sync_delta_token').nullable();
    table.datetime('ultima_sincronizacion').nullable();
    table.text('preferencias').nullable();
    table.timestamps(true, true);
  });

  // Self-referencing FKs for usuarios
  await knex.schema.alterTable('usuarios', (table) => {
    table.foreign('jefatura_id').references('id').inTable('usuarios').onDelete('NO ACTION');
    table.foreign('gerencia_id').references('id').inTable('usuarios').onDelete('NO ACTION');
  });

  // 3. Empresas
  await knex.schema.createTable('empresas', (table) => {
    table.increments('id').primary();
    table.string('nombre').notNullable();
    table.integer('jefatura_id').unsigned().nullable().references('id').inTable('usuarios').onDelete('SET NULL');
    table.integer('zona_id').unsigned().defaultTo(1).references('id').inTable('zonas');
    table.string('rut').nullable();
    table.string('razon_social', 300).nullable();
    table.string('estado_seguimiento').defaultTo('pendiente');
    table.date('fecha_concretada').nullable();
    table.date('fecha_solicitada').nullable();
    table.timestamps(true, true);
  });

  // 4. Usuario_Gerencias (N:M)
  await knex.schema.createTable('usuario_gerencias', (table) => {
    table.integer('usuario_id').unsigned().notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
    table.integer('gerencia_id').unsigned().notNullable().references('id').inTable('usuarios').onDelete('NO ACTION');
    table.primary(['usuario_id', 'gerencia_id']);
  });

  // 5. Encuestas: Dimensiones, Templates, Preguntas
  await knex.schema.createTable('encuesta_dimensiones', (table) => {
    table.increments('id').primary();
    table.string('nombre', 100).notNullable();
    table.text('descripcion').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('encuesta_templates', (table) => {
    table.increments('id').primary();
    table.string('nombre', 255).notNullable();
    table.text('descripcion').nullable();
    table.integer('version').defaultTo(1);
    table.integer('activo').defaultTo(1);
    table.timestamps(true, true);
  });

  await knex.schema.createTable('encuesta_catalogo_preguntas', (table) => {
    table.increments('id').primary();
    table.integer('dimension_id').unsigned().nullable().references('id').inTable('encuesta_dimensiones').onDelete('SET NULL');
    table.string('subdimension').nullable();
    table.text('texto').notNullable();
    table.string('tipo').notNullable();
    table.integer('escala').defaultTo(5);
    table.boolean('es_nps').defaultTo(false);
    table.text('opciones_json').nullable();
    table.integer('activo').defaultTo(1);
  });

  await knex.schema.createTable('encuesta_template_preguntas', (table) => {
    table.integer('template_id').unsigned().notNullable().references('id').inTable('encuesta_templates').onDelete('CASCADE');
    table.integer('pregunta_id').unsigned().notNullable().references('id').inTable('encuesta_catalogo_preguntas').onDelete('CASCADE');
    table.integer('orden').defaultTo(0);
    table.boolean('requerida').defaultTo(true);
    table.primary(['template_id', 'pregunta_id']);
  });

  // 6. Encuestas Instancias y Respuestas
  await knex.schema.createTable('encuestas', (table) => {
    table.increments('id').primary();
    table.integer('template_id').unsigned().notNullable().references('id').inTable('encuesta_templates');
    table.integer('empresa_id').unsigned().nullable().references('id').inTable('empresas');
    table.integer('ejecutiva_id').unsigned().nullable().references('id').inTable('usuarios');
    table.string('token', 100).notNullable().unique();
    table.string('estado').defaultTo('pendiente');
    table.integer('reunion_id').nullable();
    table.text('enviado_a').nullable();
    table.boolean('activo').defaultTo(true);
    table.datetime('fecha_creacion').defaultTo(knex.fn.now());
    table.datetime('fecha_respuesta').nullable();
  });

  await knex.schema.createTable('encuesta_respuestas', (table) => {
    table.increments('id').primary(); // BIGINT en el original, pero increments() suele ser int. Usaremos increments para evitar conflictos con referencias int.
    table.integer('encuesta_id').unsigned().notNullable().references('id').inTable('encuestas').onDelete('CASCADE');
    table.integer('pregunta_id').unsigned().notNullable().references('id').inTable('encuesta_catalogo_preguntas');
    table.text('valor_texto').nullable();
    table.decimal('valor_numerico', 10, 2).nullable();
    table.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 7. Empresa: Seguimiento, Dominios, Contactos
  await knex.schema.createTable('empresa_seguimiento_log', (table) => {
    table.increments('id').primary();
    table.integer('empresa_id').unsigned().notNullable().references('id').inTable('empresas').onDelete('CASCADE');
    table.string('estado', 100).notNullable();
    table.date('fecha').nullable();
    table.integer('usuario_id').unsigned().nullable().references('id').inTable('usuarios');
    table.string('reunion_id', 500).nullable();
    table.string('asunto', 255).nullable();
    table.datetime('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('empresa_dominios', (table) => {
    table.increments('id').primary();
    table.integer('empresa_id').unsigned().notNullable().references('id').inTable('empresas').onDelete('CASCADE');
    table.string('dominio', 100).notNullable();
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.unique(['empresa_id', 'dominio']);
  });

  await knex.schema.createTable('empresa_contactos', (table) => {
    table.increments('id').primary();
    table.integer('empresa_id').unsigned().notNullable().references('id').inTable('empresas').onDelete('CASCADE');
    table.string('correo', 255).notNullable();
    table.string('nombre', 255).nullable();
    table.datetime('created_at').defaultTo(knex.fn.now());
    table.unique(['empresa_id', 'correo']);
  });

  // 8. Teams Eventos
  await knex.schema.createTable('teams_eventos', (table) => {
    table.increments('id').primary();
    table.string('event_id', 500).notNullable().unique();
    table.string('ical_uid', 500).nullable();
    table.integer('usuario_id').unsigned().notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
    table.integer('empresa_id').unsigned().nullable().references('id').inTable('empresas').onDelete('SET NULL');
    table.string('asunto', 500).notNullable();
    table.date('fecha').nullable();
    table.time('hora').nullable();
    table.time('hora_fin').nullable();
    table.string('estado').defaultTo('agendada');
    table.boolean('es_online').defaultTo(true);
    table.text('asistentes').nullable(); // JSON
    table.text('join_url').nullable();
    table.datetime('ultima_sync').nullable();
    table.text('organizador').nullable(); // JSON
    table.text('body_preview').nullable();
    table.timestamps(true, true);
  });

  // 9. Minutas
  await knex.schema.createTable('minutas', (table) => {
    table.increments('id').primary();
    table.string('id_minuta', 30).notNullable().unique();
    table.integer('teams_evento_id').unsigned().nullable().references('id').inTable('teams_eventos').onDelete('SET NULL');
    table.integer('ejecutiva_id').unsigned().notNullable().references('id').inTable('usuarios');
    table.integer('empresa_id').unsigned().nullable().references('id').inTable('empresas');
    table.string('tipo_reu', 100).nullable();
    table.text('enviado_a').nullable();
    table.string('enviado_por', 255).nullable();
    table.text('participantes').nullable();
    table.text('motivo_reu').nullable();
    table.text('minuta').nullable();
    table.text('form_f').nullable();
    table.date('fecha_reu').nullable();
    table.string('hora', 10).nullable();
    table.string('lugar', 255).defaultTo('Teams');
    table.text('documentos_adjuntos').nullable();
    table.string('estado_envio').defaultTo('borrador');
    table.text('archivos_nombres').nullable();
    table.boolean('programar_encuesta').defaultTo(false);
    table.string('encuesta_tipo', 100).nullable();
    table.datetime('encuesta_programada_para').nullable();
    table.string('encuesta_estado_envio', 20).defaultTo('pendiente');
    table.boolean('encuesta_relacionada').defaultTo(false);
    table.string('encuesta_destinatario', 255).nullable();
    table.text('texto_previo').nullable();
    table.text('link_video').nullable();
    table.boolean('es_retroactiva').defaultTo(false);
    table.timestamps(true, true);
  });

  // 10. Sync Log
  await knex.schema.createTable('sync_log', (table) => {
    table.increments('id').primary();
    table.string('tipo', 50).notNullable().defaultTo('diaria');
    table.datetime('ejecutado_at').notNullable().defaultTo(knex.fn.now());
    table.text('resultado').nullable();
  });

  // 11. Nuevos Negocios
  await knex.schema.createTable('nuevos_negocios', (table) => {
    table.increments('id').primary();
    table.string('holding', 200).nullable();
    table.string('estado_contacto', 50).notNullable().defaultTo('PROSPECTO');
    table.string('rut', 20).nullable();
    table.string('razon_social', 300).nullable();
    table.string('evento', 200).nullable();
    table.string('indicador', 100).nullable();
    table.string('asistio_evento', 10).defaultTo('No');
    table.string('zona', 50).nullable();
    table.decimal('monto_1_porciento', 15, 2).defaultTo(0);
    table.decimal('tasa_administracion', 5, 4).defaultTo(0);
    table.decimal('monto_administracion', 15, 2).defaultTo(0);
    table.string('otic_actual', 100).nullable();
    table.string('mes_envio_propuesta', 50).nullable();
    table.string('jefa_cartera', 150).nullable();
    table.string('estado', 100).defaultTo('Prospecto');
    table.decimal('aporte_ingresado', 15, 2).defaultTo(0);
    table.string('fecha_autoriza_propuesta', 100).nullable();
    table.string('contacto', 200).nullable();
    table.string('contacto_2', 200).nullable();
    table.string('correo', 300).nullable();
    table.string('cargo', 200).nullable();
    table.string('celular_telefono', 100).nullable();
    table.text('comentarios').nullable();
    table.date('fecha_reunion').nullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable('nuevos_negocios_historial', (table) => {
    table.increments('id').primary();
    table.integer('negocio_id').unsigned().notNullable().references('id').inTable('nuevos_negocios').onDelete('CASCADE');
    table.string('campo_modificado', 50).notNullable();
    table.string('valor_anterior', 200).nullable();
    table.string('valor_nuevo', 200).nullable();
    table.string('usuario', 150).nullable();
    table.datetime('created_at').defaultTo(knex.fn.now());
  });

  // 12. Audit Log
  await knex.schema.createTable('audit_log', (table) => {
    table.increments('id').primary();
    table.string('accion', 100).notNullable();
    table.string('entidad', 50).notNullable();
    table.string('entidad_id', 100).nullable();
    table.integer('usuario_id').unsigned().nullable();
    table.string('usuario_nombre', 255).nullable();
    table.integer('ejecutiva_id').unsigned().nullable();
    table.string('ejecutiva_nombre', 255).nullable();
    table.integer('empresa_id').unsigned().nullable();
    table.string('empresa_nombre', 255).nullable();
    table.text('detalles').nullable(); // JSON
    table.string('ip_address', 45).nullable();
    table.datetime('created_at').defaultTo(knex.fn.now());
    
    table.index('accion');
    table.index('usuario_id');
    table.index(['entidad', 'entidad_id']);
    table.index('created_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('audit_log');
  await knex.schema.dropTableIfExists('nuevos_negocios_historial');
  await knex.schema.dropTableIfExists('nuevos_negocios');
  await knex.schema.dropTableIfExists('sync_log');
  await knex.schema.dropTableIfExists('minutas');
  await knex.schema.dropTableIfExists('teams_eventos');
  await knex.schema.dropTableIfExists('empresa_contactos');
  await knex.schema.dropTableIfExists('empresa_dominios');
  await knex.schema.dropTableIfExists('empresa_seguimiento_log');
  await knex.schema.dropTableIfExists('encuesta_respuestas');
  await knex.schema.dropTableIfExists('encuestas');
  await knex.schema.dropTableIfExists('encuesta_template_preguntas');
  await knex.schema.dropTableIfExists('encuesta_catalogo_preguntas');
  await knex.schema.dropTableIfExists('encuesta_templates');
  await knex.schema.dropTableIfExists('encuesta_dimensiones');
  await knex.schema.dropTableIfExists('usuario_gerencias');
  await knex.schema.dropTableIfExists('empresas');
  await knex.schema.dropTableIfExists('usuarios');
  await knex.schema.dropTableIfExists('zonas');
};

