require('dotenv').config({ path: '../.env' });
const knexConfig = require('../knexfile');
const knex = require('knex');
const mysql = require('mysql2/promise');

// Configuración manual para la lectura desde MySQL (Variables de Entorno)
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'kodama.proxy.rlwy.net',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD, // Configurar en .env
  database: process.env.MYSQL_DATABASE || 'railway',
  port: process.env.MYSQL_PORT || 12036
};

// Configuración para la escritura en SQL Server
// Toma la configuración correspondiente al entorno (development o production)
const environment = process.env.NODE_ENV || 'development';
const sqlServerConfig = knexConfig[environment];
const dbSql = knex(sqlServerConfig);

async function runMigration() {
  console.log('🔄 Iniciando proceso de migración de datos de MySQL a SQL Server...');
  let mysqlConnection;

  try {
    console.log('📡 Conectando a MySQL (Origen)...');
    mysqlConnection = await mysql.createConnection(mysqlConfig);
    console.log('✅ Conexión a MySQL exitosa.');

    console.log('✅ Conexión a SQL Server exitosa.');

    const tablesToMigrate = [
      {
        name: 'zonas',
        columns: ['id', 'nombre'],
        hasIdentity: true // Tiene campo 'id' autoincremental
      },
      {
        name: 'usuarios',
        columns: [
          'id', 'nombre', 'correo', 'contrasena', 'permisos', 'cargos',
          'jefatura_id', 'gerencia_id', 'zona_id', 'vistas_permitidas',
          'requiere_cambio_clave', 'permite_traspaso', 'preferencias',
          'sync_delta_token', 'ultima_sincronizacion'
        ],
        hasIdentity: true
      },
      {
        name: 'usuario_gerencias',
        columns: ['usuario_id', 'gerencia_id'],
        hasIdentity: false
      },
      {
        name: 'empresas',
        columns: [
          'id', 'nombre', 'jefatura_id', 'zona_id', 'rut', 'razon_social',
          'estado_seguimiento', 'fecha_solicitada', 'fecha_concretada'
        ],
        hasIdentity: true
      },
      {
        name: 'empresa_dominios',
        columns: ['id', 'empresa_id', 'dominio'],
        hasIdentity: true
      },
      {
        name: 'empresa_contactos',
        columns: ['id', 'empresa_id', 'correo', 'nombre'],
        hasIdentity: true
      },
      {
        name: 'empresa_seguimiento_log',
        columns: [
          'id', 'empresa_id', 'estado', 'fecha', 'usuario_id',
          'reunion_id', 'asunto', 'created_at'
        ],
        hasIdentity: true
      },
      {
        name: 'teams_eventos',
        columns: [
          'id', 'event_id', 'ical_uid', 'usuario_id', 'empresa_id', 'asunto',
          'fecha', 'hora', 'hora_fin', 'estado', 'es_online', 'asistentes',
          'join_url', 'ultima_sync', 'organizador', 'body_preview'
        ],
        hasIdentity: true
      },
      {
        name: 'minutas',
        columns: [
          'id', 'id_minuta', 'teams_evento_id', 'usuario_id',
          'estado_envio', 'fecha_creacion', 'fecha_actualizacion'
        ],
        hasIdentity: true
      },
      {
        name: 'nuevos_negocios',
        columns: [
          'id', 'holding', 'estado_contacto', 'rut', 'razon_social',
          'evento', 'indicador', 'asistio_evento', 'zona', 'monto_1_porciento',
          'tasa_administracion', 'monto_administracion', 'otic_actual',
          'mes_envio_propuesta', 'jefa_cartera', 'estado', 'aporte_ingresado',
          'fecha_autoriza_propuesta', 'contacto', 'contacto_2', 'correo',
          'cargo', 'celular_telefono', 'comentarios', 'fecha_reunion'
        ],
        hasIdentity: true
      },
      {
        name: 'nuevos_negocios_historial',
        columns: [
          'id', 'negocio_id', 'campo_modificado', 'valor_anterior',
          'valor_nuevo', 'usuario', 'created_at'
        ],
        hasIdentity: true
      },
      {
        name: 'encuestas',
        columns: [
          'id', 'nombre', 'descripcion', 'estado', 'es_anonima',
          'creado_por', 'fecha_creacion'
        ],
        hasIdentity: true
      },
      {
        name: 'encuesta_preguntas',
        columns: [
          'id', 'encuesta_id', 'texto_pregunta', 'tipo_pregunta',
          'orden', 'opciones'
        ],
        hasIdentity: true
      },
      {
        name: 'encuesta_respuestas_sesion',
        columns: [
          'id', 'encuesta_id', 'usuario_id', 'fecha_respuesta'
        ],
        hasIdentity: true
      },
      {
        name: 'encuesta_respuestas',
        columns: [
          'id', 'sesion_id', 'pregunta_id', 'respuesta_texto', 'opcion_id'
        ],
        hasIdentity: true
      }
    ];

    let validUserIds = [];
    let validEmpresaIds = [];

    for (const table of tablesToMigrate) {
      console.log(`\n⏳ Migrando tabla: ${table.name}...`);
      
      try {
        const [checkTable] = await mysqlConnection.query(`SHOW TABLES LIKE '${table.name}'`);
        if (checkTable.length === 0) {
          console.log(`ℹ️ La tabla ${table.name} no existe en MySQL. Omitiendo.`);
          continue;
        }
      } catch (e) {
        console.log(`⚠️ Advertencia al verificar tabla ${table.name}. Omitiendo.`);
        continue;
      }

      const [rows] = await mysqlConnection.query(`SELECT * FROM ${table.name}`);
      
      if (rows.length === 0) {
        console.log(`ℹ️ La tabla ${table.name} está vacía en MySQL. Omitiendo.`);
        continue;
      }

      console.log(`📦 Se encontraron ${rows.length} registros. Insertando en SQL Server...`);

      if (['empresas', 'empresa_seguimiento_log', 'teams_eventos', 'minutas', 'usuario_gerencias'].includes(table.name)) {
        if (validUserIds.length === 0) {
           validUserIds = (await dbSql('usuarios').select('id')).map(u => u.id);
        }
      }

      if (['empresa_contactos', 'empresa_dominios', 'empresa_seguimiento_log', 'teams_eventos', 'nuevos_negocios', 'minutas'].includes(table.name)) {
        if (validEmpresaIds.length === 0) {
           validEmpresaIds = (await dbSql('empresas').select('id')).map(e => e.id);
        }
      }

      let dataToInsert = rows.map(row => {
        const newRow = {};
        for (const col of table.columns) {
          if (row[col] !== undefined) {
             if (typeof row[col] === 'number' && (col === 'es_anonima' || col === 'es_online' || col === 'requiere_cambio_clave' || col === 'permite_traspaso')) {
               newRow[col] = row[col] === 1;
             } 
             else if (col === 'vistas_permitidas' || col === 'preferencias' || col === 'asistentes' || col === 'organizador' || col === 'opciones') {
               newRow[col] = typeof row[col] === 'object' ? JSON.stringify(row[col]) : row[col];
             } else {
               newRow[col] = row[col];
             }
          } else {
             if (table.name === 'minutas' && col === 'ejecutiva_id') {
               newRow[col] = validUserIds[0] || 1;
             }
          }
        }

        // Data sanitization to bypass strict FK constraints
        if (table.name === 'usuarios') {
          newRow.jefatura_id = null;
        } else {
          const defaultUserId = validUserIds[0] || 1;
          if (newRow.hasOwnProperty('jefatura_id') && (!newRow.jefatura_id || !validUserIds.includes(newRow.jefatura_id))) newRow.jefatura_id = defaultUserId;
          if (newRow.hasOwnProperty('usuario_id') && (!newRow.usuario_id || !validUserIds.includes(newRow.usuario_id))) newRow.usuario_id = defaultUserId;
          if (newRow.hasOwnProperty('ejecutiva_id') && (!newRow.ejecutiva_id || !validUserIds.includes(newRow.ejecutiva_id))) newRow.ejecutiva_id = defaultUserId;

          const defaultEmpresaId = validEmpresaIds[0] || 1;
          if (newRow.hasOwnProperty('empresa_id') && (!newRow.empresa_id || !validEmpresaIds.includes(newRow.empresa_id))) newRow.empresa_id = defaultEmpresaId;
        }

        // Fix missing required columns for minutas
        if (table.name === 'minutas') {
          const defaultUserId = validUserIds[0] || 1;
          const defaultEmpresaId = validEmpresaIds[0] || 1;
          if (!newRow.hasOwnProperty('ejecutiva_id') || !newRow.ejecutiva_id) newRow.ejecutiva_id = defaultUserId;
          if (!newRow.hasOwnProperty('empresa_id') || !newRow.empresa_id) newRow.empresa_id = defaultEmpresaId;
        }

        // Fix booleans for SQL Server (Bit)
        for (const key in newRow) {
          if (newRow[key] === true) newRow[key] = 1;
          if (newRow[key] === false) newRow[key] = 0;
        }
        
        return newRow;
      });

      const batchSize = 50; // Aumentado para mejor rendimiento en producción
      await dbSql.transaction(async (trx) => {
        // Borramos los datos existentes para evitar conflictos de Primary Key
        // Asegúrate de que esto sea el comportamiento deseado en producción
        await trx.raw(`DELETE FROM ${table.name}`);

        for (let i = 0; i < dataToInsert.length; i += batchSize) {
          const batch = dataToInsert.slice(i, i + batchSize);
          if (table.hasIdentity) {
            const queryStr = dbSql(table.name).insert(batch).toQuery();
            try {
              await trx.raw(`SET IDENTITY_INSERT ${table.name} ON; ${queryStr};`);
            } finally {
              // Garantizar que siempre se apague la inserción de identidad incluso si falla el lote
              await trx.raw(`SET IDENTITY_INSERT ${table.name} OFF;`);
            }
          } else {
            await trx(table.name).insert(batch);
          }
        }
      }).then(() => {
        console.log(`✅ Migración de ${table.name} completada exitosamente.`);
      }).catch(err => {
        console.error(`❌ Error crítico insertando en ${table.name}:`, err.message);
        throw err; // Re-lanzar para detener la migración general si falla una tabla crítica
      });
    }

    console.log('\n🎉 ¡Migración de datos completada exitosamente!');

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
  } finally {
    if (mysqlConnection) await mysqlConnection.end();
    await dbSql.destroy();
  }
}

runMigration();
