const { sql } = require("../../database/mssql");
const auditRepository = require("../../database/repositories/audit.repository");

/**
 * GET /admin/audit-log
 * Lista paginada del audit log con filtros.
 */
exports.getAuditLog = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
        const offset = (page - 1) * limit;

        let whereClauses = [];
        let params = [];

        if (req.query.usuario_id) {
            whereClauses.push("a.usuario_id = @usuario_id");
            params.push({ name: 'usuario_id', type: sql.Int, value: parseInt(req.query.usuario_id) });
        }

        if (req.query.entidad) {
            whereClauses.push("a.entidad = @entidad");
            params.push({ name: 'entidad', type: sql.VarChar, value: req.query.entidad });
        }

        if (req.query.accion) {
            whereClauses.push("a.accion = @accion");
            params.push({ name: 'accion', type: sql.VarChar, value: req.query.accion });
        }

        if (req.query.desde) {
            whereClauses.push("a.created_at >= @desde");
            params.push({ name: 'desde', type: sql.VarChar, value: req.query.desde + " 00:00:00" });
        }

        if (req.query.hasta) {
            whereClauses.push("a.created_at <= @hasta");
            params.push({ name: 'hasta', type: sql.VarChar, value: req.query.hasta + " 23:59:59" });
        }

        if (req.query.delegadas === 'true') {
            whereClauses.push("a.usuario_id IS NOT NULL AND a.ejecutiva_id IS NOT NULL AND a.usuario_id != a.ejecutiva_id");
        }

        if (req.query.buscar) {
            const searchTerm = `%\${req.query.buscar}%`;
            whereClauses.push("(a.usuario_nombre LIKE @buscar OR a.ejecutiva_nombre LIKE @buscar OR a.empresa_nombre LIKE @buscar OR a.entidad_id LIKE @buscar)");
            params.push({ name: 'buscar', type: sql.VarChar, value: searchTerm });
        }

        const whereString = whereClauses.length > 0 ? `WHERE \${whereClauses.join(" AND ")}` : "";

        const total = await auditRepository.getAuditLogCount(whereString, params);
        const rows = await auditRepository.getAuditLogData(whereString, params, offset, limit);

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
        const acciones = await auditRepository.getAccionesDisponibles();
        res.json(acciones);
    } catch (err) {
        console.error("Error en getAccionesDisponibles:", err);
        res.status(500).json({ error: "Error obteniendo acciones" });
    }
};
