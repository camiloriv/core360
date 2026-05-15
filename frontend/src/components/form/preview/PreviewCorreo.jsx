import "./ReunionesForm.css";

function PreviewCorreo({ data }) {

  const fecha = new Date(data.fecha_reu || new Date());

  const fechaFormateada = fecha.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).replace(",", "");

  const hora = (data.hora || "").slice(0, 5);

  const htmlMinuta = data.minuta || "";

  const html = `
  <table width="100%" style="background:#f4f6f9; font-family:Segoe UI, Arial, sans-serif;">
    <tr>
      <td align="center">

        <!-- CONTENEDOR -->
        <table width="600" style="background:#ffffff; margin-top:20px; border:1px solid #eee;">

          <!-- HEADER -->
          <tr>
            <td style="padding:20px;">
              <div style="background:#f8f9fa; padding:15px; border-radius:8px;">
                <h2 style="margin:0; color:#2c3e50; border-bottom:2px solid #3498db; padding-bottom:10px;">
                  Minuta de Reunión
                </h2>

                <p><b>Participantes:</b> ${data.participantes || ""}</p>
                <p><b>Fecha:</b> ${fechaFormateada} | <b>Hora:</b> ${hora}</p>
                <p><b>Lugar:</b> ${data.lugar || ""}</p>
              </div>
            </td>
          </tr>

          <!-- OBJETIVO -->
          <tr>
            <td style="padding:0 20px;">
              <p style="font-weight:bold; color:#2980b9; text-transform:uppercase; font-size:12px;">
                Objetivo de la Reunión:
              </p>

              <div style="background:#ffffff; border:1px solid #e1e1e1; padding:15px; border-radius:5px;">
                ${data.motivo_reu || ""}
              </div>
            </td>
          </tr>

          <!-- HR -->
          <tr>
            <td style="padding:20px;">
              <hr style="border:0; border-top:1px solid #eee;">
            </td>
          </tr>

          <!-- TEMAS -->
          <tr>
            <td style="padding:0 20px;">
              <p style="font-weight:bold; color:#2980b9; text-transform:uppercase; font-size:12px;">
                Temas Tratados:
              </p>

              <div style="background:#ffffff; border:1px solid #e1e1e1; padding:15px; border-radius:5px;">
                ${htmlMinuta}
              </div>
            </td>
          </tr>

          <!-- ADJUNTOS -->
          <tr>
            <td style="padding:20px;">
              <p style="font-weight:bold; color:#2980b9; text-transform:uppercase; font-size:12px;">
                Adjuntos:
              </p>

              <div style="background:#ffffff; border:1px solid #e1e1e1; padding:15px; border-radius:5px;">
                ${data.documentos_adjuntos || "Sin adjuntos"}
              </div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:20px;">
              <div style="background:#2c3e50; color:#ffffff; padding:12px; border-radius:5px;">
                <p style="margin:0;">
                  <b>PRÓXIMA REUNIÓN:</b> Por definir
                </p>
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>

    <!-- FIRMA SIMPLE -->
    <tr>
      <td style="padding:20px; text-align:center;">
        <div style="border-top:1px solid #ddd; padding-top:15px;">
          <p style="margin:0; font-weight:bold;">
            ${data.enviado_por || "Equipo CORE360"}
          </p>
        </div>
      </td>
    </tr>

  </table>
  `;

  return (
    <div className="preview-container">
      <div className="preview-header">
        Vista previa del correo
      </div>

      <div
        className="preview-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

export default PreviewCorreo;
