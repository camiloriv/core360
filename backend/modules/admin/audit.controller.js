const db = require("../../database/knex");

/**
 * GET /admin/audit-log
 * Lista paginada del audit log con filtros.
 * 
 * Query params:
 *   - page (default: 1)
 *   - limit (default: 50, max: 200)
 *   - usuario_id — Filtrar por usuario que ejecutó la acción
 *   - entidad — Filtrar por tipo: 'minuta', 'reunion', 'encuesta'
 *   - accion — Filtrar por acción específica
 *   - desde — Fecha inicio (YYYY-MM-DD)
 *   - hasta — Fecha fin (YYYY-MM-DD)
 *   - delegadas — 'true' para solo acciones donde usuario ≠ ejecutiva
 *   - buscar — Búsqueda libre en nombre de usuario, ejecutiva, empresa o entidad_id
 */
exports.getAuditLog = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
        const offset = (page - 1) * limit;

        const baseQuery = db('audit_log as a');

        if (req.query.usuario_id) {
            baseQuery.where('a.usuario_id', parseInt(req.query.usuario_id));
        }

        if (req.query.entidad) {
            baseQuery.where('a.entidad', req.query.entidad);
        }

        if (req.query.accion) {
            baseQuery.where('a.accion', req.query.accion);
        }

        if (req.query.desde) {
            baseQuery.where('a.created_at', '>=', req.query.desde + " 00:00:00");
        }

        if (req.query.hasta) {
            baseQuery.where('a.created_at', '<=', req.query.hasta + " 23:59:59");
        }

        if (req.query.delegadas === 'true') {
            baseQuery.whereNotNull('a.usuario_id')
                     .whereNotNull('a.ejecutiva_id')
                     .whereRaw('a.usuario_id != a.ejecutiva_id');
        }

        if (req.query.buscar) {
            const searchTerm = `%${req.query.buscar}%`;
            baseQuery.where(function() {
                this.where('a.usuario_nombre', 'LIKE', searchTerm)
                    .orWhere('a.ejecutiva_nombre', 'LIKE', searchTerm)
                    .orWhere('a.empresa_nombre', 'LIKE', searchTerm)
                    .orWhere('a.entidad_id', 'LIKE', searchTerm);
            });
        }

        // Total count
        const countResult = await baseQuery.clone().count('* as total').first();
        const total = countResult?.total || 0;

        // Paginated results
        const rows = await baseQuery.clone().orderBy('a.created_at', 'desc').limit(limit).offset(offset);

        // Parse detalles JSON for each row
        const parsedRows = rows.map(row => ({
            ...row,
            detalles: typeof row.detalles === 'string' ? JSON.parse(row.detalles) : row.detalles
        }));

        res.json({
            data: parsedRows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error("Error en getAuditLog:", err);
        res.status(500).json({ error: "Error obteniendo audit log" });
    }
};

/**
 * GET /admin/audit-log/acciones
 * Obtiene la lista de acciones distintas registradas (para filtros del frontend).
 */
exports.getAccionesDisponibles = async (req, res) => {
    try {
        const rows = await db('audit_log').distinct('accion').orderBy('accion', 'asc');
        res.json(rows.map(r => r.accion));
    } catch (err) {
        console.error("Error en getAccionesDisponibles:", err);
        res.status(500).json({ error: "Error obteniendo acciones" });
    }
};
