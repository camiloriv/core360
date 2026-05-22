import React, { useState, useEffect } from "react";
import Swal from "sweetalert2";
import api from "../services/api";
import * as XLSX from "xlsx";
import "../styles/agoras-theme.css";

export default function GestionEmpresas() {
  const [ejecutivas, setEjecutivas] = useState([]);
  const [jefaturas, setJefaturas] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de visibilidad (Colapsables)
  const [showTraspaso, setShowTraspaso] = useState(true);

  // Estados para Traspaso Masivo
  const [traspasoOrigen, setTraspasoOrigen] = useState("");
  const [traspasoDestino, setTraspasoDestino] = useState("");
  const [empresasTraspaso, setEmpresasTraspaso] = useState([]);
  const [selectedEmpresas, setSelectedEmpresas] = useState([]);

  // Estados para Traspaso por Excel
  const [traspasoTab, setTraspasoTab] = useState("manual"); // 'manual' o 'excel'
  const [excelFile, setExcelFile] = useState(null);
  const [excelRows, setExcelRows] = useState([]);
  const [procesandoExcel, setProcesandoExcel] = useState(false);



  const fetchDatos = async () => {
    setLoading(true);
    try {
      const resE = await api.get("/ejecutivas");
      setEjecutivas(resE.data || []);

      const resJ = await api.get("/jefaturas");
      setJefaturas(resJ.data || []);

      const resEmp = await api.get("/empresas");
      setEmpresas(resEmp.data || []);

      const resZonas = await api.get("/zonas");
      setZonas(resZonas.data || []);
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

  // Cargar empresas de origen al cambiar el selector en Traspaso Masivo
  useEffect(() => {
    if (traspasoOrigen) {
      const filtered = empresas.filter(emp => emp.jefatura_id === Number(traspasoOrigen));
      setEmpresasTraspaso(filtered);
      setSelectedEmpresas([]); // Reiniciar seleccionados
    } else {
      setEmpresasTraspaso([]);
      setSelectedEmpresas([]);
    }
  }, [traspasoOrigen, empresas]);

  // Obtener nombres de ejecutivas de una jefatura para los labels del selector
  const getEjecutivasNombres = (jefaturaId) => {
    const nombres = ejecutivas
      .filter(e => e.jefatura_id === jefaturaId)
      .map(e => e.nombre);
    return nombres.length > 0 ? ` (Ejecutivas: ${nombres.join(", ")})` : " (Sin ejecutivas)";
  };

  // --- CRUD Jefaturas ---
  const crearJefatura = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Nueva Jefatura",
      showCancelButton: true,
      html: `
        <input id="swal-input1" class="swal2-input" placeholder="Nombre" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
        <input id="swal-input2" class="swal2-input" placeholder="Correo" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
        <input id="swal-input-pass" class="swal2-input" placeholder="Contraseña de acceso" type="text" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
      `,
      focusConfirm: false,
      preConfirm: () => {
        return {
          nombre: document.getElementById("swal-input1").value,
          correo: document.getElementById("swal-input2").value,
          contrasena: document.getElementById("swal-input-pass").value
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
        <input id="swal-input-pass" class="swal2-input" placeholder="Nueva Contraseña (opcional)" type="text" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
      `,
      focusConfirm: false,
      preConfirm: () => {
        return {
          nombre: document.getElementById("swal-input1").value,
          correo: document.getElementById("swal-input2").value,
          contrasena: document.getElementById("swal-input-pass").value
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

  const eliminarJefatura = async (id) => {
    if (await confirmDelete()) {
      try {
        await api.delete("/jefaturas/" + id);
        Swal.fire("Eliminado", "Jefatura eliminada", "success");
        fetchDatos();
      } catch (e) {
        Swal.fire("Error", "No se pudo eliminar. Verifique si tiene dependencias activas.", "error");
      }
    }
  };

  // --- CRUD Ejecutivas ---
  const crearEjecutiva = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Nueva Ejecutiva",
      showCancelButton: true,
      html: `
        <input id="swal-input1" class="swal2-input" placeholder="Nombre" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
        <input id="swal-input2" class="swal2-input" placeholder="Correo" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
        <input id="swal-input-pass" class="swal2-input" placeholder="Contraseña de acceso" type="text" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
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
          contrasena: document.getElementById("swal-input-pass").value,
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
        <input id="swal-input-pass" class="swal2-input" placeholder="Nueva Contraseña (opcional)" type="text" style="width: 80%; box-sizing: border-box; display: block; margin: 15px auto;">
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
          contrasena: document.getElementById("swal-input-pass").value,
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

  const eliminarEjecutiva = async (id) => {
    if (await confirmDelete()) {
      try {
        await api.delete("/ejecutivas/" + id);
        Swal.fire("Eliminado", "Ejecutiva eliminada", "success");
        fetchDatos();
      } catch (e) {
        Swal.fire("Error", "No se pudo eliminar", "error");
      }
    }
  };

  // --- CRUD Empresas ---
  const crearEmpresa = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Nueva Empresa",
      showCancelButton: true,
      html: `
        <div style="text-align: left; margin-top: 10px;">
          <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #475569;">Nombre de Empresa</label>
          <input id="swal-input-nombre" placeholder="Ej: Coca Cola S.A." style="width: 100%; box-sizing: border-box; margin-bottom: 16px; padding: 10px 12px; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; font-family: inherit;">
          
          <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #475569;">Jefatura Asignada</label>
          <select id="swal-input-jef" style="width: 100%; box-sizing: border-box; margin-bottom: 16px; padding: 10px 12px; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; background: white; font-family: inherit;">
            <option value="">Sin jefatura asignada</option>
            ${jefaturas.map(j => `<option value="${j.id}">${j.nombre}${getEjecutivasNombres(j.id)}</option>`).join("")}
          </select>
          
          <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #475569;">Zona Comercial</label>
          <select id="swal-input-zona" style="width: 100%; box-sizing: border-box; margin-bottom: 5px; padding: 10px 12px; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; background: white; font-family: inherit;">
            <option value="">Seleccione Zona...</option>
            ${zonas.map(z => `<option value="${z.id}">${z.nombre}</option>`).join("")}
          </select>
        </div>
      `,
      focusConfirm: false,
      preConfirm: () => {
        return {
          nombre: document.getElementById("swal-input-nombre").value,
          jefatura_id: document.getElementById("swal-input-jef").value || null,
          zona_id: document.getElementById("swal-input-zona").value || null
        };
      }
    });

    if (formValues && formValues.nombre) {
      try {
        await api.post("/empresas", formValues);
        Swal.fire("Creado", "Empresa creada exitosamente", "success");
        fetchDatos();
      } catch (e) {
        Swal.fire("Error", "Error al crear la empresa", "error");
      }
    }
  };

  const editarEmpresa = async (empresa) => {
    const { value: formValues } = await Swal.fire({
      title: "Editar Empresa",
      showCancelButton: true,
      html: `
        <div style="text-align: left; margin-top: 10px;">
          <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #475569;">Nombre de Empresa</label>
          <input id="swal-input-nombre" placeholder="Ej: Coca Cola S.A." value="${empresa.nombre}" style="width: 100%; box-sizing: border-box; margin-bottom: 16px; padding: 10px 12px; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; font-family: inherit;">
          
          <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #475569;">Jefatura Asignada</label>
          <select id="swal-input-jef" style="width: 100%; box-sizing: border-box; margin-bottom: 16px; padding: 10px 12px; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; background: white; font-family: inherit;">
            <option value="">Sin jefatura asignada</option>
            ${jefaturas.map(j => `<option value="${j.id}" ${empresa.jefatura_id === j.id ? 'selected' : ''}>${j.nombre}${getEjecutivasNombres(j.id)}</option>`).join("")}
          </select>
          
          <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: #475569;">Zona Comercial</label>
          <select id="swal-input-zona" style="width: 100%; box-sizing: border-box; margin-bottom: 5px; padding: 10px 12px; font-size: 14px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; background: white; font-family: inherit;">
            <option value="">Seleccione Zona...</option>
            ${zonas.map(z => `<option value="${z.id}" ${empresa.zona_id === z.id ? 'selected' : ''}>${z.nombre}</option>`).join("")}
          </select>
        </div>
      `,
      focusConfirm: false,
      preConfirm: () => {
        return {
          nombre: document.getElementById("swal-input-nombre").value,
          jefatura_id: document.getElementById("swal-input-jef").value || null,
          zona_id: document.getElementById("swal-input-zona").value || null
        };
      }
    });

    if (formValues && formValues.nombre) {
      try {
        await api.put("/empresas/" + empresa.id, formValues);
        Swal.fire("Actualizado", "Empresa actualizada", "success");
        fetchDatos();
      } catch (e) {
        Swal.fire("Error", "Error al editar la empresa", "error");
      }
    }
  };

  const eliminarEmpresa = async (id) => {
    if (await confirmDelete()) {
      try {
        await api.delete("/empresas/" + id);
        Swal.fire("Eliminado", "Empresa eliminada", "success");
        fetchDatos();
      } catch (e) {
        Swal.fire("Error", "No se pudo eliminar la empresa. Verifique si posee reuniones o encuestas asociadas.", "error");
      }
    }
  };

  // --- Traspaso Masivo ---
  const handleSelectEmpresa = (id) => {
    if (selectedEmpresas.includes(id)) {
      setSelectedEmpresas(selectedEmpresas.filter(x => x !== id));
    } else {
      setSelectedEmpresas([...selectedEmpresas, id]);
    }
  };

  const handleSelectTodas = () => {
    if (selectedEmpresas.length === empresasTraspaso.length) {
      setSelectedEmpresas([]);
    } else {
      setSelectedEmpresas(empresasTraspaso.map(emp => emp.id));
    }
  };

  const ejecutarTraspasoMasivo = async () => {
    if (!traspasoOrigen || !traspasoDestino) {
      return Swal.fire("Campos requeridos", "Por favor seleccione una jefatura de origen y otra de destino", "warning");
    }
    if (traspasoOrigen === traspasoDestino) {
      return Swal.fire("Selección inválida", "La jefatura de destino debe ser diferente a la de origen", "warning");
    }
    if (selectedEmpresas.length === 0) {
      return Swal.fire("Sin selección", "Debe seleccionar al menos una empresa para realizar el traspaso", "warning");
    }

    const sourceName = jefaturas.find(j => j.id === Number(traspasoOrigen))?.nombre || "";
    const targetName = jefaturas.find(j => j.id === Number(traspasoDestino))?.nombre || "";

    const result = await Swal.fire({
      title: "¿Confirmar Traspaso Masivo?",
      text: `Se reasignarán ${selectedEmpresas.length} empresas de la Jefatura "${sourceName}" a la Jefatura "${targetName}". Las ejecutivas del equipo receptor asumirán el seguimiento de estas cuentas.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "var(--secondary-color, #3b82f6)",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sí, realizar traspaso",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      try {
        setLoading(true);
        await api.post("/empresas/traspaso-masivo", {
          source_jefatura_id: Number(traspasoOrigen),
          target_jefatura_id: Number(traspasoDestino),
          empresa_ids: selectedEmpresas
        });
        
        await Swal.fire("Traspaso Exitoso", "Las empresas han sido reasignadas con éxito", "success");
        setTraspasoOrigen("");
        setTraspasoDestino("");
        fetchDatos();
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Ocurrió un error al realizar el traspaso en lote", "error");
        setLoading(false);
      }
    }
  };

  // --- Lógica de Traspaso por Excel ---
  const normalizeText = (text) => {
    if (!text) return "";
    return text
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExcelFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) {
          Swal.fire("Archivo vacío", "El archivo de Excel no contiene registros.", "warning");
          return;
        }

        // Detectar cabeceras dinámicamente
        const firstRow = json[0];
        const keys = Object.keys(firstRow);
        
        const empresaKey = keys.find(k => normalizeText(k).includes("empresa") || normalizeText(k).includes("cliente"));
        const jefaturaKey = keys.find(k => normalizeText(k).includes("jefatura") || normalizeText(k).includes("destino") || normalizeText(k).includes("ejecutiva"));

        if (!empresaKey || !jefaturaKey) {
          Swal.fire(
            "Cabeceras inválidas",
            "No se pudieron identificar las columnas necesarias. El Excel debe contener al menos una columna de 'Empresa' y otra de 'Jefatura Destino'.",
            "error"
          );
          setExcelFile(null);
          setExcelRows([]);
          return;
        }

        // Procesar y validar
        const processed = json.map((row, index) => {
          const rawEmpresa = row[empresaKey] ? row[empresaKey].toString().trim() : "";
          const rawJefatura = row[jefaturaKey] ? row[jefaturaKey].toString().trim() : "";

          // Buscar empresa
          const matchedEmpresa = empresas.find(
            emp => normalizeText(emp.nombre) === normalizeText(rawEmpresa)
          );

          // Buscar jefatura
          const matchedJefatura = jefaturas.find(
            jef => normalizeText(jef.nombre) === normalizeText(rawJefatura)
          );

          let error = "";
          if (!rawEmpresa) {
            error = "Falta nombre de empresa";
          } else if (!rawJefatura) {
            error = "Falta jefatura destino";
          } else if (!matchedEmpresa) {
            error = "Empresa no registrada";
          } else if (!matchedJefatura) {
            error = "Jefatura no registrada";
          }

          return {
            id: index + 1,
            rawEmpresa,
            rawJefatura,
            matchedEmpresaId: matchedEmpresa ? matchedEmpresa.id : null,
            matchedEmpresaNombre: matchedEmpresa ? matchedEmpresa.nombre : null,
            matchedJefaturaId: matchedJefatura ? matchedJefatura.id : null,
            matchedJefaturaNombre: matchedJefatura ? matchedJefatura.nombre : null,
            isValid: !error,
            error
          };
        });

        setExcelRows(processed);
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "No se pudo procesar el archivo Excel. Asegúrese de que sea un archivo XLSX, XLS o CSV válido.", "error");
        setExcelFile(null);
        setExcelRows([]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const ejecutarTraspasoExcel = async () => {
    const validRows = excelRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      return Swal.fire("Sin datos válidos", "No existen filas válidas listas para traspasar en el archivo.", "warning");
    }

    const result = await Swal.fire({
      title: "¿Confirmar Traspaso Masivo por Excel?",
      text: `Se reasignarán ${validRows.length} empresas a sus nuevas jefaturas. Las filas con errores serán omitidas.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "var(--secondary-color, #3b82f6)",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sí, realizar traspaso",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      try {
        setProcesandoExcel(true);
        const traspasos = validRows.map(r => ({
          empresa_id: r.matchedEmpresaId,
          target_jefatura_id: r.matchedJefaturaId
        }));

        await api.post("/empresas/traspaso-excel", { traspasos });
        
        await Swal.fire("Traspaso Completado", "Las empresas válidas han sido traspasadas exitosamente.", "success");
        setExcelFile(null);
        setExcelRows([]);
        fetchDatos();
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "Ocurrió un error al procesar el traspaso masivo en el servidor.", "error");
      } finally {
        setProcesandoExcel(false);
      }
    }
  };

  const limpiarExcel = () => {
    setExcelFile(null);
    setExcelRows([]);
  };

  const descargarPlantillaExcel = () => {
    const headers = [["Empresa", "Jefatura Destino"]];
    const sampleRows = [];
    
    if (empresas.length > 0 && jefaturas.length > 0) {
      const sampleEmp = empresas[0].nombre;
      const sampleJef = jefaturas[0].nombre;
      sampleRows.push([sampleEmp, sampleJef]);
      if (empresas.length > 1 && jefaturas.length > 1) {
        sampleRows.push([empresas[1].nombre, jefaturas[1].nombre]);
      }
    } else {
      sampleRows.push(["Empresa Demo S.A.", "Juan Perez"]);
      sampleRows.push(["Ejemplo Cliente Ltda.", "Maria Gomez"]);
    }

    const data = [...headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla Traspaso");
    XLSX.writeFile(wb, "plantilla_traspaso_masivo.xlsx");
  };

  const confirmDelete = async () => {
    const result = await Swal.fire({
      title: "¿Estás seguro?",
      text: "Esta acción no se puede deshacer y puede afectar registros históricos relacionados.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar"
    });
    return result.isConfirmed;
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh", color: "var(--text-main)", fontSize: "1.2rem", fontWeight: 500 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "15px", alignItems: "center" }}>
          <div className="spinner" style={{ width: "40px", height: "40px", border: "4px solid rgba(0,0,0,0.1)", borderTop: "4px solid var(--secondary-color)", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
          Cargando datos del módulo...
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div className="encuesta-page" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <div className="container">
        
        {/* Unified Page Header */}
        <header className="page-header">
          <div className="page-title-area" style={{ marginBottom: "30px" }}>
            <h1 
              className="page-title"
              style={{
                borderBottom: "2px solid var(--secondary-color)",
                paddingBottom: "8px",
                display: "inline-block",
                marginBottom: "8px",
              }}
            >
              Gestión de Empresas
            </h1>
            <p className="page-subtitle">ADMINISTRE LAS CARTERAS DE CLIENTES, ASOCIE SUS JEFATURAS CORRESPONDIENTES O REALICE TRANSFERENCIAS MASIVAS DE CUENTAS ENTRE EQUIPOS.</p>
          </div>
          <button 
            onClick={crearEmpresa}
            className="btn-header-primary"
          >
            🏢 + Nueva Empresa
          </button>
        </header>

        <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
        
        {/* PANEL TRASPASO MASIVO (Sección premium con tabs para manual o Excel) */}
        <div style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: "12px", border: "1px solid #cbd5e1", boxShadow: "0 6px 16px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          <div 
            onClick={() => setShowTraspaso(!showTraspaso)}
            style={{ 
              display: "flex", justifyContent: "space-between", alignItems: "center", 
              padding: "20px 24px", cursor: "pointer",
              borderBottom: showTraspaso ? "1px solid #cbd5e1" : "none"
            }}
          >
            <h2 style={{ margin: 0, color: "#0f172a", fontSize: "1.15rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "0.8rem", color: "#475569" }}>{showTraspaso ? "▼" : "▶"}</span> 🔄 Traspaso Masivo de Carteras (Lote)
            </h2>
            <span style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--secondary-color)", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600" }}>Utilidad Administrativa</span>
          </div>

          {showTraspaso && (
            <div>
              {/* Pestañas de Navegación de Traspaso */}
              <div style={{ display: "flex", borderBottom: "1px solid #cbd5e1", background: "#f8fafc" }}>
                <button
                  onClick={() => setTraspasoTab("manual")}
                  style={{
                    flex: 1, padding: "14px 20px", border: "none", background: traspasoTab === "manual" ? "white" : "transparent",
                    color: traspasoTab === "manual" ? "var(--secondary-color, #3b82f6)" : "#475569",
                    fontWeight: traspasoTab === "manual" ? "600" : "500",
                    borderBottom: traspasoTab === "manual" ? "3px solid var(--secondary-color, #3b82f6)" : "none",
                    cursor: "pointer", fontSize: "13px", transition: "all 0.2s"
                  }}
                >
                  🗂️ Traspaso Manual (Por Selección)
                </button>
                <button
                  onClick={() => setTraspasoTab("excel")}
                  style={{
                    flex: 1, padding: "14px 20px", border: "none", background: traspasoTab === "excel" ? "white" : "transparent",
                    color: traspasoTab === "excel" ? "var(--secondary-color, #3b82f6)" : "#475569",
                    fontWeight: traspasoTab === "excel" ? "600" : "500",
                    borderBottom: traspasoTab === "excel" ? "3px solid var(--secondary-color, #3b82f6)" : "none",
                    cursor: "pointer", fontSize: "13px", transition: "all 0.2s"
                  }}
                >
                  📈 Carga por Excel (.xlsx, .xls, .csv)
                </button>
              </div>

              <div style={{ padding: "24px" }}>
                {traspasoTab === "manual" ? (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "25px", marginBottom: "25px" }}>
                      
                      {/* SELECTOR ORIGEN */}
                      <div style={{ background: "white", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "8px" }}>1. Equipo / Jefatura de Origen:</label>
                        <select 
                          value={traspasoOrigen}
                          onChange={(e) => setTraspasoOrigen(e.target.value)}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", background: "#f8fafc", color: "#334155", fontWeight: "500" }}
                        >
                          <option value="">-- Seleccione Origen --</option>
                          {jefaturas.map(j => (
                            <option key={j.id} value={j.id}>
                              {j.nombre}{getEjecutivasNombres(j.id)}
                            </option>
                          ))}
                        </select>
                        <p style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>Se cargarán las empresas asociadas actualmente a este equipo.</p>
                      </div>

                      {/* SELECTOR DESTINO */}
                      <div style={{ background: "white", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "8px" }}>2. Equipo / Jefatura de Destino:</label>
                        <select 
                          value={traspasoDestino}
                          onChange={(e) => setTraspasoDestino(e.target.value)}
                          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13px", background: "#f8fafc", color: "#334155", fontWeight: "500" }}
                        >
                          <option value="">-- Seleccione Destino --</option>
                          {jefaturas
                            .filter(j => j.id !== Number(traspasoOrigen))
                            .map(j => (
                              <option key={j.id} value={j.id}>
                                {j.nombre}{getEjecutivasNombres(j.id)}
                              </option>
                            ))
                          }
                        </select>
                        <p style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>El equipo que asumirá la responsabilidad de las empresas traspasadas.</p>
                      </div>

                    </div>

                    {/* LISTA DE EMPRESAS PARA TRASPASAR */}
                    {traspasoOrigen && (
                      <div style={{ background: "white", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "20px", marginBottom: "25px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
                          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#334155" }}>
                            3. Seleccione Cuentas a Reasignar ({selectedEmpresas.length} de {empresasTraspaso.length} seleccionadas)
                          </h3>
                          {empresasTraspaso.length > 0 && (
                            <button 
                              onClick={handleSelectTodas}
                              style={{ border: "1px solid #cbd5e1", background: "none", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "500", cursor: "pointer", color: "#475569" }}
                            >
                              {selectedEmpresas.length === empresasTraspaso.length ? "Deseleccionar Todas" : "Seleccionar Todas"}
                            </button>
                          )}
                        </div>

                        {empresasTraspaso.length === 0 ? (
                          <div style={{ padding: "30px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                            ⚠️ No existen empresas registradas bajo esta jefatura.
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px", maxHeight: "250px", overflowY: "auto", paddingRight: "8px" }}>
                            {empresasTraspaso.map(emp => {
                              const isChecked = selectedEmpresas.includes(emp.id);
                              return (
                                <div 
                                  key={emp.id} 
                                  onClick={() => handleSelectEmpresa(emp.id)}
                                  style={{ 
                                    display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", 
                                    borderRadius: "8px", border: isChecked ? "1px solid var(--secondary-color)" : "1px solid #e2e8f0", 
                                    background: isChecked ? "rgba(59, 130, 246, 0.04)" : "#fff",
                                    cursor: "pointer", transition: "all 0.15s ease"
                                  }}
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={isChecked} 
                                    onChange={() => {}} // Manejado por el div onClick
                                    style={{ width: "16px", height: "16px", cursor: "pointer" }} 
                                  />
                                  <span style={{ fontSize: "13px", fontWeight: isChecked ? "600" : "400", color: isChecked ? "var(--secondary-color)" : "#334155" }}>{emp.nombre}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ACCIÓN DE TRASPASO */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={ejecutarTraspasoMasivo}
                        disabled={!traspasoOrigen || !traspasoDestino || selectedEmpresas.length === 0}
                        style={{ 
                          background: (!traspasoOrigen || !traspasoDestino || selectedEmpresas.length === 0) ? "#cbd5e1" : "var(--secondary-color)",
                          color: "white", border: "none", padding: "12px 30px", borderRadius: "8px", fontSize: "0.9rem", fontWeight: "600",
                          cursor: (!traspasoOrigen || !traspasoDestino || selectedEmpresas.length === 0) ? "not-allowed" : "pointer",
                          transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: "8px",
                          boxShadow: (!traspasoOrigen || !traspasoDestino || selectedEmpresas.length === 0) ? "none" : "0 4px 10px rgba(59, 130, 246, 0.2)"
                        }}
                        onMouseOver={(e) => {
                          if (traspasoOrigen && traspasoDestino && selectedEmpresas.length > 0) {
                            e.currentTarget.style.filter = "brightness(0.9)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.filter = "none";
                          e.currentTarget.style.transform = "none";
                        }}
                      >
                        🔄 Ejecutar Traspaso en Lote
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* CARGA POR EXCEL */}
                    <div style={{ background: "white", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                      <h3 style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "600", color: "#334155" }}>1. Subir planilla de reasignación</h3>
                      <p style={{ margin: "0 0 15px 0", fontSize: "12px", color: "#64748b" }}>
                        Seleccione una hoja de cálculo. El sistema normalizará y emparejará automáticamente los nombres de las empresas y sus jefaturas correspondientes.
                      </p>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>¿No tiene el formato requerido?</span>
                        <button
                          onClick={descargarPlantillaExcel}
                          style={{
                            background: "rgba(59, 130, 246, 0.08)", color: "var(--secondary-color, #3b82f6)",
                            border: "1px solid rgba(59, 130, 246, 0.2)", padding: "6px 14px", borderRadius: "20px",
                            fontSize: "11px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s ease",
                            display: "flex", alignItems: "center", gap: "6px"
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = "rgba(59, 130, 246, 0.08)";
                            e.currentTarget.style.transform = "none";
                          }}
                        >
                          📥 Descargar Formato Excel de Ejemplo
                        </button>
                      </div>

                      <div 
                        style={{ 
                          border: "2px dashed #cbd5e1", borderRadius: "8px", padding: "30px 20px", 
                          textAlign: "center", background: "#f8fafc", cursor: "pointer", 
                          transition: "all 0.2s ease", position: "relative" 
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--secondary-color, #3b82f6)"}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}
                      >
                        <input 
                          type="file" 
                          accept=".xlsx, .xls, .csv" 
                          onChange={handleExcelUpload}
                          style={{ 
                            position: "absolute", top: 0, left: 0, width: "100%", height: "100%", 
                            opacity: 0, cursor: "pointer" 
                          }} 
                        />
                        <div style={{ fontSize: "2rem", marginBottom: "10px" }}>📥</div>
                        <span style={{ fontSize: "0.9rem", fontWeight: "600", color: "#475569", display: "block" }}>
                          {excelFile ? `Planilla cargada: ${excelFile.name}` : "Arrastre aquí su planilla o haga clic para examinar"}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "4px", display: "block" }}>
                          Formatos admitidos: .xlsx, .xls, .csv (Se requiere columnas con nombres similares a "Empresa" y "Jefatura Destino")
                        </span>
                      </div>
                    </div>

                    {excelRows.length > 0 && (
                      <div style={{ background: "white", padding: "20px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <div style={{ 
                          display: "flex", justifyContent: "space-between", alignItems: "center", 
                          paddingBottom: "15px", borderBottom: "1px solid #f1f5f9", marginBottom: "15px"
                        }}>
                          <h3 style={{ margin: 0, fontSize: "14px", fontWeight: "600", color: "#334155" }}>
                            2. Vista previa y validación de registros
                          </h3>
                          <button 
                            onClick={limpiarExcel}
                            style={{ 
                              border: "1px solid #cbd5e1", background: "none", padding: "5px 10px", 
                              borderRadius: "6px", fontSize: "11px", fontWeight: "500", cursor: "pointer", 
                              color: "#64748b" 
                            }}
                          >
                            Quitar Planilla
                          </button>
                        </div>

                        {/* Indicadores rápidos */}
                        <div style={{ display: "flex", gap: "15px", marginBottom: "15px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "6px", background: "#f1f5f9", color: "#475569", fontWeight: "500" }}>
                            Filas totales: <strong>{excelRows.length}</strong>
                          </span>
                          <span style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "6px", background: "#dcfce7", color: "#166534", fontWeight: "500" }}>
                            Listas para traspaso: <strong>{excelRows.filter(r => r.isValid).length}</strong>
                          </span>
                          <span style={{ fontSize: "12px", padding: "4px 8px", borderRadius: "6px", background: "#fee2e2", color: "#991b1b", fontWeight: "500" }}>
                            Con observaciones: <strong>{excelRows.filter(r => !r.isValid).length}</strong>
                          </span>
                        </div>

                        {/* Contenedor Scrollable para Tabla */}
                        <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid #f1f5f9", borderRadius: "8px" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                            <thead>
                              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: "600" }}>
                                <th style={{ padding: "8px 10px", width: "40px" }}>#</th>
                                <th style={{ padding: "8px 10px" }}>EMPRESA (EXCEL)</th>
                                <th style={{ padding: "8px 10px" }}>SISTEMA (MAPEADA)</th>
                                <th style={{ padding: "8px 10px" }}>JEFATURA DESTINO</th>
                                <th style={{ padding: "8px 10px" }}>ESTADO / OBSERVACIÓN</th>
                              </tr>
                            </thead>
                            <tbody>
                              {excelRows.map((row) => (
                                <tr 
                                  key={row.id} 
                                  style={{ 
                                    borderBottom: "1px solid #f8fafc", 
                                    background: row.isValid ? "none" : "rgba(239, 68, 68, 0.03)" 
                                  }}
                                >
                                  <td style={{ padding: "8px 10px", color: "#94a3b8" }}>{row.id}</td>
                                  <td style={{ padding: "8px 10px", fontWeight: "500", color: "#334155" }}>{row.rawEmpresa}</td>
                                  <td style={{ padding: "8px 10px", color: row.matchedEmpresaId ? "#16a34a" : "#ef4444" }}>
                                    {row.matchedEmpresaNombre || "⚠️ No encontrada"}
                                  </td>
                                  <td style={{ padding: "8px 10px", color: row.matchedJefaturaId ? "#334155" : "#ef4444" }}>
                                    {row.matchedJefaturaNombre || `⚠️ "${row.rawJefatura || "Sin definir"}" no existe`}
                                  </td>
                                  <td style={{ padding: "8px 10px" }}>
                                    <span style={{ 
                                      padding: "3px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: "600",
                                      background: row.isValid ? "#dcfce7" : "#fee2e2",
                                      color: row.isValid ? "#15803d" : "#b91c1c"
                                    }}>
                                      {row.isValid ? "Listo" : row.error}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* BOTÓN PROCESAR EXCEL */}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
                          <button
                            onClick={ejecutarTraspasoExcel}
                            disabled={procesandoExcel || excelRows.filter(r => r.isValid).length === 0}
                            style={{ 
                              background: (procesandoExcel || excelRows.filter(r => r.isValid).length === 0) ? "#cbd5e1" : "var(--secondary-color)",
                              color: "white", border: "none", padding: "12px 30px", borderRadius: "8px", fontSize: "0.9rem", fontWeight: "600",
                              cursor: (procesandoExcel || excelRows.filter(r => r.isValid).length === 0) ? "not-allowed" : "pointer",
                              transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: "8px"
                            }}
                          >
                            {procesandoExcel ? "Procesando..." : "🔄 Ejecutar Traspaso desde Excel"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  </div>
  );
}
