const db = require("../../database/connection");

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

        let whereClause = "WHERE 1=1";
        const params = [];

        if (req.query.usuario_id) {
            whereClause += " AND a.usuario_id = ?";
            params.push(parseInt(req.query.usuario_id));
        }

        if (req.query.entidad) {
            whereClause += " AND a.entidad = ?";
            params.push(req.query.entidad);
        }

        if (req.query.accion) {
            whereClause += " AND a.accion = ?";
            params.push(req.query.accion);
        }

        if (req.query.desde) {
            whereClause += " AND a.created_at >= ?";
            params.push(req.query.desde + " 00:00:00");
        }

        if (req.query.hasta) {
            whereClause += " AND a.created_at <= ?";
            params.push(req.query.hasta + " 23:59:59");
        }

        if (req.query.delegadas === 'true') {
            whereClause += " AND a.usuario_id IS NOT NULL AND a.ejecutiva_id IS NOT NULL AND a.usuario_id != a.ejecutiva_id";
        }

        if (req.query.buscar) {
            whereClause += " AND (a.usuario_nombre LIKE ? OR a.ejecutiva_nombre LIKE ? OR a.empresa_nombre LIKE ? OR a.entidad_id LIKE ?)";
            const searchTerm = `%${req.query.buscar}%`;
            params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        }

        // Total count
        const [countResult] = await db.query(
            `SELECT COUNT(*) as total FROM audit_log a ${whereClause}`,
            params
        );
        const total = countResult[0].total;

        // Paginated results
        const [rows] = await db.query(
            `SELECT a.* FROM audit_log a ${whereClause} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

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
        const [rows] = await db.query(
            "SELECT DISTINCT accion FROM audit_log ORDER BY accion ASC"
        );
        res.json(rows.map(r => r.accion));
    } catch (err) {
        console.error("Error en getAccionesDisponibles:", err);
        res.status(500).json({ error: "Error obteniendo acciones" });
    }
};
