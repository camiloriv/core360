import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { Underline } from "@tiptap/extension-underline";
import { TextAlign } from "@tiptap/extension-text-align";
import { FontFamily } from "@tiptap/extension-font-family";
import { Extension } from "@tiptap/core";
import Swal from "sweetalert2";
import {
  Bold as BoldIcon, Italic as ItalicIcon, Underline as UnderlineIcon, Strikethrough as StrikeIcon,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
  Table as TableIcon,
  Trash2, Palette, Type, Columns, Rows, Eye,
  ChevronUp, ChevronDown, ChevronRight, GripHorizontal,
  CaseUpper, CaseLower,
  Plus, Minus, Highlighter
} from "lucide-react";

// Extensión personalizada para Tamaño de Fuente
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize }).run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run()
      },
    }
  },
});

// Extendemos TableCell y TableHeader para soportar el color de fondo de Excel y alineación vertical
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor || element.getAttribute('bgcolor') || element.getAttribute('data-bg') || null,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) return {}
          return { style: `background-color: ${attributes.backgroundColor}`, 'data-bg': attributes.backgroundColor }
        },
      },
      verticalAlign: {
        default: 'middle',
        parseHTML: element => element.style.verticalAlign || 'middle',
        renderHTML: attributes => {
          if (!attributes.verticalAlign) return { style: 'vertical-align: middle' }
          return { style: `vertical-align: ${attributes.verticalAlign}` }
        },
      },
    }
  },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.style.backgroundColor || element.getAttribute('bgcolor') || element.getAttribute('data-bg') || null,
        renderHTML: attributes => {
          if (!attributes.backgroundColor) return {}
          return { style: `background-color: ${attributes.backgroundColor}`, 'data-bg': attributes.backgroundColor }
        },
      },
      verticalAlign: {
        default: 'middle',
        parseHTML: element => element.style.verticalAlign || 'middle',
        renderHTML: attributes => {
          if (!attributes.verticalAlign) return { style: 'vertical-align: middle' }
          return { style: `vertical-align: ${attributes.verticalAlign}` }
        },
      },
    }
  },
});

const templateFranquicia = `<h4>Franquicia Tributaria</h4>
<ul>
  <li>Franquicia Tributaria y las oportunidades que nos ofrece.</li>
  <li>Certificación del gasto.</li>
  <li>Cuentas de Capacitación.</li>
  <li>Cálculo cobertura cursos.</li>
  <li>Cálculo de tramo Sence.</li>
  <li>Categorías de capacitación: Contrato, Pre y Post-contrato</li>
  <li>Cuenta de reparto.</li>
  <li>Modalidades y sus valores horas.</li>
  <li>Plazos Sence.</li>
  <li>Modalidades: Presencial, E-learning y A Distancia.</li>
  <li>Beneficio Mi Pyme.</li>
  <li>Viático y Traslado para actividades presenciales.</li>
</ul>`.trim();

const templateAgoras = `<h4>Inducción Ágoras</h4>
<ol>
  <li><b>Bienvenida:</b> Home de plataforma, en el cual se puede visualizar resumen de indicadores saldos de aportes y excedentes, horas, inversión y participantes, comparativo por años, detalle por meses y año.</li>
  <li><b>Cursos:</b> Detalle de cursos empresa, contrato, precontrato, postcontato; inscripción de cursos, creación de códigos de cursos empresa.</li>
  <li><b>Convocatoria:</b> Recordatorio de los participantes por la actividad por comenzar.</li>
  <li><b>Evaluación:</b> Instrumentos de evaluación (Reacción, Aprendizaje y Comportamiento).</li>
  <li><b>Pagos:</b> Detalle de pago por actividades costo OTIC.</li>
  <li><b>Informes:</b> Pestaña con cartola, detalle de cursos, participantes, informes de encuesta, etc.</li>
  <li><b>KPI:</b> Informe de indicadores de capacitación.</li>
  <li><b>KPIG:</b> Información más detallada de proveedores, cursos y personas.</li>
</ol>`.trim();

