import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "../styles/core360-theme.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const API_BASE = `${API_URL}/encuestas/editor`;

export default function EditorEncuestas() {
  const [templates, setTemplates] = useState([]);
  const [dimensions, setDimensions] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInactives, setShowInactives] = useState(false); // 🔥 Nuevo estado para filtrar
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    document.title = "CORE 360 - Ajustes";
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const [tRes, dRes] = await Promise.all([
          axios.get(`${API_BASE}/templates`),
          axios.get(`${API_BASE}/dimensiones`),
        ]);
        setTemplates(tRes.data);
        setDimensions(dRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadPreguntas = async (templateId) => {
    try {
      const res = await axios.get(`${API_BASE}/preguntas/${templateId}`);
      setPreguntas(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectTemplate = (t) => {
    setSelectedTemplate(t);
    loadPreguntas(t.id);
  };

  const handleEditTemplate = async (template) => {
    const { value: formValues } = await Swal.fire({
      title: '<div style="text-align: center; font-size: 22px; font-weight: 800; color: #0f172a;">Editar Template</div>',
      html: `
                <div style="text-align: left; padding: 10px;">
                    <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Nombre del Template</label>
                    <input id="swal-nombre" class="swal2-input" style="width: 100%; margin: 8px 0 20px 0; font-size: 14px;" value="${template.nombre}">
                    
                    <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Estado de Visibilidad</label>
                    <select id="swal-activo" class="swal2-input" style="width: 100%; margin: 8px 0 10px 0;">
                        <option value="1" ${template.activo ? "selected" : ""}>ACTIVO</option>
                        <option value="0" ${!template.activo ? "selected" : ""}>INACTIVO</option>
                    </select>
                </div>
            `,
      width: "450px",
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        return {
          id: template.id,
          nombre: document.getElementById("swal-nombre").value,
          activo: parseInt(document.getElementById("swal-activo").value),
        };
      },
    });

    if (formValues) {
      try {
        await axios.patch(`${API_BASE}/templates`, formValues);
        setTemplates(
          templates.map((t) =>
            t.id === template.id ? { ...t, ...formValues } : t,
          ),
        );
        if (selectedTemplate?.id === template.id) {
          setSelectedTemplate({ ...selectedTemplate, ...formValues });
        }
        Swal.fire("Actualizado", "", "success");
      } catch (err) {
        Swal.fire("Error", err.message, "error");
      }
    }
  };

  const handleCrearTemplate = async () => {
    const { value: nombre } = await Swal.fire({
      title: "Nuevo Template",
      input: "text",
      inputLabel: "Nombre del template",
      showCancelButton: true,
    });

    if (nombre) {
      try {
        const res = await axios.post(`${API_BASE}/templates`, { nombre });
        setTemplates([{ ...res.data, activo: 1 }, ...templates]);
        Swal.fire("Creado", "", "success");
      } catch (err) {
        Swal.fire("Error", err.message, "error");
      }
    }
  };

  const handleCrearDimension = async () => {
    const { value: nombre } = await Swal.fire({
      title: "Nueva Dimensión",
      input: "text",
      inputLabel: "Nombre de la dimensión",
      showCancelButton: true,
    });

    if (nombre) {
      try {
        const res = await axios.post(`${API_BASE}/dimensiones`, { nombre });
        const newDim = res.data;
        setDimensions((prev) => [...prev, newDim]);
        Swal.fire("Creada", "La dimensión ha sido creada.", "success");
        return newDim;
      } catch (err) {
        Swal.fire("Error", err.response?.data?.error || err.message, "error");
      }
    }
    return null;
  };

  const handleGestionarDimensiones = async () => {
    const loadAndShowDimensiones = async () => {
      const tableRows = dimensions
        .map(
          (d) => `
                <tr>
                    <td style="font-size: 14px; font-weight: bold; color: #1e293b; text-align: left; padding: 12px 16px;">${d.nombre}</td>
                    <td style="text-align: right; padding: 12px 16px;">
                        <button class="swal-dim-btn-delete swal-lib-pill-btn swal-lib-pill-btn-delete" data-id="${d.id}" data-nombre="${d.nombre}">🗑️ Eliminar</button>
                    </td>
                </tr>
            `,
        )
        .join("");

      const htmlContent = `
                <div class="swal-lib-container" style="font-family: 'Inter', system-ui, -apple-system, sans-serif;">
                    <p style="font-size: 13px; color: #64748b; margin-bottom: 15px; text-align: left;">
                        Gestiona las dimensiones globales. Las preguntas de dimensiones eliminadas se mantendrán como 'Sin Dimensión'.
                    </p>
                    <div style="margin-bottom: 20px; text-align: right;">
                        <button id="swal-dim-btn-crear" class="swal-lib-btn-primary">+ Nueva Dimensión</button>
                    </div>
                    <div class="swal-lib-scroll" style="max-height: 300px; overflow-y: auto; border: 1.5px solid #cbd5e1; border-radius: 12px; background: white;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                    <th style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: left;">Nombre</th>
                                    <th style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: right;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows.length > 0 ? tableRows : '<tr><td colspan="2" style="padding: 20px; text-align: center; color: #94a3b8;">No hay dimensiones creadas.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;

      Swal.fire({
        title: "🏷️ Dimensiones de Encuestas",
        html: htmlContent,
        width: "500px",
        showConfirmButton: false,
        showCloseButton: true,
        didOpen: () => {
          const crearBtn = document.getElementById("swal-dim-btn-crear");
          crearBtn.addEventListener("click", async () => {
            Swal.close();
            const created = await handleCrearDimension();
            if (created) {
              setTimeout(() => {
                handleGestionarDimensiones();
              }, 500);
            } else {
              handleGestionarDimensiones();
            }
          });

          const deleteBtns = document.querySelectorAll(".swal-dim-btn-delete");
          deleteBtns.forEach((btn) => {
            btn.addEventListener("click", async () => {
              const dimId = btn.getAttribute("data-id");
              const dimNombre = btn.getAttribute("data-nombre");
              Swal.close();

              const confirm = await Swal.fire({
                title: "¿Eliminar Dimensión?",
                text: `¿Estás seguro de eliminar la dimensión "${dimNombre}"? Las preguntas asociadas no se eliminarán, solo se clasificarán como "Sin Dimensión".`,
                icon: "warning",
                showCancelButton: true,
                confirmButtonColor: "#ef4444",
                cancelButtonColor: "#64748b",
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar",
              });

              if (confirm.isConfirmed) {
                try {
                  await axios.delete(`${API_BASE}/dimensiones/${dimId}`);
                  const updatedDimensions = dimensions.filter(
                    (d) => d.id !== parseInt(dimId),
                  );
                  setDimensions(updatedDimensions);

                  if (selectedTemplate) {
                    loadPreguntas(selectedTemplate.id);
                  }

                  Swal.fire(
                    "Eliminada",
                    "La dimensión ha sido eliminada.",
                    "success",
                  ).then(() => {
                    dimensions.length = 0;
                    dimensions.push(...updatedDimensions);
                    handleGestionarDimensiones();
                  });
                } catch (err) {
                  Swal.fire(
                    "Error",
                    err.response?.data?.error || err.message,
                    "error",
                  );
                }
              } else {
                handleGestionarDimensiones();
              }
            });
          });
        },
      });
    };

    await loadAndShowDimensiones();
  };

  const handleEliminarTemplate = async (template) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar Template?",
      text: `¿Estás seguro de que deseas eliminar el template "${template.nombre}"? Cambiará su estado a "Eliminado" y no se podrá usar para nuevos envíos. Las encuestas completadas e historial se mantendrán intactos.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (confirm.isConfirmed) {
      try {
        await axios.delete(`${API_BASE}/templates/${template.id}`);
        setTemplates(templates.filter((t) => t.id !== template.id));
        if (selectedTemplate?.id === template.id) {
          setSelectedTemplate(null);
          setPreguntas([]);
        }
        Swal.fire(
          "Eliminado",
          "El template ha sido marcado como eliminado.",
          "success",
        );
      } catch (err) {
        Swal.fire("Error", err.response?.data?.error || err.message, "error");
      }
    }
  };

  const handleTemplateOptions = async (template) => {
    Swal.fire({
      title: `Template: ${template.nombre}`,
      html: `
                <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">Selecciona una acción para este template.</p>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button id="swal-opt-select" class="swal-option-btn primary">
                        🎯 Cargar en Editor
                    </button>
                    <button id="swal-opt-edit" class="swal-option-btn outline">
                        ✏️ Editar Nombre / Estado
                    </button>
                    <button id="swal-opt-delete" class="swal-option-btn danger">
                        🗑️ Eliminar Template
                    </button>
                </div>
            `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: "Cerrar",
      cancelButtonColor: "#64748b",
      didOpen: () => {
        document
          .getElementById("swal-opt-select")
          .addEventListener("click", () => {
            Swal.close();
            handleSelectTemplate(template);
          });
        document
          .getElementById("swal-opt-edit")
          .addEventListener("click", () => {
            Swal.close();
            handleEditTemplate(template);
          });
        document
          .getElementById("swal-opt-delete")
          .addEventListener("click", () => {
            Swal.close();
            handleEliminarTemplate(template);
          });
      },
    });
  };

  const handleSelectFromLibrary = async (returnToManager = false) => {
    const strictReturn =
      typeof returnToManager === "boolean" ? returnToManager : false;
    let transitioning = false;

    try {
      const loadAndShowLibrary = async () => {
        const res = await axios.get(
          `${API_URL}/encuestas/catalogo-preguntas`,
        );
        const catalogo = res.data;

        const templateHeader = strictReturn && selectedTemplate
          ? `<p style="font-size: 13px; color: #64748b; margin-bottom: 15px;">Busca y selecciona preguntas de la Biblioteca Maestro para vincular a <b>${selectedTemplate.nombre}</b>.</p>`
          : `<p style="font-size: 13px; color: #64748b; margin-bottom: 15px;">Gestión de preguntas globales en la Biblioteca Maestro.</p>`;

        const getDimensionBadge = (dim) => {
          if (!dim)
            return `<span class="swal-lib-badge swal-lib-badge-gray">Sin Dimensión</span>`;
          const d = dim.toLowerCase();
          if (d.includes("recomen") || d.includes("nps")) {
            return `<span class="swal-lib-badge swal-lib-badge-blue">${dim}</span>`;
          }
          if (d.includes("satisfac") || d.includes("general")) {
            return `<span class="swal-lib-badge swal-lib-badge-green">${dim}</span>`;
          }
          if (
            d.includes("atenc") ||
            d.includes("cliente") ||
            d.includes("ejecut")
          ) {
            return `<span class="swal-lib-badge swal-lib-badge-purple">${dim}</span>`;
          }
          return `<span class="swal-lib-badge swal-lib-badge-gray">${dim}</span>`;
        };

        const getRowActions = (p) => {
          if (strictReturn) {
            return `
              <button class="swal-btn-vincular swal-lib-pill-btn swal-lib-pill-btn-add" data-id="${p.id}"><span>➕</span> Agregar</button>
            `;
          } else {
            return `
              <button class="swal-btn-editar swal-lib-pill-btn swal-lib-pill-btn-edit" data-id="${p.id}"><span>✏️</span> Editar</button>
              <button class="swal-btn-eliminar swal-lib-pill-btn swal-lib-pill-btn-delete" data-id="${p.id}"><span>🗑️</span> Eliminar</button>
            `;
          }
        };

        const tableRows = catalogo
          .map(
            (p) => `
                    <tr>
                        <td>${getDimensionBadge(p.dimension)}</td>
                        <td style="font-size: 13px; text-align: left; color: #1e293b; line-height: 1.4;">${p.texto}</td>
                        <td style="text-align: right; white-space: nowrap;">
                            ${getRowActions(p)}
                        </td>
                    </tr>
                `,
          )
          .join("");

        const searchBar = strictReturn
          ? `
            <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                <input id="swal-lib-search" type="text" placeholder="Buscar pregunta..." class="swal-lib-search-input" style="width: 100%;" />
            </div>
          `
          : `
            <div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                <input id="swal-lib-search" type="text" placeholder="Buscar pregunta..." class="swal-lib-search-input" />
                <button id="swal-btn-crear-nueva" class="swal-lib-btn-primary">+ Nueva Pregunta</button>
            </div>
          `;

        const htmlContent = `
                    <style>
                        .swal-lib-container {
                            font-family: 'Inter', system-ui, -apple-system, sans-serif;
                            text-align: left;
                            color: #1e293b;
                            padding: 5px;
                        }
                        
                        .swal-lib-scroll::-webkit-scrollbar {
                            width: 6px;
                            height: 6px;
                        }
                        .swal-lib-scroll::-webkit-scrollbar-track {
                            background: #f1f5f9;
                            border-radius: 4px;
                        }
                        .swal-lib-scroll::-webkit-scrollbar-thumb {
                            background: #cbd5e1;
                            border-radius: 4px;
                        }
                        .swal-lib-scroll::-webkit-scrollbar-thumb:hover {
                            background: #94a3b8;
                        }
 
                        .swal-lib-table th {
                            padding: 12px 16px;
                            font-size: 11px;
                            font-weight: 700;
                            letter-spacing: 0.05em;
                            text-transform: uppercase;
                            color: #475569;
                            border-bottom: 2px solid #e2e8f0;
                            background: #f8fafc;
                            position: sticky;
                            top: 0;
                            z-index: 10;
                        }
 
                        .swal-lib-table tr {
                            border-bottom: 1px solid #f1f5f9;
                            transition: background-color 0.15s ease;
                        }
                        .swal-lib-table tr:hover {
                            background-color: #f8fafc;
                        }
                        .swal-lib-table td {
                            padding: 14px 16px;
                            vertical-align: middle;
                        }
 
                        .swal-lib-search-input {
                            width: 60%;
                            padding: 10px 14px;
                            border-radius: 8px;
                            border: 1.5px solid #cbd5e1;
                            font-size: 13px;
                            color: #1e293b;
                            transition: all 0.2s ease;
                        }
                        .swal-lib-search-input:focus {
                            outline: none;
                            border-color: #4f46e5;
                            box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
                        }
 
                        .swal-lib-btn-primary {
                            background: #4f46e5;
                            color: white;
                            border: none;
                            padding: 10px 18px;
                            border-radius: 8px;
                            font-size: 13px;
                            font-weight: 700;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            display: inline-flex;
                            align-items: center;
                            gap: 6px;
                        }
                        .swal-lib-btn-primary:hover {
                            background: #4338ca;
                            transform: translateY(-1px);
                            box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);
                        }
 
                        .swal-lib-pill-btn {
                            display: inline-flex;
                            align-items: center;
                            justify-content: center;
                            gap: 6px;
                            padding: 6px 14px;
                            border-radius: 9999px;
                            font-size: 11px;
                            font-weight: 700;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            border: 1.5px solid transparent;
                            text-transform: uppercase;
                            letter-spacing: 0.03em;
                        }
 
                        .swal-lib-pill-btn-edit {
                            background: #eff6ff;
                            border-color: #bfdbfe;
                            color: #1d4ed8;
                        }
                        .swal-lib-pill-btn-edit:hover {
                            background: #dbeafe;
                            transform: scale(1.03);
                        }
 
                        .swal-lib-pill-btn-delete {
                            background: #fee2e2;
                            border-color: #fecaca;
                            color: #dc2626;
                        }
                        .swal-lib-pill-btn-delete:hover {
                            background: #fcd3d3;
                            transform: scale(1.03);
                        }
                        
                        .swal-lib-pill-btn-add {
                            background: #ecfdf5;
                            border-color: #a7f3d0;
                            color: #059669;
                        }
                        .swal-lib-pill-btn-add:hover {
                            background: #d1fae5;
                            transform: scale(1.03);
                        }
 
                        .swal-lib-badge {
                            display: inline-block;
                            padding: 4px 10px;
                            border-radius: 9999px;
                            font-size: 10px;
                            font-weight: 700;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                            border: 1px solid transparent;
                            white-space: nowrap;
                        }
                        .swal-lib-badge-blue {
                            background: #eff6ff;
                            border-color: #bfdbfe;
                            color: #1e40af;
                        }
                        .swal-lib-badge-green {
                            background: #ecfdf5;
                            border-color: #a7f3d0;
                            color: #065f46;
                        }
                        .swal-lib-badge-purple {
                            background: #faf5ff;
                            border-color: #e9d5ff;
                            color: #6b21a8;
                        }
                        .swal-lib-badge-gray {
                            background: #f8fafc;
                            border-color: #e2e8f0;
                            color: #475569;
                        }
 
                        .swal2-title {
                            font-size: 24px !important;
                            font-weight: 800 !important;
                            color: #1e293b !important;
                            font-family: 'Inter', system-ui, -apple-system, sans-serif !important;
                            padding-top: 25px !important;
                            margin: 0 !important;
                            display: flex !important;
                            justify-content: center !important;
                            align-items: center !important;
                            gap: 8px !important;
                        }
                        .swal2-close {
                            color: #94a3b8 !important;
                            font-size: 28px !important;
                            transition: color 0.15s ease !important;
                        }
                        .swal2-close:hover {
                            color: #475569 !important;
                        }
                        .swal2-popup {
                            border-radius: 16px !important;
                            padding: 10px 15px !important;
                        }
                    </style>
 
                    <div class="swal-lib-container">
                        ${templateHeader}
                        ${searchBar}
                        <div class="swal-lib-scroll" style="max-height: 400px; overflow-y: auto; border: 1.5px solid #cbd5e1; border-radius: 12px; background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                            <table class="swal-lib-table" style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr>
                                        <th style="width: 25%; text-align: left;">Dimensión</th>
                                        <th style="width: 55%; text-align: left;">Pregunta</th>
                                        <th style="width: 20%; text-align: right;">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody id="swal-lib-tbody">
                                    ${tableRows.length > 0 ? tableRows : '<tr><td colspan="3" style="padding: 30px; text-align: center; color: #94a3b8;">La biblioteca está vacía.</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `;

        const result = await Swal.fire({
          title: strictReturn ? "🔍 Vincular Pregunta" : "🔍 Biblioteca Maestro",
          html: htmlContent,
          width: "750px",
          showConfirmButton: false,
          showCloseButton: true,
          didOpen: () => {
            const searchInput = document.getElementById("swal-lib-search");
            searchInput.addEventListener("input", (e) => {
              const query = e.target.value.toLowerCase();
              const rows = document.querySelectorAll("#swal-lib-tbody tr");
              rows.forEach((row) => {
                const text = row.textContent.toLowerCase();
                if (text.includes(query)) {
                  row.style.display = "";
                } else {
                  row.style.display = "none";
                }
              });
            });

            if (strictReturn) {
              const vincularBtns = document.querySelectorAll(".swal-btn-vincular");
              vincularBtns.forEach((btn) => {
                btn.addEventListener("click", async () => {
                  const preguntaId = btn.getAttribute("data-id");
                  transitioning = true;
                  Swal.close();
                  try {
                    await axios.post(`${API_BASE}/preguntas/vincular`, {
                      templateId: selectedTemplate.id,
                      preguntaId: parseInt(preguntaId),
                    });
                    await loadPreguntas(selectedTemplate.id);
                    Swal.fire({
                      title: 'Pregunta vinculada',
                      icon: 'success',
                      timer: 1000,
                      showConfirmButton: false
                    });
                  } catch (err) {
                    console.error("Error linking question:", err);
                    Swal.fire("Error", "No se pudo vincular la pregunta.", "error");
                  }
                });
              });
            } else {
              const editarBtns = document.querySelectorAll(".swal-btn-editar");
              editarBtns.forEach((btn) => {
                btn.addEventListener("click", async () => {
                  const preguntaId = btn.getAttribute("data-id");
                  const preguntaObj = catalogo.find(
                    (p) => p.id === parseInt(preguntaId),
                  );
                  transitioning = true;
                  await handleEditPreguntaDirecta(preguntaObj, strictReturn);
                });
              });

              const eliminarBtns =
                document.querySelectorAll(".swal-btn-eliminar");
              eliminarBtns.forEach((btn) => {
                btn.addEventListener("click", async () => {
                  const preguntaId = btn.getAttribute("data-id");
                  transitioning = true;
                  const confirm = await Swal.fire({
                    title: "¿Retirar de la Biblioteca?",
                    text: 'Esta acción cambiará el estado de la pregunta a "eliminado". Se mantendrá el histórico de respuestas y encuestas contestadas, pero se desvinculará de todos los templates activos y dejará de estar disponible en el catálogo.',
                    icon: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#ef4444",
                    cancelButtonColor: "#64748b",
                    confirmButtonText: "Sí, retirar de la biblioteca",
                    cancelButtonText: "Cancelar",
                  });

                  if (confirm.isConfirmed) {
                    try {
                      await axios.delete(
                        `${API_URL}/encuestas/editor/catalogo-preguntas/${preguntaId}`,
                      );
                      if (selectedTemplate) {
                        loadPreguntas(selectedTemplate.id);
                      }
                      Swal.fire(
                        "Retirada",
                        'La pregunta ha sido marcada como "eliminado" y retirada del catálogo.',
                        "success",
                      ).then(() => {
                        handleSelectFromLibrary(strictReturn);
                      });
                    } catch (err) {
                      Swal.fire(
                        "Error",
                        "No se pudo retirar la pregunta.",
                        "error",
                      ).then(() => {
                        handleSelectFromLibrary(strictReturn);
                      });
                    }
                  } else {
                    handleSelectFromLibrary(strictReturn);
                  }
                });
              });

              const crearBtn = document.getElementById("swal-btn-crear-nueva");
              if (crearBtn) {
                crearBtn.addEventListener("click", async () => {
                  transitioning = true;
                  await handleEditPreguntaDirecta(null, strictReturn);
                });
              }
            }
          },
        });

        if (
          result.isDismissed &&
          !transitioning &&
          strictReturn &&
          selectedTemplate
        ) {
          // Keep user on the main view
        }
      };

      await loadAndShowLibrary();
    } catch (err) {
      Swal.fire("Error", "No se pudo cargar la biblioteca.", "error");
    }
  };

  const handleEditPreguntaDirecta = async (
    pregunta = null,
    returnToManager = false,
  ) => {
    const isNew = !pregunta;

    let opcionesStr = "";
    if (pregunta?.opciones_json) {
      const opts =
        typeof pregunta.opciones_json === "string"
          ? JSON.parse(pregunta.opciones_json)
          : pregunta.opciones_json;
      opcionesStr = Array.isArray(opts) ? opts.join(", ") : opts;
    }

    const { value: formValues } = await Swal.fire({
      title: isNew
        ? "Nueva Pregunta en Catálogo"
        : "Editar Pregunta en Catálogo",
      html: `
                <div style="text-align: left; max-height: 500px; overflow-y: auto; padding: 15px;">
                    <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Texto de la Pregunta</label>
                    <textarea id="swal-texto" class="swal2-textarea" style="width: 100%; margin: 8px 0 20px 0; height: 80px; font-size: 14px;">${pregunta?.texto || ""}</textarea>
                    
                    <div class="swal-responsive-grid" style="margin-bottom: 20px;">
                        <div>
                            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Dimensión</label>
                            <select id="swal-dimension" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; height: 40px;">
                                <option value="">Sin dimensión</option>
                                ${dimensions.map((d) => `<option value="${d.id}" ${d.nombre === pregunta?.dimension ? "selected" : d.id === pregunta?.dimension_id ? "selected" : ""}>${d.nombre}</option>`).join("")}
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Sub-Dimensión</label>
                            <input id="swal-subdimension" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; height: 40px;" value="${pregunta?.subdimension || ""}">
                        </div>
                    </div>

                    <div class="swal-responsive-grid" style="margin-bottom: 20px;">
                        <div>
                            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Tipo de Respuesta</label>
                            <select id="swal-tipo" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; height: 40px;" onchange="
                                const type = this.value;
                                document.getElementById('div-escala').style.display = (type === 'escala' || type === 'nps') ? 'block' : 'none';
                                document.getElementById('div-opciones').style.display = (type === 'seleccion' || type === 'seleccion_unica' || type === 'seleccion_multiple') ? 'block' : 'none';
                            ">
                                <option value="escala" ${pregunta?.tipo === "escala" ? "selected" : ""}>Escala Numérica</option>
                                <option value="nps" ${pregunta?.tipo === "nps" ? "selected" : ""}>NPS (Net Promoter Score)</option>
                                <option value="seleccion" ${pregunta?.tipo === "seleccion" ? "selected" : ""}>Selección (Botones)</option>
                                <option value="texto" ${pregunta?.tipo === "texto" ? "selected" : ""}>Comentario Libre</option>
                                <option value="seleccion_multiple" ${pregunta?.tipo === "seleccion_multiple" ? "selected" : ""}>Selección Múltiple</option>
                            </select>
                        </div>
                        <div id="div-escala" style="display: ${pregunta?.tipo === "escala" || pregunta?.tipo === "nps" || isNew ? "block" : "none"};">
                            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Escala Máxima</label>
                            <input id="swal-escala" type="number" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; height: 40px;" value="${pregunta?.escala || 10}">
                        </div>
                    </div>

                    <div id="div-opciones" style="display: ${pregunta?.tipo?.includes("seleccion") || false ? "block" : "none"}; margin-bottom: 20px;">
                        <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Opciones (separadas por coma)</label>
                        <input id="swal-opciones" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; font-size: 13px;" value="${opcionesStr}" placeholder="Ej: Muy Bueno, Bueno, Regular, Malo">
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px; margin-top: 20px; background: #f8fafc; padding: 10px; border-radius: 8px;">
                        <input type="checkbox" id="swal-nps-check" style="width: 18px; height: 18px;" ${pregunta?.es_nps ? "checked" : ""}>
                        <label for="swal-nps-check" style="margin: 0; font-size: 11px; font-weight: bold; color: #1e3a8a;">MARCAR COMO KPI NPS</label>
                    </div>
                </div>
            `,
      width: "650px",
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const rawOpciones = document.getElementById("swal-opciones").value;
        return {
          pregunta_id: pregunta?.id,
          dimension_id: document.getElementById("swal-dimension").value || null,
          subdimension: document.getElementById("swal-subdimension").value,
          texto: document.getElementById("swal-texto").value,
          tipo: document.getElementById("swal-tipo").value,
          escala: document.getElementById("swal-escala").value,
          es_nps: document.getElementById("swal-nps-check").checked ? 1 : 0,
          opciones_json: rawOpciones
            ? rawOpciones
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          requerida: 1,
        };
      },
    });

    if (formValues) {
      try {
        await axios.post(`${API_BASE}/preguntas`, formValues);
        Swal.fire(
          "Guardado",
          "La pregunta ha sido guardada en la biblioteca maestro.",
          "success",
        ).then(() => {
          handleSelectFromLibrary(returnToManager);
        });
        if (selectedTemplate) {
          loadPreguntas(selectedTemplate.id);
        }
      } catch (err) {
        Swal.fire("Error", err.message, "error").then(() => {
          handleSelectFromLibrary(returnToManager);
        });
      }
    } else {
      handleSelectFromLibrary(returnToManager);
    }
  };

  const handleEditPregunta = async (
    pregunta = null,
    returnToManager = false,
    suggestedOrden = null,
  ) => {
    if (!selectedTemplate) return;

    const isNew = !pregunta;
    const isShared = pregunta?.shared_count > 1;

    let opcionesStr = "";
    if (pregunta?.opciones_json) {
      const opts =
        typeof pregunta.opciones_json === "string"
          ? JSON.parse(pregunta.opciones_json)
          : pregunta.opciones_json;
      opcionesStr = Array.isArray(opts) ? opts.join(", ") : opts;
    }

    const { value: formValues } = await Swal.fire({
      title: `<div style="text-align: center; font-size: 22px; font-weight: 800; color: #0f172a;">${isNew ? "Nueva Pregunta" : "Editar Pregunta"}</div>`,
      html: `
                <div style="text-align: left; max-height: 500px; overflow-y: auto; padding: 15px;">
                    ${
                      isShared
                        ? `
                        <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
                            <p style="font-size: 11px; color: #92400e; margin: 0; font-weight: bold; text-transform: uppercase;">⚠️ Pregunta Compartida</p>
                            <p style="font-size: 11px; color: #b45309; margin: 5px 0;">Se usa en ${pregunta.shared_count} templates.</p>
                            <div class="flex-wrap-container" style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 5px;">
                                <label style="font-size: 11px; display: flex; align-items: center; gap: 6px;">
                                    <input type="radio" name="clone-logic" value="master" checked> Actualizar en todos
                                </label>
                                <label style="font-size: 11px; display: flex; align-items: center; gap: 6px;">
                                    <input type="radio" name="clone-logic" value="clone"> Clonar solo para este
                                </label>
                            </div>
                        </div>
                    `
                        : ""
                    }

                    <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Texto de la Pregunta</label>
                    <textarea id="swal-texto" class="swal2-textarea" style="width: 100%; margin: 8px 0 20px 0; height: 80px; font-size: 14px;">${pregunta?.texto || ""}</textarea>
                    
                    <div class="swal-responsive-grid" style="margin-bottom: 20px;">
                        <div>
                            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Dimensión</label>
                            <select id="swal-dimension" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; height: 40px;">
                                <option value="">Sin dimensión</option>
                                ${dimensions.map((d) => `<option value="${d.id}" ${d.id === pregunta?.dimension_id ? "selected" : ""}>${d.nombre}</option>`).join("")}
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Sub-Dimensión</label>
                            <input id="swal-subdimension" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; height: 40px;" value="${pregunta?.subdimension || ""}">
                        </div>
                    </div>

                    <div class="swal-responsive-grid" style="margin-bottom: 20px;">
                        <div>
                            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Tipo de Respuesta</label>
                            <select id="swal-tipo" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; height: 40px;" onchange="
                                const type = this.value;
                                document.getElementById('div-escala').style.display = (type === 'escala' || type === 'nps') ? 'block' : 'none';
                                document.getElementById('div-opciones').style.display = (type === 'seleccion' || type === 'seleccion_unica' || type === 'seleccion_multiple') ? 'block' : 'none';
                            ">
                                <option value="escala" ${pregunta?.tipo === "escala" ? "selected" : ""}>Escala Numérica</option>
                                <option value="nps" ${pregunta?.tipo === "nps" ? "selected" : ""}>NPS (Net Promoter Score)</option>
                                <option value="seleccion" ${pregunta?.tipo === "seleccion" ? "selected" : ""}>Selección (Botones)</option>
                                <option value="texto" ${pregunta?.tipo === "texto" ? "selected" : ""}>Comentario Libre</option>
                                <option value="seleccion_multiple" ${pregunta?.tipo === "seleccion_multiple" ? "selected" : ""}>Selección Múltiple</option>
                            </select>
                        </div>
                        <div id="div-escala" style="display: ${pregunta?.tipo === "escala" || pregunta?.tipo === "nps" || isNew ? "block" : "none"};">
                            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Escala Máxima</label>
                            <input id="swal-escala" type="number" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; height: 40px;" value="${pregunta?.escala || 10}">
                        </div>
                    </div>

                    <div id="div-opciones" style="display: ${pregunta?.tipo?.includes("seleccion") || false ? "block" : "none"}; margin-bottom: 20px;">
                        <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Opciones (separadas por coma)</label>
                        <input id="swal-opciones" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; font-size: 13px;" value="${opcionesStr}" placeholder="Ej: Muy Bueno, Bueno, Regular, Malo">
                    </div>

                    <div style="margin-top: 20px; background: #f8fafc; padding: 10px 15px; border-radius: 8px; display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="swal-nps-check" style="width: 18px; height: 18px;" ${pregunta?.es_nps ? "checked" : ""}>
                        <label for="swal-nps-check" style="margin: 0; font-size: 11px; font-weight: bold; color: #1e3a8a; cursor: pointer;">MARCAR COMO KPI NPS</label>
                    </div>
                </div>
            `,
      width: "650px",
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const cloneLogic = document.querySelector(
          'input[name="clone-logic"]:checked',
        )?.value;
        const rawOpciones = document.getElementById("swal-opciones").value;
        return {
          pregunta_id: pregunta?.pregunta_id || pregunta?.id,
          template_id: selectedTemplate.id,
          dimension_id: document.getElementById("swal-dimension").value || null,
          subdimension: document.getElementById("swal-subdimension").value,
          texto: document.getElementById("swal-texto").value,
          tipo: document.getElementById("swal-tipo").value,
          escala: document.getElementById("swal-escala").value,
          es_nps: document.getElementById("swal-nps-check").checked ? 1 : 0,
          orden: pregunta?.orden || suggestedOrden || null,
          solo_este_template: cloneLogic === "clone",
          opciones_json: rawOpciones
            ? rawOpciones
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
          requerida: 1,
        };
      },
    });

    if (formValues) {
      try {
        await axios.post(`${API_BASE}/preguntas`, formValues);
        await loadPreguntas(selectedTemplate.id);
        Swal.fire("Guardado", "", "success").then(() => {
          if (returnToManager && selectedTemplate) {
            handleOpenTemplateManager(selectedTemplate);
          }
        });
      } catch (err) {
        Swal.fire("Error", err.message, "error").then(() => {
          if (returnToManager && selectedTemplate) {
            handleOpenTemplateManager(selectedTemplate);
          }
        });
      }
    } else {
      if (returnToManager && selectedTemplate) {
        handleOpenTemplateManager(selectedTemplate);
      }
    }
  };

  const handleEliminarPregunta = async (p) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar?",
      text: "Se quitará de este template.",
      icon: "warning",
      showCancelButton: true,
    });

    if (confirm.isConfirmed) {
      await axios.delete(
        `${API_BASE}/preguntas/${selectedTemplate.id}/${p.pregunta_id || p.id}`,
      );
      loadPreguntas(selectedTemplate.id);
    }
  };

  const handleCambiarEstado = async (template) => {
    if (!template) return;
    const nuevoEstado = template.activo === 1 ? 0 : 1;
    const { isConfirmed } = await Swal.fire({
      title: template.activo === 1 ? "¿Desactivar Template?" : "¿Activar Template?",
      text: template.activo === 1 
        ? "El template dejará de estar disponible para crear encuestas nuevas."
        : "El template volverá a estar disponible para crear encuestas.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "var(--primary-color)",
      cancelButtonText: "Cancelar",
      confirmButtonText: template.activo === 1 ? "Sí, desactivar" : "Sí, activar"
    });

    if (isConfirmed) {
      try {
        const updatedFields = {
          id: template.id,
          nombre: template.nombre,
          activo: nuevoEstado
        };
        await axios.patch(`${API_BASE}/templates`, updatedFields);
        
        // Refresh templates list
        const latestTemplates = await axios.get(`${API_BASE}/templates`);
        setTemplates(latestTemplates.data);
        const freshTemplate = latestTemplates.data.find(t => t.id === template.id);
        if (freshTemplate) {
          setSelectedTemplate(freshTemplate);
        } else {
          setSelectedTemplate(null);
        }
        Swal.fire({
          title: 'Estado actualizado',
          icon: 'success',
          timer: 1000,
          showConfirmButton: false
        });
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "No se pudo cambiar el estado.", "error");
      }
    }
  };

  const handleUnlinkPregunta = async (pregunta) => {
    if (!selectedTemplate) return;
    const confirm = await Swal.fire({
      title: "¿Desvincular Pregunta?",
      text: `¿Estás seguro de desvincular la pregunta "${pregunta.texto}" del template? Permanecerá disponible en la Biblioteca Maestro.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sí, desvincular",
      cancelButtonText: "Cancelar",
    });

    if (confirm.isConfirmed) {
      try {
        await axios.post(`${API_BASE}/templates/unlink`, {
          template_id: selectedTemplate.id,
          pregunta_id: pregunta.pregunta_id || pregunta.id
        });
        
        // Refresh templates and questions
        const latestTemplates = await axios.get(`${API_BASE}/templates`);
        setTemplates(latestTemplates.data);
        
        const res = await axios.get(`${API_BASE}/preguntas/${selectedTemplate.id}`);
        setPreguntas(res.data);
        
        Swal.fire({
          title: 'Desvinculada',
          icon: 'success',
          timer: 1000,
          showConfirmButton: false
        });
      } catch (err) {
        console.error(err);
        Swal.fire("Error", "No se pudo desvincular la pregunta.", "error");
      }
    }
  };

  const handleReorderQuestions = async (reorderedList) => {
    if (!selectedTemplate) return;
    try {
      // Create promises to update each question's order in the database
      const promises = reorderedList.map((p, idx) => {
        const newOrder = idx + 1;
        return axios.post(`${API_BASE}/preguntas`, {
          pregunta_id: p.pregunta_id || p.id,
          template_id: selectedTemplate.id,
          dimension_id: p.dimension_id,
          subdimension: p.subdimension,
          texto: p.texto,
          tipo: p.tipo,
          escala: p.escala,
          es_nps: p.es_nps,
          orden: newOrder,
          opciones_json: typeof p.opciones_json === "string"
            ? JSON.parse(p.opciones_json)
            : p.opciones_json || [],
          requerida: p.requerida || 1,
        });
      });
      await Promise.all(promises);
      await loadPreguntas(selectedTemplate.id);
    } catch (err) {
      console.error("Error reordering questions:", err);
      Swal.fire("Error", "No se pudieron guardar las posiciones de las preguntas.", "error");
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const listCopy = [...preguntas];
    const draggedItem = listCopy[draggedIndex];
    listCopy.splice(draggedIndex, 1);
    listCopy.splice(targetIndex, 0, draggedItem);

    // Update local state first for instant feedback
    setPreguntas(listCopy);
    setDraggedIndex(null);

    // Save the new order in the database
    await handleReorderQuestions(listCopy);
  };

  const swapOrder = async (index1, index2, currentQuestionsList) => {
    if (!selectedTemplate) return;
    const list = currentQuestionsList || preguntas;
    const p1 = list[index1];
    const p2 = list[index2];
    if (!p1 || !p2) return;

    const o1 = p1.orden;
    const o2 = p2.orden;

    try {
      await Promise.all([
        axios.post(`${API_BASE}/preguntas`, {
          pregunta_id: p1.pregunta_id || p1.id,
          template_id: selectedTemplate.id,
          dimension_id: p1.dimension_id,
          subdimension: p1.subdimension,
          texto: p1.texto,
          tipo: p1.tipo,
          escala: p1.escala,
          es_nps: p1.es_nps,
          orden: o2,
          opciones_json:
            typeof p1.opciones_json === "string"
              ? JSON.parse(p1.opciones_json)
              : p1.opciones_json || [],
          requerida: p1.requerida || 1,
        }),
        axios.post(`${API_BASE}/preguntas`, {
          pregunta_id: p2.pregunta_id || p2.id,
          template_id: selectedTemplate.id,
          dimension_id: p2.dimension_id,
          subdimension: p2.subdimension,
          texto: p2.texto,
          tipo: p2.tipo,
          escala: p2.escala,
          es_nps: p2.es_nps,
          orden: o1,
          opciones_json:
            typeof p2.opciones_json === "string"
              ? JSON.parse(p2.opciones_json)
              : p2.opciones_json || [],
          requerida: p2.requerida || 1,
        }),
      ]);

      await loadPreguntas(selectedTemplate.id);
    } catch (err) {
      console.error("Error swapping orders:", err);
      Swal.fire("Error", "No se pudieron reordenar las preguntas.", "error");
    }
  };

  const handleOpenTemplateManager = async (template) => {
    if (!template) return;

    let currentQuestions = [];
    try {
      const res = await axios.get(`${API_BASE}/preguntas/${template.id}`);
      currentQuestions = res.data;
      setPreguntas(currentQuestions);
    } catch (err) {
      console.error(err);
    }

    const tableRows = currentQuestions
      .map((p, index) => {
        const isFirst = index === 0;
        const isLast = index === currentQuestions.length - 1;

        return `
                <tr>
                    <td style="font-size: 13px; font-weight: bold; color: #475569; text-align: center; padding: 12px 8px;">${p.orden}</td>
                    <td style="font-size: 13px; text-align: left; color: #1e293b; line-height: 1.4; padding: 12px;">
                        <div style="font-weight: bold;">${p.texto}</div>
                        ${p.shared_count > 1 ? `<div style="font-size: 10px; color: #b45309; margin-top: 2px;">♻️ Compartida en ${p.shared_count} templates</div>` : ""}
                    </td>
                    <td style="font-size: 12px; text-align: left; color: #64748b; padding: 12px;">
                        <span class="swal-lib-badge swal-lib-badge-gray">${p.dimension_nombre || "General"}</span>
                    </td>
                    <td style="text-align: right; padding: 12px; white-space: nowrap;">
                        <button class="swal-mgr-btn-up swal-lib-pill-btn swal-lib-pill-btn-edit" data-index="${index}" ${isFirst ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ""}>▲ Subir</button>
                        <button class="swal-mgr-btn-down swal-lib-pill-btn swal-lib-pill-btn-edit" data-index="${index}" ${isLast ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ""}>▼ Bajar</button>
                        <button class="swal-mgr-btn-edit swal-lib-pill-btn swal-lib-pill-btn-link" data-index="${index}">✏️ Editar</button>
                        <button class="swal-mgr-btn-unlink swal-lib-pill-btn swal-lib-pill-btn-delete" data-id="${p.pregunta_id || p.id}">🗑️ Quitar</button>
                    </td>
                </tr>
            `;
      })
      .join("");

    const htmlContent = `
            <style>
              .swal-template-title-input:hover {
                border-color: #cbd5e1 !important;
                background-color: #f8fafc !important;
              }
              .swal-template-title-input:focus {
                border-color: var(--secondary-color, #3b82f6) !important;
                background-color: #ffffff !important;
                box-shadow: 0 0 0 3px rgba(66, 108, 165, 0.15) !important;
                outline: none !important;
              }
            </style>
            <div class="swal-lib-container" style="font-family: 'Inter', system-ui, -apple-system, sans-serif; padding-top: 12px;">
                
                <!-- Center, editable template name header inside HTML container with premium alignment -->
                <div style="text-align: center; width: 100%; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; border-bottom: 2px solid var(--secondary-color, #3b82f6); padding-bottom: 15px; margin-bottom: 20px; position: relative;">
                  <input id="swal-template-name-input" type="text" value="${template.nombre}" 
                         placeholder="Nombre del template"
                         class="swal2-input swal-template-title-input" 
                         style="text-align: center; font-size: 26px; font-weight: 800; color: #0f172a; border: 1.5px solid transparent; background: transparent; padding: 6px 12px; margin: 0; width: 90%; max-width: 480px; border-radius: 8px; transition: all 0.3s;" />
                  <div id="swal-template-name-feedback" style="font-size: 11px; color: #10b981; font-weight: bold; margin-top: 4px; opacity: 0; transition: opacity 0.3s; height: 14px;">✓ Guardado con éxito</div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1.5px solid #e2e8f0;">
                    <div style="font-size: 14px; font-weight: 700; color: #475569; text-align: left;">
                        Preguntas Vinculadas (${currentQuestions.length})
                    </div>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button id="swal-mgr-btn-change-state" class="swal-lib-pill-btn swal-lib-pill-btn-edit" style="padding: 6px 12px; font-size: 12px; height: 32px; display: inline-flex; align-items: center; gap: 4px; background: #64748b; color: white; border: none;">⚙️ Cambiar Estado</button>
                        <button id="swal-mgr-btn-link-existing" class="swal-lib-pill-btn" style="background: #10b981; color: white; border: none; padding: 6px 12px; font-size: 12px; height: 32px; display: inline-flex; align-items: center; gap: 4px; border-radius: 20px; font-weight: 600; cursor: pointer;">🔍 Vincular</button>
                        <button id="swal-mgr-btn-create-question" class="swal-lib-pill-btn" style="background: #4f46e5; color: white; border: none; padding: 6px 12px; font-size: 12px; height: 32px; display: inline-flex; align-items: center; gap: 4px; border-radius: 20px; font-weight: 600; cursor: pointer;">➕ Nueva Pregunta</button>
                    </div>
                </div>

                <div class="swal-lib-scroll" style="max-height: 380px; overflow-y: auto; border: 1.5px solid #cbd5e1; border-radius: 12px; background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <table class="swal-lib-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                                <th style="width: 8%; text-align: center; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; padding: 12px 8px;">#</th>
                                <th style="width: 52%; text-align: left; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; padding: 12px;">Pregunta</th>
                                <th style="width: 15%; text-align: left; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; padding: 12px;">Dimensión</th>
                                <th style="width: 25%; text-align: right; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; padding: 12px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows.length > 0 ? tableRows : '<tr><td colspan="4" style="padding: 30px; text-align: center; color: #94a3b8;">No hay preguntas vinculadas a este template. Usa los botones de arriba para agregar.</td></tr>'}
                        </tbody>
                    </table>
                </div>

            </div>
        `;

    Swal.fire({
      html: htmlContent,
      width: "850px",
      showConfirmButton: false,
      showCloseButton: true,
      didOpen: () => {
        const nameInput = document.getElementById("swal-template-name-input");
        if (nameInput) {
          const saveName = async () => {
            const nuevoNombre = nameInput.value.trim();
            if (nuevoNombre && nuevoNombre !== template.nombre) {
              try {
                const updatedFields = {
                  id: template.id,
                  nombre: nuevoNombre,
                  activo: template.activo
                };
                await axios.patch(`${API_BASE}/templates`, updatedFields);
                
                // Update local states immediately
                const freshTemplates = templates.map(t => t.id === template.id ? { ...t, nombre: nuevoNombre } : t);
                setTemplates(freshTemplates);
                setSelectedTemplate({ ...template, nombre: nuevoNombre });
                
                // Show in-modal animated confirmation border and message, keeping the modal perfectly open!
                nameInput.style.borderColor = "#10b981";
                nameInput.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.15)";
                
                const feedback = document.getElementById("swal-template-name-feedback");
                if (feedback) {
                  feedback.style.opacity = "1";
                }
                
                setTimeout(() => {
                  nameInput.style.borderColor = "transparent";
                  nameInput.style.boxShadow = "none";
                  if (feedback) {
                    feedback.style.opacity = "0";
                  }
                }, 1800);
              } catch (err) {
                console.error(err);
                nameInput.value = template.nombre; // Restore old name
                nameInput.style.borderColor = "#ef4444";
                Swal.fire("Error", "No se pudo actualizar el nombre.", "error");
              }
            }
          };

          nameInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
              nameInput.blur();
            }
          });
          nameInput.addEventListener("blur", saveName);
        }

        document
          .getElementById("swal-mgr-btn-change-state")
          .addEventListener("click", async () => {
            Swal.close();
            
            const updateTemplateState = async (nuevoEstado) => {
              try {
                const updatedFields = {
                  id: template.id,
                  nombre: template.nombre,
                  activo: nuevoEstado
                };
                await axios.patch(`${API_BASE}/templates`, updatedFields);
                
                const latestTemplates = await axios.get(`${API_BASE}/templates`);
                setTemplates(latestTemplates.data);
                const freshTemplate = latestTemplates.data.find(t => t.id === template.id);
                if (freshTemplate) {
                  setSelectedTemplate(freshTemplate);
                  Swal.fire({
                    title: 'Estado actualizado',
                    icon: 'success',
                    timer: 1000,
                    showConfirmButton: false
                  }).then(() => {
                    handleOpenTemplateManager(freshTemplate);
                  });
                }
              } catch (err) {
                console.error(err);
                Swal.fire("Error", "No se pudo cambiar el estado.", "error").then(() => {
                  handleOpenTemplateManager(template);
                });
              }
            };

            const result = await Swal.fire({
              title: '<div style="font-size: 20px; font-weight: 800; color: #0f172a; text-align: center;">Cambiar Estado del Template</div>',
              html: `
                <div style="font-size: 14px; color: #64748b; margin-bottom: 20px; text-align: center;">
                  Selecciona el nuevo estado para el template: <strong>${template.nombre}</strong>
                </div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  <button id="state-btn-active" class="swal-option-btn primary" style="background-color: #10b981 !important; margin-bottom: 10px;">🟢 ACTIVO (Visible para envíos)</button>
                  <button id="state-btn-inactive" class="swal-option-btn outline" style="border-color: #cbd5e1 !important; color: #334155 !important; margin-bottom: 10px; border: 1.5px solid !important;">🟡 INACTIVO (Archivado)</button>
                  <button id="state-btn-delete" class="swal-option-btn danger" style="background-color: #fee2e2 !important; border: 1.5px solid #fecaca !important; color: #dc2626 !important; margin-bottom: 10px; font-weight: 700; cursor: pointer;">🔴 ELIMINAR TEMPLATE</button>
                </div>
              `,
              showConfirmButton: false,
              showCancelButton: true,
              cancelButtonText: 'Cancelar',
              cancelButtonColor: '#64748b',
              width: '400px',
              didOpen: () => {
                document.getElementById("state-btn-active").addEventListener("click", async () => {
                  Swal.close();
                  await updateTemplateState(1);
                });
                document.getElementById("state-btn-inactive").addEventListener("click", async () => {
                  Swal.close();
                  await updateTemplateState(0);
                });
                document.getElementById("state-btn-delete").addEventListener("click", async () => {
                  Swal.close();
                  await handleEliminarTemplate(template);
                });
              }
            });

            if (result.dismiss === Swal.DismissReason.cancel) {
              handleOpenTemplateManager(template);
            }
          });

        document
          .getElementById("swal-mgr-btn-link-existing")
          .addEventListener("click", async () => {
            Swal.close();
            await handleSelectFromLibrary(true);
          });

        document
          .getElementById("swal-mgr-btn-create-question")
          .addEventListener("click", async () => {
            Swal.close();
            await handleEditPregunta(null, true, currentQuestions.length + 1);
          });

        const editBtns = document.querySelectorAll(".swal-mgr-btn-edit");
        editBtns.forEach((btn) => {
          btn.addEventListener("click", async () => {
            const index = btn.getAttribute("data-index");
            const p = currentQuestions[index];
            Swal.close();
            await handleEditPregunta(p, true, p.orden);
          });
        });

        const unlinkBtns = document.querySelectorAll(".swal-mgr-btn-unlink");
        unlinkBtns.forEach((btn) => {
          btn.addEventListener("click", async () => {
            const preguntaId = btn.getAttribute("data-id");
            const index = Array.from(unlinkBtns).indexOf(btn);
            const p = currentQuestions[index];
            Swal.close();

            const confirm = await Swal.fire({
              title: "¿Quitar Pregunta?",
              text: `¿Estás seguro de desvincular la pregunta del template? Permanecerá disponible en la Biblioteca Maestro.`,
              icon: "warning",
              showCancelButton: true,
              confirmButtonColor: "#ef4444",
              cancelButtonColor: "#64748b",
              confirmButtonText: "Sí, desvincular",
              cancelButtonText: "Cancelar",
            });

            if (confirm.isConfirmed) {
              try {
                await axios.delete(
                  `${API_BASE}/preguntas/${template.id}/${preguntaId}`,
                );
                const freshQ = await axios.get(
                  `${API_BASE}/preguntas/${template.id}`,
                );
                setPreguntas(freshQ.data);
                Swal.fire(
                  "Quitada",
                  "La pregunta fue quitada del template.",
                  "success",
                ).then(() => {
                  handleOpenTemplateManager(template);
                });
              } catch (err) {
                Swal.fire(
                  "Error",
                  "No se pudo desvincular la pregunta.",
                  "error",
                ).then(() => {
                  handleOpenTemplateManager(template);
                });
              }
            } else {
              handleOpenTemplateManager(template);
            }
          });
        });

        const upBtns = document.querySelectorAll(".swal-mgr-btn-up");
        upBtns.forEach((btn) => {
          btn.addEventListener("click", async () => {
            const index = parseInt(btn.getAttribute("data-index"));
            Swal.close();
            await swapOrder(index, index - 1, currentQuestions);
            setTimeout(() => handleOpenTemplateManager(template), 300);
          });
        });

        const downBtns = document.querySelectorAll(".swal-mgr-btn-down");
        downBtns.forEach((btn) => {
          btn.addEventListener("click", async () => {
            const index = parseInt(btn.getAttribute("data-index"));
            Swal.close();
            await swapOrder(index, index + 1, currentQuestions);
            setTimeout(() => handleOpenTemplateManager(template), 300);
          });
        });
      },
    });
  };

  return (
    <div
      className="encuesta-page"
      style={{ background: "var(--bg-body)", minHeight: "100vh" }}
    >
      <div className="container" style={{ padding: "30px 20px" }}>
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
              Gestor de Encuestas
            </h1>
            <p className="page-subtitle">
              CONFIGURACIÓN DE BIBLIOTECA MAESTRO Y TEMPLATES
            </p>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={handleSelectFromLibrary}
              className="btn-editor-header"
            >
              🔍 Biblioteca Maestro
            </button>
            <button
              onClick={handleGestionarDimensiones}
              className="btn-editor-header"
            >
              🏷️ Dimensiones
            </button>
            <button onClick={handleCrearTemplate} className="btn-editor-header">
              ➕ Nuevo Template
            </button>
          </div>
        </header>

        <div className="responsive-editor-layout" style={styles.layout}>
          <aside
            className="editor-sidebar"
            style={{
              ...styles.sidebar,
              display: "flex",
              flexDirection: "column",
              height: "fit-content",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <h3 style={styles.sectionTitle}>
                {showInactives ? "Templates Inactivos" : "Templates Activos"}
              </h3>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                marginBottom: "20px",
                paddingLeft: "6px",
                paddingRight: "6px",
                paddingTop: "4px",
                paddingBottom: "4px",
              }}
            >
              {loading ? (
                <p
                  style={{
                    textAlign: "center",
                    fontSize: "13px",
                    color: "var(--text-muted)",
                  }}
                >
                  Cargando...
                </p>
              ) : (
                <div style={styles.list}>
                  {templates
                    .filter((t) =>
                      showInactives ? t.activo === 0 : t.activo === 1,
                    )
                    .map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTemplate(t)}
                        style={{
                          ...styles.listItem,
                          background:
                            selectedTemplate?.id === t.id
                              ? "var(--bg-muted)"
                              : "var(--bg-container)",
                          borderColor:
                            selectedTemplate?.id === t.id
                              ? "var(--secondary-color)"
                              : "var(--border-color)",
                          padding: "10px 14px",
                          justifyContent: "space-between",
                          boxShadow:
                            selectedTemplate?.id === t.id
                              ? "0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06)"
                              : "none",
                          transform:
                            selectedTemplate?.id === t.id
                              ? "scale(1.02)"
                              : "scale(1)",
                          transition: "all 0.2s ease-in-out",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontWeight: "bold",
                              color: "var(--text-main)",
                              fontSize: "13px",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {t.nombre}
                          </div>
                        </div>
                      </div>
                    ))}
                  {templates.filter((t) =>
                    showInactives ? !t.activo : t.activo,
                  ).length === 0 &&
                    !loading && (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "20px",
                          color: "var(--text-light)",
                          fontSize: "13px",
                        }}
                      >
                        No hay templates{" "}
                        {showInactives ? "inactivos" : "activos"}.
                      </div>
                    )}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowInactives(!showInactives)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                background: showInactives
                  ? "var(--bg-muted)"
                  : "var(--bg-container)",
                color: showInactives
                  ? "var(--secondary-color)"
                  : "var(--text-muted)",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
              }}
            >
              {showInactives ? "← VOLVER A ACTIVOS" : "VER INACTIVOS 📁"}
            </button>
          </aside>

          <main style={styles.main}>
            {selectedTemplate ? (
              <div className="fade">
                <div style={styles.mainHeader}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="text"
                      value={selectedTemplate.nombre}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setSelectedTemplate(prev => ({ ...prev, nombre: newName }));
                      }}
                      onBlur={async () => {
                        const newName = selectedTemplate.nombre.trim();
                        if (newName) {
                          try {
                            const updatedFields = {
                              id: selectedTemplate.id,
                              nombre: newName,
                              activo: selectedTemplate.activo
                            };
                            await axios.patch(`${API_BASE}/templates`, updatedFields);
                            // Refresh templates list
                            const latestTemplates = await axios.get(`${API_BASE}/templates`);
                            setTemplates(latestTemplates.data);
                          } catch (err) {
                            console.error(err);
                            Swal.fire("Error", "No se pudo cambiar el nombre del template.", "error");
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.target.blur();
                        }
                      }}
                      style={{
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: "var(--text-main)",
                        border: "1px solid transparent",
                        background: "transparent",
                        borderRadius: "6px",
                        padding: "6px 12px",
                        width: "100%",
                        maxWidth: "360px",
                        outline: "none",
                        transition: "all 0.2s"
                      }}
                      onFocus={(e) => {
                        e.target.style.border = "1px solid #cbd5e1";
                        e.target.style.background = "#fff";
                      }}
                      onBlurCapture={(e) => {
                        e.target.style.border = "1px solid transparent";
                        e.target.style.background = "transparent";
                      }}
                      title="Haga clic para editar el nombre del template"
                    />
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => handleCambiarEstado(selectedTemplate)}
                      className="btn-editor-header"
                      style={{ background: "#64748b", color: "#fff", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      ⚙️ {selectedTemplate.activo === 1 ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => handleSelectFromLibrary(true)}
                      className="btn-editor-header"
                      style={{ background: "#10b981", color: "#fff", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      🔍 Vincular Pregunta
                    </button>
                    <button
                      onClick={() => handleEditPregunta(null, false, preguntas.length + 1)}
                      className="btn-editor-header"
                      style={{ background: "#4f46e5", color: "#fff", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      ➕ Nueva Pregunta
                    </button>
                  </div>
                </div>

                <div style={styles.tableCard}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.th}>
                        <th style={{ ...styles.thCell, width: "30px", textAlign: "center" }}></th>
                        <th style={{ ...styles.thCell, width: "40px" }}>#</th>
                        <th style={styles.thCell}>Pregunta</th>
                        <th style={styles.thCell}>Dimensión</th>
                        <th style={styles.thCell}>Tipo</th>
                        <th
                          style={{
                            ...styles.thCell,
                            textAlign: "center",
                            width: "100px",
                          }}
                        >
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {preguntas.length === 0 ? (
                        <tr>
                          <td
                            colSpan="6"
                            style={{
                              padding: "40px",
                              textAlign: "center",
                              color: "var(--text-light)",
                            }}
                          >
                            Template vacío.
                          </td>
                        </tr>
                      ) : (
                        preguntas.map((p, idx) => (
                          <tr
                            key={p.assignment_id || p.id}
                            style={{
                              ...styles.tr,
                              opacity: draggedIndex === idx ? 0.4 : 1,
                              backgroundColor: draggedIndex === idx ? "#f8fafc" : "transparent"
                            }}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, idx)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, idx)}
                          >
                            <td
                              style={{
                                ...styles.tdCell,
                                cursor: "grab",
                                textAlign: "center",
                                color: "#94a3b8",
                                fontSize: "16px",
                                userSelect: "none",
                                width: "30px"
                              }}
                              title="Arrastra para reordenar"
                            >
                              ⣿
                            </td>
                            <td style={styles.tdCell}>{p.orden}</td>
                            <td style={styles.tdCell}>
                              <div
                                style={{ fontWeight: "bold", color: "#334155" }}
                              >
                                {p.texto}
                              </div>
                              {p.shared_count > 1 && (
                                <div
                                  style={{ fontSize: "10px", color: "#b45309" }}
                                >
                                  ♻️ Compartida en {p.shared_count} templates
                                </div>
                              )}
                            </td>
                            <td style={styles.tdCell}>
                              <span style={styles.dimensionBadge}>
                                {p.dimension_nombre || "General"}
                              </span>
                              {p.subdimension && (
                                <div
                                  style={{
                                    fontSize: "10px",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  {p.subdimension}
                                </div>
                              )}
                            </td>
                            <td style={styles.tdCell}>
                              <span style={styles.typeBadge}>
                                {p.tipo.toUpperCase()}
                              </span>
                              {p.tipo === "escala" && (
                                <div
                                  style={{
                                    fontSize: "10px",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  Rango: 1-{p.escala || 10}
                                </div>
                              )}
                              {p.es_nps === 1 && (
                                <div
                                  style={{
                                    fontSize: "10px",
                                    color: "var(--secondary-color)",
                                    fontWeight: "bold",
                                  }}
                                >
                                  NPS KPI
                                </div>
                              )}
                            </td>
                            <td style={styles.tdCell}>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  justifyContent: "center",
                                }}
                              >
                                <button
                                  onClick={() => handleEditPregunta(p)}
                                  style={styles.btnIcon}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleEliminarPregunta(p)}
                                  style={{
                                    ...styles.btnIcon,
                                    color: "var(--danger-color)",
                                  }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={styles.emptyState}>
                <div style={{ fontSize: "64px", marginBottom: "20px" }}>📋</div>
                <h3 style={{ color: "var(--text-main)" }}>
                  Selecciona un template
                </h3>
                <p style={{ color: "var(--text-muted)", marginBottom: "20px" }}>
                  Configura las dimensiones y preguntas de tus encuestas.
                </p>
                <button
                  onClick={handleSelectFromLibrary}
                  style={{
                    background: "var(--bg-muted)",
                    color: "var(--text-muted)",
                    border: "1.5px solid #e2e8f0",
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  🔍 Ver Biblioteca Maestro
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#f8fafc", minHeight: "100vh", padding: "40px 20px" },
  container: { maxWidth: "1300px", margin: "0 auto" },
  layout: {
    alignItems: "start",
  },
  sidebar: {
    background: "var(--bg-container)",
    padding: "16px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
  },
  sectionTitle: {
    fontSize: "11px",
    fontWeight: "bold",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  list: { display: "flex", flexDirection: "column", gap: "8px" },
  listItem: {
    padding: "10px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    border: "1.5px solid #f1f5f9",
    display: "flex",
    alignItems: "center",
    transition: "all 0.2s ease",
  },
  main: { minHeight: "600px" },
  mainHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  },
  tableCard: {
    background: "var(--bg-container)",
    borderRadius: "12px",
    border: "1px solid #e2e8f0",
    overflow: "hidden",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
  },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  th: { background: "#f8fafc", borderBottom: "1.5px solid #f1f5f9" },
  thCell: {
    padding: "15px",
    fontSize: "12px",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    fontWeight: "bold",
    letterSpacing: "0.02em",
  },
  tdCell: {
    padding: "18px 15px",
    borderBottom: "1px solid #f1f5f9",
    fontSize: "14px",
  },
  tr: { transition: "background 0.2s", "&:hover": { background: "#fcfdfe" } },
  dimensionBadge: {
    background: "var(--bg-muted)",
    color: "var(--text-muted)",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "bold",
  },
  typeBadge: {
    background: "var(--bg-muted)",
    color: "var(--secondary-color)",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "bold",
  },
  btnSecondary: {
    background: "var(--bg-container)",
    color: "var(--text-muted)",
    border: "1.5px solid #e2e8f0",
    padding: "12px 24px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  btnIcon: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "18px",
    opacity: 0.7,
    "&:hover": { opacity: 1 },
  },
  btnIconSmall: {
    background: "#f8fafc",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    padding: "8px",
    borderRadius: "8px",
    transition: "all 0.2s ease",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "500px",
    color: "var(--text-light)",
    background: "var(--bg-container)",
    borderRadius: "12px",
    border: "2px dashed #e2e8f0",
  },
};
