/**
 * Script de diagnóstico: Compara datos de reuniones en la BD local
 * Ejecutar con: node scratch/compare_reuniones.js
 */
const mysql = require('mysql2/promise');

async function main() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'Admin368*',
        database: 'core360'
    });

    console.log('=== DIAGNÓSTICO BD LOCAL ===\n');

    // 1. Total reuniones
    const [totalReuniones] = await db.query('SELECT COUNT(*) as total FROM reuniones');
    console.log(`1. Total reuniones en tabla 'reuniones': ${totalReuniones[0].total}`);

    // 2. Reuniones por estado
    const [porEstado] = await db.query('SELECT estado_envio, COUNT(*) as total FROM reuniones GROUP BY estado_envio ORDER BY total DESC');
    console.log('\n2. Reuniones por estado_envio:');
    porEstado.forEach(r => console.log(`   - ${r.estado_envio || '(null)'}: ${r.total}`));

    // 3. Reuniones con event_id (de Teams) vs sin event_id (manuales)
    const [conEventId] = await db.query('SELECT COUNT(*) as total FROM reuniones WHERE event_id IS NOT NULL');
    const [sinEventId] = await db.query('SELECT COUNT(*) as total FROM reuniones WHERE event_id IS NULL');
    console.log(`\n3. Reuniones con event_id (Teams): ${conEventId[0].total}`);
    console.log(`   Reuniones sin event_id (manuales): ${sinEventId[0].total}`);

    // 4. Reuniones huérfanas
    const [totalHuerfanas] = await db.query('SELECT COUNT(*) as total FROM reuniones_huerfanas');
    const [huerfanasPorEstado] = await db.query('SELECT estado, COUNT(*) as total FROM reuniones_huerfanas GROUP BY estado ORDER BY total DESC');
    console.log(`\n4. Total reuniones_huerfanas: ${totalHuerfanas[0].total}`);
    huerfanasPorEstado.forEach(r => console.log(`   - ${r.estado}: ${r.total}`));

    // 5. Lo que el endpoint /reuniones retornaría para el usuario (Camilo Rivera)
    // Primero buscar el usuario
    const [usuarios] = await db.query("SELECT id, nombre, permisos, jefatura_id FROM usuarios WHERE nombre LIKE '%Camilo%' OR nombre LIKE '%Rivera%' OR correo LIKE '%camilo%'");
    console.log('\n5. Usuario encontrado:');
    usuarios.forEach(u => console.log(`   id=${u.id}, nombre=${u.nombre}, permisos=${u.permisos}, jefatura_id=${u.jefatura_id}`));

    if (usuarios.length > 0) {
        const user = usuarios[0];
        
        // Simular lo que haría buildRoleWhereClause para ejecutiva
        if (user.permisos === 'ejecutiva') {
            const [reunionesUser] = await db.query(`
                SELECT r.id, r.id_reunion, r.ejecutiva_id, r.empresa_id, r.tipo_reu, 
                       r.fecha_reu, r.estado_envio, r.event_id, r.asunto_teams,
                       emp.nombre AS empresa_nombre, e.nombre AS ejecutiva_nombre
                FROM reuniones r
                LEFT JOIN usuarios e ON r.ejecutiva_id = e.id
                LEFT JOIN empresas emp ON r.empresa_id = emp.id
                LEFT JOIN usuarios j ON emp.jefatura_id = j.id
                WHERE (
                    emp.jefatura_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = ?) 
                    OR emp.jefatura_id IN (
                        SELECT gerencia_id FROM usuario_gerencias WHERE usuario_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = ?)
                    )
                    OR r.ejecutiva_id = ?
                )
                ORDER BY r.fecha_reu DESC
            `, [user.id, user.id, user.id]);
            
            console.log(`\n6. Reuniones que retornaría el endpoint para userId=${user.id} (rol=${user.permisos}): ${reunionesUser.length}`);
            
            // Desglose
            const borradores = reunionesUser.filter(r => r.estado_envio === 'borrador');
            const enviadas = reunionesUser.filter(r => r.estado_envio === 'enviado');
            const agendadas = reunionesUser.filter(r => r.estado_envio === 'agendada');
            const noAplica = reunionesUser.filter(r => r.estado_envio === 'no_aplica');
            
            console.log(`   - borradores: ${borradores.length}`);
            console.log(`   - enviadas: ${enviadas.length}`);
            console.log(`   - agendadas: ${agendadas.length}`);
            console.log(`   - no_aplica: ${noAplica.length}`);
            
            // Mostrar las primeras 10
            console.log('\n   Primeras 15 reuniones (más recientes):');
            reunionesUser.slice(0, 15).forEach(r => {
                console.log(`   ${r.fecha_reu ? new Date(r.fecha_reu).toISOString().split('T')[0] : 'null'} | ${r.estado_envio} | empresa_id=${r.empresa_id} | ${r.empresa_nombre || 'SIN EMPRESA'} | ${r.asunto_teams || r.tipo_reu || 'sin asunto'}`);
            });
        }

        // Huérfanas para este usuario
        const [huerfanasUser] = await db.query(`
            SELECT h.id, h.event_id, h.asunto, h.fecha, h.hora, h.estado
            FROM reuniones_huerfanas h
            JOIN usuarios u ON h.usuario_id = u.id
            WHERE (
                u.jefatura_id = (SELECT COALESCE(jefatura_id, id) FROM usuarios WHERE id = ?) 
                OR h.usuario_id = ?
            )
            AND h.estado IN ('pendiente', 'no_aplica')
            ORDER BY h.fecha DESC
        `, [user.id, user.id]);
        
        console.log(`\n7. Huérfanas para el usuario (pendientes + no_aplica): ${huerfanasUser.length}`);
        huerfanasUser.slice(0, 10).forEach(r => {
            console.log(`   ${r.fecha} | ${r.estado} | ${r.asunto}`);
        });
    }

    // 8. Empresas totales
    const [totalEmpresas] = await db.query('SELECT COUNT(*) as total FROM empresas');
    console.log(`\n8. Total empresas: ${totalEmpresas[0].total}`);

    // 9. Jefaturas
    const [totalJefaturas] = await db.query("SELECT COUNT(*) as total FROM usuarios WHERE permisos = 'jefatura'");
    console.log(`9. Total jefaturas: ${totalJefaturas[0].total}`);

    // 10. Empresa dominios y contactos
    const [totalDominios] = await db.query('SELECT COUNT(*) as total FROM empresa_dominios');
    const [totalContactos] = await db.query('SELECT COUNT(*) as total FROM empresa_contactos');
    console.log(`10. Dominios aprendidos: ${totalDominios[0].total}`);
    console.log(`    Contactos aprendidos: ${totalContactos[0].total}`);

    // 11. Encuestas
    const [totalEncuestas] = await db.query('SELECT COUNT(*) as total FROM encuestas');
    console.log(`\n11. Encuestas: ${totalEncuestas[0].total}`);

    // 12. Logs de seguimiento
    const [logsPorEstado] = await db.query('SELECT estado, COUNT(*) as total FROM empresa_seguimiento_log GROUP BY estado ORDER BY total DESC');
    console.log('\n12. Logs de seguimiento por estado:');
    logsPorEstado.forEach(r => console.log(`    - ${r.estado}: ${r.total}`));

    await db.end();
    console.log('\n=== FIN DIAGNÓSTICO ===');
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
