import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

const API_BASE = "http://localhost:8080/encuestas/editor";

export default function EditorEncuestas() {
    const [templates, setTemplates] = useState([]);
    const [dimensions, setDimensions] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [preguntas, setPreguntas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInactives, setShowInactives] = useState(false); // 🔥 Nuevo estado para filtrar

    useEffect(() => {
        document.title = "CORE 360 - Ajustes";
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                const [tRes, dRes] = await Promise.all([
                    axios.get(`${API_BASE}/templates`),
                    axios.get(`${API_BASE}/dimensiones`)
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
            title: 'Editar Template',
            html: `
                <div style="text-align: left; padding: 10px;">
                    <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Nombre del Template</label>
                    <input id="swal-nombre" class="swal2-input" style="width: 100%; margin: 8px 0 20px 0; font-size: 14px;" value="${template.nombre}">
                    
                    <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Estado de Visibilidad</label>
                    <select id="swal-activo" class="swal2-input" style="width: 100%; margin: 8px 0 10px 0;">
                        <option value="1" ${template.activo ? 'selected' : ''}>ACTIVO</option>
                        <option value="0" ${!template.activo ? 'selected' : ''}>INACTIVO</option>
                    </select>
                </div>
            `,
            width: '450px',
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                return {
                    id: template.id,
                    nombre: document.getElementById('swal-nombre').value,
                    activo: parseInt(document.getElementById('swal-activo').value)
                };
            }
        });

        if (formValues) {
            try {
                await axios.patch(`${API_BASE}/templates`, formValues);
                setTemplates(templates.map(t => t.id === template.id ? { ...t, ...formValues } : t));
                if (selectedTemplate?.id === template.id) {
                    setSelectedTemplate({ ...selectedTemplate, ...formValues });
                }
                Swal.fire('Actualizado', '', 'success');
            } catch (err) { Swal.fire('Error', err.message, 'error'); }
        }
    };

    const handleCrearTemplate = async () => {
        const { value: nombre } = await Swal.fire({
            title: 'Nuevo Template',
            input: 'text',
            inputLabel: 'Nombre del template',
            showCancelButton: true
        });

        if (nombre) {
            try {
                const res = await axios.post(`${API_BASE}/templates`, { nombre });
                setTemplates([{ ...res.data, activo: 1 }, ...templates]);
                Swal.fire('Creado', '', 'success');
            } catch (err) { Swal.fire('Error', err.message, 'error'); }
        }
    };

    const handleCrearDimension = async () => {
        const { value: nombre } = await Swal.fire({
            title: 'Nueva Dimensión',
            input: 'text',
            inputLabel: 'Nombre',
            showCancelButton: true
        });

        if (nombre) {
            try {
                const res = await axios.post(`${API_BASE}/dimensiones`, { nombre });
                setDimensions([...dimensions, res.data]);
                Swal.fire('Creada', '', 'success');
            } catch (err) { Swal.fire('Error', err.message, 'error'); }
        }
    };

    const handleSelectFromLibrary = async () => {
        if (!selectedTemplate) return;
        
        try {
            const res = await axios.get("http://localhost:8080/encuestas/catalogo-preguntas");
            const catalogo = res.data;

            if (!catalogo || catalogo.length === 0) {
                return Swal.fire('Información', 'La biblioteca está vacía.', 'info');
            }

            const { value: preguntaId } = await Swal.fire({
                title: 'Seleccionar de Biblioteca',
                html: `
                    <div style="text-align: left; padding: 10px;">
                        <p style="font-size: 13px; color: #64748b; margin-bottom: 15px;">Selecciona una pregunta para vincular a <b>${selectedTemplate.nombre}</b></p>
                        <select id="swal-pregunta-lib" class="swal2-input" style="width: 100%; font-size: 13px; height: 45px;">
                            ${catalogo.map(p => `<option value="${p.id}">[${p.dimension || '---'}] ${p.texto.substring(0, 60)}...</option>`).join('')}
                        </select>
                    </div>
                `,
                width: '600px',
                showCancelButton: true,
                preConfirm: () => document.getElementById('swal-pregunta-lib').value
            });

            if (preguntaId) {
                await axios.post(`${API_BASE}/preguntas/vincular`, {
                    templateId: selectedTemplate.id,
                    preguntaId: preguntaId
                });
                loadPreguntas(selectedTemplate.id);
                Swal.fire('Vinculada', '', 'success');
            }
        } catch (err) {
            Swal.fire('Error', 'No se pudo cargar la biblioteca.', 'error');
        }
    };

    const handleEditPregunta = async (pregunta = null) => {
        if (!selectedTemplate) return;

        const isNew = !pregunta;
        const isShared = pregunta?.shared_count > 1;
        
        // Formatear opciones si vienen como JSON
        let opcionesStr = "";
        if (pregunta?.opciones_json) {
            const opts = typeof pregunta.opciones_json === 'string' ? JSON.parse(pregunta.opciones_json) : pregunta.opciones_json;
            opcionesStr = Array.isArray(opts) ? opts.join(", ") : opts;
        }

        const { value: formValues } = await Swal.fire({
            title: isNew ? 'Nueva Pregunta' : 'Editar Pregunta',
            html: `
                <div style="text-align: left; max-height: 500px; overflow-y: auto; padding: 15px;">
                    ${isShared ? `
                        <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 12px; border-radius: 8px; margin-bottom: 20px;">
                            <p style="font-size: 11px; color: #92400e; margin: 0; font-weight: bold; text-transform: uppercase;">⚠️ Pregunta Compartida</p>
                            <p style="font-size: 11px; color: #b45309; margin: 5px 0;">Se usa en ${pregunta.shared_count} templates.</p>
                            <div style="display: flex; gap: 15px; margin-top: 5px;">
                                <label style="font-size: 11px; display: flex; align-items: center; gap: 6px;">
                                    <input type="radio" name="clone-logic" value="master" checked> Actualizar en todos
                                </label>
                                <label style="font-size: 11px; display: flex; align-items: center; gap: 6px;">
                                    <input type="radio" name="clone-logic" value="clone"> Clonar solo para este
                                </label>
                            </div>
                        </div>
                    ` : ''}

                    <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Texto de la Pregunta</label>
                    <textarea id="swal-texto" class="swal2-textarea" style="width: 100%; margin: 8px 0 20px 0; height: 80px; font-size: 14px;">${pregunta?.texto || ''}</textarea>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div>
                            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Dimensión</label>
                            <select id="swal-dimension" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; height: 40px;">
                                <option value="">Sin dimensión</option>
                                ${dimensions.map(d => `<option value="${d.id}" ${d.id === pregunta?.dimension_id ? 'selected' : ''}>${d.nombre}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Sub-Dimensión</label>
                            <input id="swal-subdimension" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; height: 40px;" value="${pregunta?.subdimension || ''}">
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div>
                            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Tipo de Respuesta</label>
                            <select id="swal-tipo" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; height: 40px;" onchange="
                                const type = this.value;
                                document.getElementById('div-escala').style.display = (type === 'escala' || type === 'nps') ? 'block' : 'none';
                                document.getElementById('div-opciones').style.display = (type === 'seleccion' || type === 'seleccion_unica' || type === 'seleccion_multiple') ? 'block' : 'none';
                            ">
                                <option value="escala" ${pregunta?.tipo === 'escala' ? 'selected' : ''}>Escala Numérica</option>
                                <option value="nps" ${pregunta?.tipo === 'nps' ? 'selected' : ''}>NPS (Net Promoter Score)</option>
                                <option value="seleccion" ${pregunta?.tipo === 'seleccion' ? 'selected' : ''}>Selección (Botones)</option>
                                <option value="texto" ${pregunta?.tipo === 'texto' ? 'selected' : ''}>Comentario Libre</option>
                                <option value="seleccion_multiple" ${pregunta?.tipo === 'seleccion_multiple' ? 'selected' : ''}>Selección Múltiple</option>
                            </select>
                        </div>
                        <div id="div-escala" style="display: ${(pregunta?.tipo === 'escala' || pregunta?.tipo === 'nps' || isNew) ? 'block' : 'none'};">
                            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Escala Máxima</label>
                            <input id="swal-escala" type="number" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; height: 40px;" value="${pregunta?.escala || 10}">
                        </div>
                    </div>

                    <div id="div-opciones" style="display: ${(pregunta?.tipo?.includes('seleccion') || false) ? 'block' : 'none'}; margin-bottom: 20px;">
                        <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Opciones (separadas por coma)</label>
                        <input id="swal-opciones" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; font-size: 13px;" value="${opcionesStr}" placeholder="Ej: Muy Bueno, Bueno, Regular, Malo">
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; align-items: center;">
                         <div>
                            <label style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Orden</label>
                            <input id="swal-orden" type="number" class="swal2-input" style="width: 100%; margin: 8px 0 0 0; height: 40px;" value="${pregunta?.orden || (preguntas.length + 1)}">
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px; margin-top: 20px; background: #f8fafc; padding: 10px; border-radius: 8px;">
                            <input type="checkbox" id="swal-nps-check" style="width: 18px; height: 18px;" ${pregunta?.es_nps ? 'checked' : ''}>
                            <label for="swal-nps-check" style="margin: 0; font-size: 11px; font-weight: bold; color: #1e3a8a;">MARCAR COMO KPI NPS</label>
                        </div>
                    </div>
                </div>
            `,
            width: '650px',
            focusConfirm: false,
            showCancelButton: true,
            preConfirm: () => {
                const cloneLogic = document.querySelector('input[name="clone-logic"]:checked')?.value;
                const rawOpciones = document.getElementById('swal-opciones').value;
                return {
                    pregunta_id: pregunta?.pregunta_id || pregunta?.id,
                    template_id: selectedTemplate.id,
                    dimension_id: document.getElementById('swal-dimension').value || null,
                    subdimension: document.getElementById('swal-subdimension').value,
                    texto: document.getElementById('swal-texto').value,
                    tipo: document.getElementById('swal-tipo').value,
                    escala: document.getElementById('swal-escala').value,
                    es_nps: document.getElementById('swal-nps-check').checked ? 1 : 0,
                    orden: document.getElementById('swal-orden').value,
                    solo_este_template: cloneLogic === 'clone',
                    opciones_json: rawOpciones ? rawOpciones.split(',').map(s => s.trim()).filter(Boolean) : [],
                    requerida: 1
                };
            }
        });

        if (formValues) {
            try {
                await axios.post(`${API_BASE}/preguntas`, formValues);
                loadPreguntas(selectedTemplate.id);
                Swal.fire('Guardado', '', 'success');
            } catch (err) { Swal.fire('Error', err.message, 'error'); }
        }
    };

    const handleEliminarPregunta = async (p) => {
        const confirm = await Swal.fire({
            title: '¿Eliminar?',
            text: "Se quitará de este template.",
            icon: 'warning',
            showCancelButton: true
        });

        if (confirm.isConfirmed) {
            await axios.delete(`${API_BASE}/preguntas/${selectedTemplate.id}/${p.pregunta_id || p.id}`);
            loadPreguntas(selectedTemplate.id);
        }
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                <header style={styles.header}>
                    <div>
                        <h1 style={styles.title}>Gestor de Estructura de Encuestas</h1>
                        <p style={styles.subtitle}>Configuración de Biblioteca Maestro y Templates</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handleCrearDimension} style={styles.btnOutline}>+ Nueva Dimensión</button>
                        <button onClick={handleCrearTemplate} style={styles.btnPrimary}>+ Nuevo Template</button>
                    </div>
                </header>

                <div style={styles.layout}>
                    <aside style={{ ...styles.sidebar, display: 'flex', flexDirection: 'column', height: 'fit-content', minHeight: '600px' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={styles.sectionTitle}>{showInactives ? 'Templates Inactivos' : 'Templates Activos'}</h3>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '20px', paddingRight: '5px' }}>
                            {loading ? <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>Cargando...</p> : (
                                <div style={styles.list}>
                                    {templates
                                        .filter(t => showInactives ? !t.activo : t.activo)
                                        .map(t => (
                                            <div 
                                                key={t.id} 
                                                onClick={() => handleSelectTemplate(t)}
                                                style={{
                                                    ...styles.listItem,
                                                    background: selectedTemplate?.id === t.id ? 'var(--bg-muted)' : 'var(--bg-container)',
                                                    borderColor: selectedTemplate?.id === t.id ? 'var(--secondary-color)' : 'var(--border-color)',
                                                    padding: '15px'
                                                }}
                                            >
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '14px' }}>{t.nombre}</div>
                                                    <div style={{ fontSize: '10px', color: t.activo ? 'var(--success-color)' : 'var(--danger-color)', fontWeight: 'bold', marginTop: '4px' }}>
                                                        {t.activo ? '● ACTIVO' : '● INACTIVO'}
                                                    </div>
                                                </div>
                                                <button onClick={(e) => { e.stopPropagation(); handleEditTemplate(t); }} style={styles.btnIconSmall}>✏️</button>
                                            </div>
                                        ))}
                                    {templates.filter(t => showInactives ? !t.activo : t.activo).length === 0 && !loading && (
                                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-light)', fontSize: '13px' }}>
                                            No hay templates {showInactives ? 'inactivos' : 'activos'}.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button 
                            onClick={() => setShowInactives(!showInactives)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                background: showInactives ? 'var(--bg-muted)' : 'var(--bg-container)',
                                color: showInactives ? 'var(--secondary-color)' : 'var(--text-muted)',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
                            }}
                        >
                            {showInactives ? '← VOLVER A ACTIVOS' : 'VER INACTIVOS 📁'}
                        </button>
                    </aside>

                    <main style={styles.main}>
                        {selectedTemplate ? (
                            <div className="fade">
                                <div style={styles.mainHeader}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)' }}>Estructura: {selectedTemplate.nombre}</h2>
                                        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{preguntas.length} preguntas vinculadas</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={handleSelectFromLibrary} style={styles.btnSecondary}>🔍 Biblioteca Maestro</button>
                                        <button onClick={() => handleEditPregunta()} style={styles.btnPrimary}>+ Añadir Pregunta</button>
                                    </div>
                                </div>

                                <div style={styles.tableCard}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr style={styles.th}>
                                                <th style={{ ...styles.thCell, width: '40px' }}>#</th>
                                                <th style={styles.thCell}>Pregunta</th>
                                                <th style={styles.thCell}>Dimensión</th>
                                                <th style={styles.thCell}>Tipo</th>
                                                <th style={{ ...styles.thCell, textAlign: 'center', width: '100px' }}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {preguntas.length === 0 ? (
                                                <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-light)' }}>Template vacío.</td></tr>
                                            ) : preguntas.map(p => (
                                                <tr key={p.assignment_id || p.id} style={styles.tr}>
                                                    <td style={styles.tdCell}>{p.orden}</td>
                                                    <td style={styles.tdCell}>
                                                        <div style={{ fontWeight: 'bold', color: '#334155' }}>{p.texto}</div>
                                                        {p.shared_count > 1 && <div style={{ fontSize: '10px', color: '#b45309' }}>♻️ Compartida en {p.shared_count} templates</div>}
                                                    </td>
                                                    <td style={styles.tdCell}>
                                                        <span style={styles.dimensionBadge}>{p.dimension_nombre || 'General'}</span>
                                                        {p.subdimension && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.subdimension}</div>}
                                                    </td>
                                                    <td style={styles.tdCell}>
                                                        <span style={styles.typeBadge}>{p.tipo.toUpperCase()}</span>
                                                        {p.tipo === 'escala' && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Rango: 1-{p.escala || 10}</div>}
                                                        {p.es_nps === 1 && <div style={{ fontSize: '10px', color: 'var(--secondary-color)', fontWeight: 'bold' }}>NPS KPI</div>}
                                                    </td>
                                                    <td style={styles.tdCell}>
                                                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                                                            <button onClick={() => handleEditPregunta(p)} style={styles.btnIcon}>✏️</button>
                                                            <button onClick={() => handleEliminarPregunta(p)} style={{ ...styles.btnIcon, color: 'var(--danger-color)' }}>🗑️</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div style={styles.emptyState}>
                                <div style={{ fontSize: '64px', marginBottom: '20px' }}>📋</div>
                                <h3 style={{ color: 'var(--text-main)' }}>Selecciona un template</h3>
                                <p style={{ color: 'var(--text-muted)' }}>Configura las dimensiones y preguntas de tus encuestas.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

const styles = {
    page: { background: '#f8fafc', minHeight: '100vh', padding: '40px 20px' },
    container: { maxWidth: '1300px', margin: '0 auto' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' },
    title: { margin: 0, fontSize: '26px', fontWeight: 'bold', color: 'var(--text-main)' },
    subtitle: { margin: 0, color: 'var(--text-muted)', fontSize: '14px' },
    layout: { display: 'grid', gridTemplateColumns: '320px 1fr', gap: '30px', alignItems: 'start' },
    sidebar: { background: 'var(--bg-container)', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' },
    sectionTitle: { fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
    list: { display: 'flex', flexDirection: 'column', gap: '12px' },
    listItem: { padding: '15px', borderRadius: '12px', cursor: 'pointer', border: '1.5px solid #f1f5f9', display: 'flex', alignItems: 'center', transition: 'all 0.2s ease' },
    main: { minHeight: '600px' },
    mainHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' },
    tableCard: { background: 'var(--bg-container)', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    th: { background: '#f8fafc', borderBottom: '1.5px solid #f1f5f9' },
    thCell: { padding: '15px', fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.02em' },
    tdCell: { padding: '18px 15px', borderBottom: '1px solid #f1f5f9', fontSize: '14px' },
    tr: { transition: 'background 0.2s', '&:hover': { background: '#fcfdfe' } },
    dimensionBadge: { background: 'var(--bg-muted)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
    typeBadge: { background: 'var(--bg-muted)', color: 'var(--secondary-color)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' },
    btnPrimary: { background: 'var(--secondary-color)', color: 'var(--bg-container)', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease' },
    btnSecondary: { background: 'var(--bg-container)', color: 'var(--text-muted)', border: '1.5px solid #e2e8f0', padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease' },
    btnOutline: { background: 'transparent', color: 'var(--secondary-color)', border: '1.5px solid #3b82f6', padding: '12px 24px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s ease' },
    btnIcon: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', opacity: 0.7, '&:hover': { opacity: 1 } },
    btnIconSmall: { background: '#f8fafc', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '8px', borderRadius: '8px', transition: 'all 0.2s ease' },
    emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '500px', color: 'var(--text-light)', background: 'var(--bg-container)', borderRadius: '16px', border: '2px dashed #e2e8f0' }
};
