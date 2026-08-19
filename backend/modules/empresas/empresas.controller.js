const empresasRepository = require("../../database/repositories/empresas.repository");

exports.listarEmpresas = async (req, res) => {
  try {
    let { gerencia_id, jefatura_id, global } = req.query;
    
    if (global !== 'true' && req.usuario && req.usuario.permisos !== 'admin' && req.usuario.permisos !== 'ADMIN') {
      if (req.usuario.permisos === 'gerencia') {
        gerencia_id = req.usuario.id;
      } else if (req.usuario.permisos === 'jefatura') {
        jefatura_id = req.usuario.id;
      } else if (req.usuario.permisos === 'ejecutiva') {
        if (req.usuario.jefatura_id !== undefined && req.usuario.jefatura_id !== null) {
          jefatura_id = req.usuario.jefatura_id;
        } else {
          // Get jefatura from db
          const { getUsuarioById } = require("../../database/repositories/usuarios.repository");
          const userRow = await getUsuarioById(req.usuario.id);
          jefatura_id = userRow?.jefatura_id || -1;
        }
      }
    }

    const rows = await empresasRepository.getEmpresasWithFilters(gerencia_id, jefatura_id);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.obtenerEmpresasPorEjecutiva = async (req, res) => {
  try {
    const { id_ejecutiva } = req.params;
    const rows = await empresasRepository.getEmpresasPorEjecutiva(id_ejecutiva);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.obtenerEmpresasPorJefatura = async (req, res) => {
  try {
    const { id_jefatura } = req.params;
    const rows = await empresasRepository.getEmpresasPorJefatura(id_jefatura);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.actualizarEmpresa = async (req, res) => {
  const { id } = req.params;
  const { nombre, jefatura_id, zona_id } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    await empresasRepository.updateEmpresa(id, { nombre, jefatura_id: jefatura_id || null, zona_id: zona_id || null });
    res.json({ msg: "Actualizada" });
  } catch (err) {
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.actualizarEstadoEmpresa = async (req, res) => {
  const { id } = req.params;
  const { estado_seguimiento, fecha, usuario_id } = req.body;
  try {
    let updateData = { estado_seguimiento };
    const fechaVal = fecha || new Date().toISOString().split('T')[0];

    if (estado_seguimiento === 'solicitada') {
      updateData.fecha_solicitada = fechaVal;
      updateData.fecha_concretada = null;
      await empresasRepository.updateEmpresa(id, updateData);
      await empresasRepository.insertEmpresaSeguimientoLog({
        empresa_id: id, estado: 'solicitada', fecha: fechaVal, usuario_id: usuario_id || null
      });
    } else if (estado_seguimiento === 'agendada') {
      const current = await empresasRepository.getEmpresaFechaSeguimiento(id);
      updateData.fecha_solicitada = current?.fecha_solicitada || fechaVal;
      updateData.fecha_concretada = fechaVal;
      await empresasRepository.updateEmpresa(id, updateData);
      await empresasRepository.insertEmpresaSeguimientoLog({
        empresa_id: id, estado: 'agendada', fecha: fechaVal, usuario_id: usuario_id || null
      });
    } else if (estado_seguimiento === 'pendiente') {
      updateData.fecha_solicitada = null;
      updateData.fecha_concretada = null;
      await empresasRepository.updateEmpresa(id, updateData);
    }

    const updatedEmp = await empresasRepository.getEmpresaFechaSeguimiento(id);
    const historial = await empresasRepository.getHistorialSeguimiento(id);
    
    res.json({ 
      msg: "Estado actualizado", 
      fecha_solicitada: updatedEmp ? updatedEmp.fecha_solicitada : null, 
      fecha_concretada: updatedEmp ? updatedEmp.fecha_concretada : null,
      historial
    });
  } catch (err) {
    console.error("Error actualizando estado empresa:", err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.eliminarSeguimientoLog = async (req, res) => {
  const { id } = req.params;
  try {
    await empresasRepository.deleteSeguimientoLog(id);
    res.json({ msg: "Log de seguimiento eliminado" });
  } catch (err) {
    console.error("Error eliminando log de seguimiento:", err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.actualizarLogSeguimiento = async (req, res) => {
  const { reunionId, logIds, estado, fecha } = req.body;
  if (!logIds && !reunionId) {
    return res.status(400).json({ error: "Faltan parámetros de identificación" });
  }
  try {
    const ids = logIds ? logIds.split(',').filter(id => id.trim()) : [];
    
    if (reunionId) {
      await empresasRepository.updateLogSeguimientoByReunion(reunionId, {
        estado,
        fecha: fecha ? fecha : undefined // knex will ignore undefined
      });
    }
    
    if (ids.length > 0) {
      await empresasRepository.updateLogSeguimientoByIds(ids, {
        estado,
        fecha: fecha ? fecha : undefined
      });
    }
    
    res.json({ msg: "Eventos de seguimiento actualizados exitosamente" });
  } catch (err) {
    console.error("Error actualizando logs de seguimiento:", err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.obtenerHistorialSeguimiento = async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await empresasRepository.getHistorialSeguimiento(id);
    res.json(rows);
  } catch (err) {
    console.error("Error obteniendo historial:", err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.obtenerLogsEmpresas = async (req, res) => {
  try {
    const { periodo, anio } = req.query;
    const rows = await empresasRepository.getLogsEmpresasFilter(periodo, anio);
    res.json(rows);
  } catch (err) {
    console.error("Error obteniendo logs:", err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.crearEmpresa = async (req, res) => {
  const { nombre, jefatura_id, zona_id } = req.body;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });
  try {
    const insertId = await empresasRepository.insertEmpresa({
      nombre, 
      jefatura_id: jefatura_id || null, 
      zona_id: zona_id || null, 
      estado_seguimiento: 'pendiente'
    });
    res.json({ id: insertId, msg: "Empresa creada exitosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.eliminarEmpresa = async (req, res) => {
  const { id } = req.params;
  try {
    await empresasRepository.deleteEmpresa(id);
    res.json({ msg: "Empresa eliminada exitosamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.traspasoMasivo = async (req, res) => {
  const { source_jefatura_id, target_jefatura_id, empresa_ids } = req.body;
  if (!target_jefatura_id) {
    return res.status(400).json({ error: "Jefatura de destino requerida" });
  }
  try {
    if ((empresa_ids && empresa_ids.length > 0) || source_jefatura_id) {
      await empresasRepository.updateEmpresasJefatura(target_jefatura_id, source_jefatura_id, empresa_ids);
      res.json({ msg: "Traspaso masivo realizado con éxito" });
    } else {
      return res.status(400).json({ error: "Debe especificar empresa_ids o source_jefatura_id" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.cargaMasivaEmpresas = async (req, res) => {
  const { empresas } = req.body;
  if (!empresas || !Array.isArray(empresas) || empresas.length === 0) {
    return res.status(400).json({ error: "No se proporcionaron empresas para procesar." });
  }

  try {
    const zonas = await empresasRepository.getZonasAll();
    const usuarios = await empresasRepository.getUsuariosBasic();
    const empresasExistentes = await empresasRepository.getEmpresasNombres();
    
    const zonasMap = new Map();
    zonas.forEach(z => zonasMap.set(z.nombre.toLowerCase().trim(), z.id));
    
    const usuariosMap = new Map();
    usuarios.forEach(u => {
      usuariosMap.set(u.nombre.toLowerCase().trim(), u.id);
      usuariosMap.set(u.correo.toLowerCase().trim(), u.id);
    });

    const empresasSet = new Set(empresasExistentes.map(e => e.nombre.toLowerCase().trim()));

    const exitosos = [];
    const errores = [];

    for (const item of empresas) {
      const nombreEmpresa = item.empresa ? String(item.empresa).trim() : "";
      const ejecutiva = item.ejecutiva ? String(item.ejecutiva).trim() : "";
      const zona = item.zona_regional ? String(item.zona_regional).trim() : "";

      if (!nombreEmpresa) {
        errores.push({ fila: item, error: "Falta el nombre de la empresa" });
        continue;
      }
      
      if (empresasSet.has(nombreEmpresa.toLowerCase())) {
        errores.push({ fila: item, error: "La empresa ya existe en la base de datos" });
        continue;
      }

      let jefatura_id = null;
      if (ejecutiva) {
        if (usuariosMap.has(ejecutiva.toLowerCase())) {
          jefatura_id = usuariosMap.get(ejecutiva.toLowerCase());
        } else {
          errores.push({ fila: item, error: `No se encontró coincidencia para ejecutiva: ${ejecutiva}` });
          continue;
        }
      }

      let zona_id = null;
      if (zona) {
        if (zonasMap.has(zona.toLowerCase())) {
          zona_id = zonasMap.get(zona.toLowerCase());
        } else {
          errores.push({ fila: item, error: `No se encontró coincidencia para zona: ${zona}` });
          continue;
        }
      }

      exitosos.push({
        nombre: nombreEmpresa,
        jefatura_id,
        zona_id,
        estado_seguimiento: 'pendiente'
      });
      empresasSet.add(nombreEmpresa.toLowerCase());
    }

    let insertados = 0;
    if (exitosos.length > 0) {
      await empresasRepository.insertEmpresasBatch(exitosos);
      insertados = exitosos.length;
    }

    res.json({
      msg: "Proceso completado",
      resumen: {
        totalProcesados: empresas.length,
        insertados,
        conErrores: errores.length
      },
      errores
    });

  } catch (err) {
    console.error("Error en carga masiva de empresas:", err);
    res.status(500).json({ error: "Error interno procesando la carga masiva" });
  }
};

exports.traspasoExcel = async (req, res) => {
  const { traspasos } = req.body;
  if (!traspasos || !Array.isArray(traspasos)) {
    return res.status(400).json({ error: "Datos de traspaso inválidos" });
  }
  
  try {
    await empresasRepository.traspasoExcel(traspasos);
    res.json({ msg: "Traspaso por Excel completado con éxito" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error en la BD al procesar el Excel" });
  }
};

exports.obtenerUsuariosAsignados = async (req, res) => {
  const { id } = req.params;
  try {
    const empresa = await empresasRepository.getJefaturaEmpresa(id);
    
    if (!empresa || !empresa.jefatura_id) {
      return res.json([]);
    }
    
    const usuarios = await empresasRepository.getUsuariosAsignados(empresa.jefatura_id);
    res.json(usuarios);
  } catch (err) {
    console.error("Error obteniendo usuarios asignados a la empresa:", err);
    res.status(500).json({ error: "Error en la BD" });
  }
};

exports.obtenerVinculaciones = async (req, res) => {
  try {
    const empresas = await empresasRepository.getVinculacionesEmpresas();
    const dominios = await empresasRepository.getEmpresaDominios();
    const contactos = await empresasRepository.getEmpresaContactos();

    const map = {};
    empresas.forEach(emp => {
      map[emp.id] = {
        ...emp,
        dominios: [],
        contactos: []
      };
    });

    dominios.forEach(dom => {
      if (map[dom.empresa_id]) {
        map[dom.empresa_id].dominios.push(dom.dominio);
      }
    });

    contactos.forEach(cont => {
      if (map[cont.empresa_id]) {
        map[cont.empresa_id].contactos.push({
          id: cont.id,
          nombre: cont.nombre,
          correo: cont.correo
        });
      }
    });

    res.json(Object.values(map));
  } catch (err) {
    console.error("Error obteniendo vinculaciones:", err);
    res.status(500).json({ error: "Error al obtener vinculaciones de la BD" });
  }
};

exports.actualizarVinculaciones = async (req, res) => {
  const { id } = req.params;
  const { jefatura_id, dominios, contactos, nombre, zona_id } = req.body;

  try {
    await empresasRepository.actualizarVinculaciones(id, jefatura_id, dominios, contactos, nombre, zona_id);
    res.json({ success: true, message: "Vinculaciones actualizadas con éxito" });
  } catch (err) {
    if (err.message === "Empresa no encontrada") {
      return res.status(404).json({ error: err.message });
    }
    console.error("Error actualizando vinculaciones:", err);
    res.status(500).json({ error: "Error interno al actualizar vinculaciones" });
  }
};
