import { useState } from "react";
import "./style.css";

function MarkdownHelpPanel() {

  const [open, setOpen] = useState(false);

  return (
    <>
      {/* BOTÓN FLOTANTE */}
      <button className="help-btn" onClick={() => setOpen(!open)}>
        ?
      </button>

      {/* PANEL */}
      <div className={`help-panel ${open ? "open" : ""}`}>

        <div className="help-header">
          <h3>Guía Markdown</h3>
          <button onClick={() => setOpen(false)}>✕</button>
        </div>

        <div className="help-content">

          <section>
            <h4>🔠 Títulos</h4>
            <pre>
{`# Título 1
## Título 2
### Título 3`}
            </pre>
          </section>

          <section>
            <h4>✍️ Texto</h4>
            <pre>
{`**Negrita**
*Cursiva*
~~Tachado~~`}
            </pre>
          </section>

          <section>
            <h4>📋 Listas</h4>
            <pre>
{`- Elemento con guión
* Elemento con asterisco

1. Paso uno
2. Paso dos`}
            </pre>
          </section>

          <section>
            <h4>✅ Tareas</h4>
            <pre>
{`- [x] Tarea completada
- [ ] Tarea pendiente`}
            </pre>
          </section>

          <section>
            <h4>🔗 Enlaces e Imágenes</h4>
            <pre>
{`[Texto del enlace](https://...)
![Texto alternativo](url_imagen.jpg)`}
            </pre>
          </section>

          <section>
            <h4>🗣️ Citas</h4>
            <pre>
{`> Esto es una cita importante.`}
            </pre>
          </section>

          <section>
            <h4>💻 Código</h4>
            <pre>
{`Texto con \`código en línea\`

\`\`\`
Bloque de
código
\`\`\``}
            </pre>
          </section>

          <section>
            <h4>➖ Separador</h4>
            <pre>
{`Texto arriba

---

Texto abajo`}
            </pre>
          </section>

          <section>
            <h4>⚠️ Importante</h4>
            <p>Asegúrate de dejar líneas en blanco antes y después de listas o separadores (<code>---</code>) para evitar errores de formato.</p>
          </section>

        </div>
      </div>
    </>
  );
}

export default MarkdownHelpPanel;
