import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import api from "../services/api";

export default function GestionEjecutivas() {
  const [ejecutivas, setEjecutivas] = useState([]);
  const [jefaturas, setJefaturas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroJefatura, setFiltroJefatura] = useState("");
  
  // Estados de visibilidad (Colapsables)
  const [showJefaturas, setShowJefaturas] = useState(true);
  const [showEjecutivas, setShowEjecutivas] = useState(true);
  const [showEmpresas, setShowEmpresas] = useState(true);

  const ejecutivasFiltradas = ejecutivas
    .filter(e => filtroJefatura ? e.jefatura_id === Number(filtroJefatura) : true);

  const empresasFiltradas = empresas
    .filter(emp => filtroJefatura ? emp.jefatura_id === Number(filtroJefatura) : true);

  const fetchDatos = async () => {
    setLoading(true);
    try {
      const resE = await api.get("/ejecutivas");
      setEjecutivas(resE.data || []);

      const resJ = await api.get("/jefaturas");
      setJefaturas(resJ.data || []);

      const resEmp = await api.get("/empresas");
      setEmpresas(resEmp.data || []);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Error al cargar datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatos();
  }, []);

  const crearJefatura = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Nueva Jefatura",
      showCancelButton: true,
      html: `
        <input id="swal-input1" class="swal2-input" placeholder="Nombre" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
        <input id="swal-input2" class="swal2-input" placeholder="Correo" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
      `,
      focusConfirm: false,
      preConfirm: () => {
        return {
          nombre: document.getElementById("swal-input1").value,
          correo: document.getElementById("swal-input2").value
        };
      }
    });

    if (formValues && formValues.nombre) {
      try {
        await api.post("/jefaturas", formValues);
        Swal.fire("Creado", "Jefatura creada", "success");
        fetchDatos();
      } catch (e) {
        Swal.fire("Error", "Error al crear", "error");
      }
    }
  };

  const editarJefatura = async (jefatura) => {
    const { value: formValues } = await Swal.fire({
      title: "Editar Jefatura",
      showCancelButton: true,
      html: `
        <input id="swal-input1" class="swal2-input" placeholder="Nombre" value="${jefatura.nombre}" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
        <input id="swal-input2" class="swal2-input" placeholder="Correo" value="${jefatura.correo || ''}" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
      `,
      focusConfirm: false,
      preConfirm: () => {
        return {
          nombre: document.getElementById("swal-input1").value,
          correo: document.getElementById("swal-input2").value
        };
      }
    });

    if (formValues && formValues.nombre) {
      try {
        await api.put("/jefaturas/" + jefatura.id, formValues);
        Swal.fire("Actualizado", "Jefatura editada", "success");
        fetchDatos();
      } catch (e) {
        Swal.fire("Error", "Error al editar", "error");
      }
    }
  };

  const crearEjecutiva = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Nueva Ejecutiva",
      showCancelButton: true,
      html: `
        <input id="swal-input1" class="swal2-input" placeholder="Nombre" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
        <input id="swal-input2" class="swal2-input" placeholder="Correo" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
        <select id="swal-input3" class="swal2-select" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
          <option value="">Sin jefatura</option>
          ${jefaturas.map(j => `<option value="${j.id}">${j.nombre}</option>`).join("")}
        </select>
      `,
      focusConfirm: false,
      preConfirm: () => {
        return {
          nombre: document.getElementById("swal-input1").value,
          correo: document.getElementById("swal-input2").value,
          jefatura_id: document.getElementById("swal-input3").value || null
        };
      }
    });

    if (formValues && formValues.nombre) {
      try {
        await api.post("/ejecutivas", formValues);
        Swal.fire("Creado", "Ejecutiva creada", "success");
        fetchDatos();
      } catch (e) {
        Swal.fire("Error", "Error al crear", "error");
      }
    }
  };

  const editarEjecutiva = async (ejecutiva) => {
    const { value: formValues } = await Swal.fire({
      title: "Editar Ejecutiva",
      showCancelButton: true,
      html: `
        <input id="swal-input1" class="swal2-input" placeholder="Nombre" value="${ejecutiva.nombre}" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
        <input id="swal-input2" class="swal2-input" placeholder="Correo" value="${ejecutiva.correo || ''}" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
        <select id="swal-input3" class="swal2-select" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
          <option value="">Sin jefatura</option>
          ${jefaturas.map(j => `<option value="${j.id}" ${ejecutiva.jefatura_id === j.id ? 'selected' : ''}>${j.nombre}</option>`).join("")}
        </select>
      `,
      focusConfirm: false,
      preConfirm: () => {
        return {
          nombre: document.getElementById("swal-input1").value,
          correo: document.getElementById("swal-input2").value,
          jefatura_id: document.getElementById("swal-input3").value || null
        };
      }
    });

    if (formValues && formValues.nombre) {
      try {
        await api.put("/ejecutivas/" + ejecutiva.id, formValues);
        Swal.fire("Actualizado", "Ejecutiva editada", "success");
        fetchDatos();
      } catch (e) {
        Swal.fire("Error", "Error al editar", "error");
      }
    }
  };

  const editarEmpresa = async (empresa) => {
    const { value: formValues } = await Swal.fire({
      title: "Editar Empresa",
      showCancelButton: true,
      html: `
        <div style="margin-bottom:10px;"><strong>Empresa:</strong> ${empresa.nombre}</div>
        <select id="swal-input-emp" class="swal2-select" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
          <option value="">Sin jefatura</option>
          ${jefaturas.map(j => `<option value="${j.id}" ${empresa.jefatura_id === j.id ? 'selected' : ''}>${j.nombre}</option>`).join("")}
        </select>
      `,
      focusConfirm: false,
      preConfirm: () => {
        return {
          jefatura_id: document.getElementById("swal-input-emp").value || null
        };
      }
    });

    if (formValues) {
      try {
        await api.put("/empresas/" + empresa.id, formValues);
        Swal.fire("Actualizado", "Empresa reasignada", "success");
        fetchDatos();
      } catch (e) {
        Swal.fire("Error", "Error al editar", "error");
      }
    }
  };

  const eliminarJefatura = async (id) => {
    if (await confirmDelete()) {
      try {
        await api.delete("/jefaturas/" + id);
        fetchDatos();
      } catch (e) {
        Swal.fire("Error", "No se pudo eliminar", "error");
      }
    }
  };

  const eliminarEjecutiva = async (id) => {
    if (await confirmDelete()) {
      try {
        await api.delete("/ejecutivas/" + id);
        fetchDatos();
      } catch (e) {
        Swal.fire("Error", "No se pudo eliminar", "error");
      }
    }
  };

  const confirmDelete = async () => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: "No podrás revertir esto",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar'
    });
    return result.isConfirmed;
  };

  if (loading) return <div style={{ padding: 20 }}>Cargando...</div>;

  return (
    <div className="container">
      <h1 style={{ fontSize: "2rem", marginBottom: "30px", color: "#1e293b" }}>Gestión de Personal</h1>

      {/* SECCIÓN SUPERIOR: Jefaturas y Ejecutivas */}
      <div style={{ display: "flex", flexDirection: "column", gap: "30px", marginBottom: "30px" }}>
        
        {/* PANEL JEFATURAS */}
        <div style={{ background: "white", borderRadius: "10px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
          <div 
            onClick={() => setShowJefaturas(!showJefaturas)}
            style={{ 
              display: "flex", justifyContent: "space-between", alignItems: "center", 
              padding: "20px", background: "#f8fafc", cursor: "pointer",
              borderBottom: showJefaturas ? "1px solid #e2e8f0" : "none"
            }}
          >
            <h2 style={{ margin: 0, color: "#334155", fontSize: "1.2rem" }}>
              {showJefaturas ? "▼" : "▶"} Jefaturas
            </h2>
            <button 
              onClick={(e) => { e.stopPropagation(); crearJefatura(); }} 
              style={{ background: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}
            >
              + Añadir
            </button>
          </div>
          
          {showJefaturas && (
            <div style={{ padding: "20px", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "8px", whiteSpace: "nowrap" }}>NOMBRE</th>
                    <th style={{ padding: "8px", whiteSpace: "nowrap" }}>CORREO</th>
                    <th style={{ padding: "8px", whiteSpace: "nowrap" }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {(filtroJefatura ? jefaturas.filter(j => j.id === Number(filtroJefatura)) : jefaturas).map(j => (
                    <tr key={j.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{j.nombre}</td>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{j.correo}</td>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                        <button onClick={() => editarJefatura(j)} style={{ color: "#3b82f6", background: "none", border: "none", cursor: "pointer", marginRight: "10px", fontSize: "12px" }}>Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* PANEL EJECUTIVAS */}
        <div style={{ background: "white", borderRadius: "10px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
          <div 
            onClick={() => setShowEjecutivas(!showEjecutivas)}
            style={{ 
              display: "flex", justifyContent: "space-between", alignItems: "center", 
              padding: "20px", background: "#f8fafc", cursor: "pointer",
              borderBottom: showEjecutivas ? "1px solid #e2e8f0" : "none"
            }}
          >
            <h2 style={{ margin: 0, color: "#334155", fontSize: "1.2rem" }}>
              {showEjecutivas ? "▼" : "▶"} Ejecutivas
            </h2>
            <button 
              onClick={(e) => { e.stopPropagation(); crearEjecutiva(); }} 
              style={{ background: "#3b82f6", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}
            >
              + Añadir
            </button>
          </div>

          {showEjecutivas && (
            <div style={{ padding: "20px", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "8px", whiteSpace: "nowrap" }}>NOMBRE</th>
                    <th style={{ padding: "8px", whiteSpace: "nowrap" }}>CORREO</th>
                    <th style={{ padding: "8px", whiteSpace: "nowrap" }}>JEFATURA</th>
                    <th style={{ padding: "8px", whiteSpace: "nowrap" }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {ejecutivasFiltradas.map(e => (
                    <tr key={e.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{e.nombre}</td>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{e.correo}</td>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{e.jefatura_nombre || "-"}</td>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                        <button onClick={() => editarEjecutiva(e)} style={{ color: "#3b82f6", background: "none", border: "none", cursor: "pointer", marginRight: "10px", fontSize: "12px" }}>Editar</button>
                        <button onClick={() => eliminarEjecutiva(e.id)} style={{ color: "red", background: "none", border: "none", cursor: "pointer", fontSize: "12px" }}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN INFERIOR: Empresas */}
      <div style={{ background: "white", borderRadius: "10px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", overflow: "hidden" }}>
        <div 
          onClick={() => setShowEmpresas(!showEmpresas)}
          style={{ 
            display: "flex", justifyContent: "space-between", alignItems: "center", 
            padding: "20px", background: "#f8fafc", cursor: "pointer",
            borderBottom: showEmpresas ? "1px solid #e2e8f0" : "none"
          }}
        >
          <h2 style={{ margin: 0, color: "#334155", fontSize: "1.2rem" }}>
            {showEmpresas ? "▼" : "▶"} Empresas
          </h2>
        </div>
        
        {showEmpresas && (
          <div style={{ padding: "20px" }}>
            
            {/* FILTROS INTEGRADOS */}
            <div style={{ 
              display: "flex", gap: "20px", alignItems: "center", 
              padding: "15px", background: "#f1f5f9", borderRadius: "8px", 
              marginBottom: "20px" 
            }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#475569", marginBottom: "5px" }}>Filtrar por Jefatura:</label>
                <select 
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px" }}
                  value={filtroJefatura} 
                  onChange={(e) => setFiltroJefatura(e.target.value)}
                >
                  <option value="">Todas las Jefaturas</option>
                  {jefaturas.map(j => (
                    <option key={j.id} value={j.id}>{j.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left" }}>
                    <th style={{ padding: "8px", whiteSpace: "nowrap" }}>NOMBRE EMPRESA</th>
                    <th style={{ padding: "8px", whiteSpace: "nowrap" }}>JEFATURA</th>
                    <th style={{ padding: "8px", whiteSpace: "nowrap" }}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {empresasFiltradas.map(emp => (
                    <tr key={emp.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{emp.nombre}</td>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{emp.jefatura_nombre || "-"}</td>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>
                        <button onClick={() => editarEmpresa(emp)} style={{ color: "#3b82f6", background: "none", border: "none", cursor: "pointer", marginRight: "10px", fontSize: "12px" }}>Editar Jefatura</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