const MenuBar = ({ editor }) => {
  if (!editor) return null;
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [showDeleteOptions, setShowDeleteOptions] = useState(false);

  const groupStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0 12px',
    borderRight: '1px solid #e2e8f0',
    minHeight: '60px'
  };

  const labelStyle = {
    fontSize: '10px',
    color: '#94a3b8',
    marginTop: 'auto',
    fontWeight: 'bold',
    textTransform: 'uppercase'
  };

  const selectStyle = {
    padding: '2px 4px',
    height: '26px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    background: 'white',
    color: '#1e293b',
    outline: 'none',
    cursor: 'pointer'
  };

  const dropdownBtnStyle = {
    padding: '6px 10px',
    fontSize: '11px',
    textAlign: 'left',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: '4px',
    display: 'block',
    width: '100%',
    transition: 'background 0.2s'
  };

  const fontFamilies = [
    { name: 'Inter', value: 'Inter, sans-serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Times New Roman', value: 'Times New Roman, serif' },
    { name: 'Courier New', value: 'Courier New, monospace' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' }
  ];

  const fontSizes = ['8px', '10px', '11px', '12px', '14px', '15px', '16px', '18px', '20px', '24px', '32px', '48px'];

  const handleFontSizeChange = (increment) => {
    const currentSize = editor.getAttributes('textStyle').fontSize || '15px';
    const currentNumeric = parseInt(currentSize);

    let currentIndex = fontSizes.findIndex(s => parseInt(s) >= currentNumeric);
    if (currentIndex === -1) currentIndex = fontSizes.length - 1;

    let nextIndex = increment ? currentIndex + 1 : currentIndex - 1;

    if (increment && fontSizes[currentIndex] === currentSize) {
      nextIndex = currentIndex + 1;
    } else if (!increment && fontSizes[currentIndex] === currentSize) {
      nextIndex = currentIndex - 1;
    }

    if (nextIndex >= 0 && nextIndex < fontSizes.length) {
      editor.chain().focus().setFontSize(fontSizes[nextIndex]).run();
    }
  };

  const standardTextColors = ['#000000', '#475569', '#1e40af', '#b91c1c', '#15803d', '#7c3aed'];
  const standardCellColors = ['#ffffff', '#f1f5f9', '#e2e8f0', '#dbeafe', '#dcfce7', '#fef9c3', '#fee2e2'];

  return (
    <div className="editor-menubar" style={{ display: 'flex', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '8px 4px', borderTopLeftRadius: '12px', borderTopRightRadius: '12px', flexWrap: 'wrap', gap: '4px' }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .editor-menubar button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 4px;
          border-radius: 4px;
          border: 1px solid transparent;
          background: transparent;
          color: #475569;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 28px;
          height: 28px;
        }
        .editor-menubar button:hover {
          background-color: #f1f5f9;
          border-color: #e2e8f0;
          color: #0f172a;
        }
        .editor-menubar button.is-active {
          background-color: #e0e7ff;
          color: #4338ca;
          border-color: #c7d2fe;
        }
        .color-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 1px solid #cbd5e1;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .color-dot:hover {
          transform: scale(1.2);
          border-color: #94a3b8;
        }
      `}} />

      {/* Grupo FUENTE */}
      <div style={groupStyle}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
          <select
            onChange={e => editor.chain().focus().setFontFamily(e.target.value).run()}
            style={{ ...selectStyle, width: '100px' }}
            value={editor.getAttributes('textStyle').fontFamily || ''}
          >
            <option value="">Fuente</option>
            {fontFamilies.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
          </select>
          <select
            onChange={e => editor.chain().focus().setFontSize(e.target.value).run()}
            style={{ ...selectStyle, width: '65px' }}
            value={editor.getAttributes('textStyle').fontSize || '15px'}
          >
            <option value="15px">15px</option>
            {fontSizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '2px' }}>
            <button onClick={(e) => { e.preventDefault(); handleFontSizeChange(true); }} title="Aumentar"><Plus size={14} /></button>
            <button onClick={(e) => { e.preventDefault(); handleFontSizeChange(false); }} title="Disminuir"><Minus size={14} /></button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }} className={editor.isActive('bold') ? 'is-active' : ''}><BoldIcon size={16} /></button>
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }} className={editor.isActive('italic') ? 'is-active' : ''}><ItalicIcon size={16} /></button>
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }} className={editor.isActive('underline') ? 'is-active' : ''}><UnderlineIcon size={16} /></button>
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }} className={editor.isActive('strike') ? 'is-active' : ''}><StrikeIcon size={16} /></button>
          <div style={{ width: '1px', height: '20px', background: '#e2e8f0', margin: '0 4px' }}></div>
          <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }} title="Color de Texto">
            {standardTextColors.map(color => (
              <div key={color} className="color-dot" style={{ background: color }} onClick={() => editor.chain().focus().setColor(color).run()} />
            ))}
            <button onClick={(e) => { e.preventDefault(); editor.chain().focus().unsetColor().run(); }} style={{ minWidth: '18px', height: '18px', fontSize: '10px', padding: 0 }}>✕</button>
          </div>
        </div>
        <span style={labelStyle}>Fuente</span>
      </div>

      {/* Grupo PÁRRAFO */}
      <div style={groupStyle}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); }} className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}><AlignLeft size={16} /></button>
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); }} className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}><AlignCenter size={16} /></button>
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run(); }} className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}><AlignRight size={16} /></button>
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('justify').run(); }} className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}><AlignJustify size={16} /></button>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }} className={editor.isActive('bulletList') ? 'is-active' : ''}><List size={16} /></button>
          <button onClick={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }} className={editor.isActive('orderedList') ? 'is-active' : ''}><ListOrdered size={16} /></button>
        </div>
        <span style={labelStyle}>Párrafo</span>
      </div>

      {/* Grupo TABLA */}
      <div style={groupStyle}>
        <button
          onClick={(e) => { e.preventDefault(); setShowTableMenu(!showTableMenu); }}
          className={showTableMenu ? 'is-active' : ''}
          style={{ width: 'auto', padding: '0 10px', background: showTableMenu ? '#dbeafe' : 'transparent', fontWeight: 'bold' }}
        >
          <TableIcon size={18} style={{ marginRight: '6px' }} color={showTableMenu ? '#2563eb' : '#475569'} />
          TABLA
        </button>
        <span style={labelStyle}>Opciones</span>
      </div>

      {showTableMenu && (
        <div style={{ ...groupStyle, borderRight: 'none', background: '#f1f5f9', borderRadius: '8px', flexDirection: 'row', gap: '15px', padding: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={(e) => { e.preventDefault(); editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }}
              style={{ background: '#dcfce7', color: '#166534', fontSize: '10px', fontWeight: 'bold', width: 'auto', padding: '0 8px' }}
            >+ INSERTAR</button>
            <span style={{ fontSize: '9px', color: '#666' }}>Nueva</span>
          </div>
          <div style={{ width: '1px', height: '30px', background: '#cbd5e1' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              <div style={{ display: 'flex', gap: '2px', background: 'white', padding: '2px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <button onClick={(e) => { e.preventDefault(); editor.chain().focus().addColumnAfter().run(); }} title="Agregar Columna"><Columns size={14} color="#059669" /></button>
                <button onClick={(e) => { e.preventDefault(); editor.chain().focus().addRowAfter().run(); }} title="Agregar Fila"><Rows size={14} color="#059669" /></button>
                <div style={{ width: '1px', background: '#e2e8f0', margin: '0 2px' }}></div>
                <button onClick={(e) => { e.preventDefault(); editor.chain().focus().mergeCells().run(); }} title="Combinar"><CaseUpper size={14} /></button>
              </div>
              <div style={{ display: 'flex', gap: '2px', background: 'white', padding: '2px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <button onClick={(e) => { e.preventDefault(); editor.chain().focus().setCellAttribute('verticalAlign', 'top').run(); }}><ChevronUp size={14} /></button>
                <button onClick={(e) => { e.preventDefault(); editor.chain().focus().setCellAttribute('verticalAlign', 'middle').run(); }}><GripHorizontal size={14} /></button>
                <button onClick={(e) => { e.preventDefault(); editor.chain().focus().setCellAttribute('verticalAlign', 'bottom').run(); }}><ChevronDown size={14} /></button>
              </div>
              <div style={{ position: 'relative' }}>
                <button onClick={(e) => { e.preventDefault(); setShowDeleteOptions(!showDeleteOptions); }} style={{ color: showDeleteOptions ? '#ef4444' : '#64748b' }}><Trash2 size={16} /></button>
                {showDeleteOptions && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px', zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', minWidth: '120px' }}>
                    <button onClick={(e) => { e.preventDefault(); editor.chain().focus().deleteRow().run(); setShowDeleteOptions(false); }} style={dropdownBtnStyle}>Borrar Fila</button>
                    <button onClick={(e) => { e.preventDefault(); editor.chain().focus().deleteColumn().run(); setShowDeleteOptions(false); }} style={dropdownBtnStyle}>Borrar Columna</button>
                    <button onClick={(e) => { e.preventDefault(); editor.chain().focus().deleteTable().run(); setShowDeleteOptions(false); }} style={{ ...dropdownBtnStyle, background: '#ef4444', color: 'white' }}>BORRAR TABLA</button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
              {standardCellColors.map(color => (
                <div key={color} className="color-dot" style={{ background: color }} onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', color).run()} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function MinutaEditor({ form, setForm }) {
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({ resizable: true }),
      TableRow,
      CustomTableHeader,
      CustomTableCell,
      Underline,
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ['heading', 'paragraph', 'tableCell', 'tableHeader'] }),
    ],
    content: form.minuta || "",
    onUpdate: ({ editor }) => { setForm("minuta", editor.getHTML()); },
  });

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (editor && form.minuta !== editor.getHTML()) { editor.commands.setContent(form.minuta || ""); }
  }, [form.minuta, editor]);

  const insertTemplate = (e, templateText) => {
    e.preventDefault();
    if (editor) {
      editor.commands.insertContent(templateText);
    }
  };

  const handleClear = async (e) => {
    e.preventDefault();
    const result = await Swal.fire({
      title: '¿Borrar todo?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar',
    });
    if (result.isConfirmed && editor) { editor.commands.clearContent(); }
  };

  const handlePreview = (e) => { e.preventDefault(); setShowPreviewModal(true); };

  const getPreviewHTML = () => {
    if (!editor) return "";
    return `
      <style>
        .preview-container { font-family: 'Inter', 'Segoe UI', sans-serif; color: #1e293b; line-height: 1.6; padding: 40px; background: white; }
        .preview-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; margin-bottom: 24px; }
        .preview-title { font-size: 28px; font-weight: 800; color: #1e3a8a; margin: 0 0 12px 0; display: inline-block; border-bottom: 3px solid #3498db; padding-bottom: 4px; }
        .preview-info-table { width: 100%; border-collapse: collapse; margin-top: 15px; }

        .preview-info-table td { padding: 4px 0; font-size: 14px; border-bottom: 1px dashed #e2e8f0; }
        .preview-info-label { font-weight: 700; color: #1e3a8a; width: 110px; }
        .preview-info-value { color: #475569; }
        .preview-section-label { font-size: 12px; font-weight: 800; color: #1e3a8a; text-transform: uppercase; margin: 32px 0 12px 0; letter-spacing: 1px; }
        .preview-content-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; min-height: 60px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        
        .preview-content-box table { border-collapse: collapse; width: auto !important; min-width: 300px; margin: 15px 0; border: 1px solid #cbd5e1 !important; }
        .preview-content-box table tr:first-child td, .preview-content-box table tr:first-child th { background-color: #2563eb !important; color: #ffffff !important; font-weight: bold !important; text-align: center !important; border: 1px solid #2563eb !important; padding: 10px !important; }
        .preview-content-box td, .preview-content-box th { border: 1px solid #cbd5e1 !important; padding: 8px 14px !important; color: #334155 !important; vertical-align: middle; line-height: 1.4 !important; }
        .preview-content-box p { margin: 0 0 12px 0; }
        .preview-content-box ul, .preview-content-box ol { padding-left: 20px; margin-bottom: 12px; }
        .preview-content-box li { margin-bottom: 6px; }
      </style>
      <div class="preview-container" style="display: flex; justify-content: flex-start; width: 100%;">
        <div style="width: 100%; max-width: 800px;">
          <!-- BLOQUE CABECERA -->
          <div class="preview-card" style="text-align: left;">
            <h1 class="preview-title">Minuta de Reunión</h1>
            <div>
              <table class="preview-info-table">
                <tr>
                  <td class="preview-info-label">Participantes:</td>
                  <td class="preview-info-value">${form.participantes || ""}</td>
                </tr>
                <tr>
                  <td class="preview-info-label">Fecha:</td>
                  <td class="preview-info-value">${form.fecha_reu || ""}</td>
                </tr>
                <tr>
                  <td class="preview-info-label">Hora:</td>
                  <td class="preview-info-value">${form.hora || ""}</td>
                </tr>
                <tr>
                  <td class="preview-info-label">Lugar:</td>
                  <td class="preview-info-value">${form.lugar || ""}</td>
                </tr>
              </table>
            </div>
          </div>

          ${form.motivo_reu ? `
            <div class="preview-section-label">Objetivo de la Reunión:</div>
            <div class="preview-content-box">
              ${form.motivo_reu}
            </div>
          ` : ''}

          <!-- BLOQUE TEMAS -->
          <div class="preview-section-label">Temas Tratados:</div>
          <div class="preview-content-box" style="margin-bottom: 20px;">
            ${editor.getHTML() || '<p style="color:#94a3b8">Sin contenido...</p>'}
          </div>


        <!-- BLOQUE ADJUNTOS -->
        <div class="preview-section-label">Adjuntos:</div>
        <div class="preview-content-box" style="margin-bottom: 25px;">
          ${form.adjuntos && form.adjuntos.length > 0
        ? `<ul style="margin: 0; padding: 0; list-style: none;">
                ${Array.from(form.adjuntos).map(file => `
                  <li style="display: flex; align-items: center; margin-bottom: 5px; color: #64748b; font-size: 13px;">
                    <span style="margin-right: 8px;">📎</span> ${file.name || file}
                  </li>
                `).join('')}
               </ul>`
        : '<span style="color:#94a3b8; font-size: 13px;">Sin archivos adjuntos</span>'
      }
        </div>

        </div>
      </div>
    `;
  };

  return (
    <div className="field full" style={{ marginBottom: '40px' }}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .tiptap-editor-container .ProseMirror { min-height: 800px; padding: 40px 60px; outline: none; font-size: 15px; line-height: 1.2; color: #334155; font-family: 'Segoe UI', Arial, sans-serif; }
        .tiptap p { margin: 0 0 10px 0; text-align: inherit; width: 100%; }
        .tiptap table { border-collapse: collapse; table-layout: auto; width: auto; max-width: 100%; margin: 15px 0; border: 1px solid #000000; }
        .tiptap td, .tiptap th { min-width: 1em; border: 1px solid #000000; padding: 2px 8px; vertical-align: middle; position: relative; line-height: 1.2; }
        .tiptap table tr:first-child td, .tiptap table tr:first-child th { background-color: #e67e22; font-weight: bold; color: #000000; }
        .tiptap .selectedCell:after { z-index: 2; content: ""; position: absolute; left: 0; right: 0; top: 0; bottom: 0; background: rgba(200, 200, 255, 0.2); pointer-events: none; }
        .tiptap .column-resize-handle {
          position: absolute;
          right: -1px;
          top: 0;
          bottom: 0;
          width: 2px;
          background-color: transparent;
          pointer-events: none;
          z-index: 10;
        }
        .tiptap td:hover .column-resize-handle,
        .tiptap th:hover .column-resize-handle {
          background-color: #3b82f6;
          box-shadow: 0 0 4px rgba(59, 130, 246, 0.5);
          cursor: col-resize;
          pointer-events: all;
        }
        .tiptap .selectedCell .column-resize-handle {
          background-color: #3b82f6;
        }
      `}} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <label style={{ fontWeight: 'bold', color: '#1e293b' }}>Editor de Minuta (Avanzado)</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handlePreview} style={btnStyle('#f1f5f9', '#475569')}><Eye size={16} style={{ marginRight: '6px' }} /> Vista Previa</button>
          <button onClick={handleClear} style={btnStyle('#fee2e2', '#991b1b')}>Borrador Completo</button>
          <button onClick={(e) => insertTemplate(e, templateFranquicia)} style={btnStyle('#e0e7ff', '#3730a3')}>+ Inducción Franquicia</button>
          <button onClick={(e) => insertTemplate(e, templateAgoras)} style={btnStyle('#dcfce7', '#166534')}>+ Inducción Ágoras</button>
        </div>
      </div>
      <div className="tiptap-editor-container" style={{
        background: '#f1f5f9',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}>
        <div style={{
          width: '100%',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}>
          <MenuBar editor={editor} />
        </div>
        <div style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '30px 0'
        }}>
          <div style={{
            width: '800px',
            minHeight: '800px',
            background: 'white',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            borderRadius: '4px',
            marginBottom: '40px'
          }}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
      {showPreviewModal && (
        <div 
          onClick={() => setShowPreviewModal(false)}
          style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15, 23, 42, 0.8)', zIndex: 10000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px', cursor: 'pointer' }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', width: '100%', maxWidth: '900px', maxHeight: '90vh', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', cursor: 'default' }}
          >
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Vista Previa del Correo</h3>
              <button onClick={() => setShowPreviewModal(false)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Cerrar Vista</button>
            </div>
            <div style={{ padding: '32px', overflowY: 'auto', background: '#f1f5f9', display: 'flex', justifyContent: 'center' }}>
              <div style={{ width: '100%', maxWidth: '800px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', borderRadius: '4px' }} dangerouslySetInnerHTML={{ __html: getPreviewHTML() }} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const btnStyle = (bg, color) => ({ background: bg, color: color, border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', display: 'flex', alignItems: 'center' });

export default MinutaEditor;