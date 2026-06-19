function PreviewCorreo({ data }) {

  // Lógica para no mostrar fecha por defecto si no hay dato
  const fechaFormateada = data.fecha_reu 
    ? new Date(data.fecha_reu).toLocaleDateString("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).replace(",", "")
    : "";

  const hora = data.hora ? data.hora.slice(0, 5) : "";
  const htmlMinuta = data.minuta || "";

  const html = `
  <table width="100%" style="background:#f4f6f9; font-family:Segoe UI, Arial, sans-serif; padding: 20px 0;">
    <tr>
      <td align="center">

        <!-- CONTENEDOR -->
        <table width="600" style="background:#ffffff; border:1px solid #eee; border-radius: 8px; overflow: hidden;">

          <!-- HEADER -->
          <tr>
            <td style="padding:30px; background: #ffffff;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="margin:0; color:#ef4444; font-size: 28px; border-bottom: 3px solid #ef4444; display: inline-block; padding-bottom: 5px;">
                  Minuta de Reunión
                </h2>
              </div>


              <!-- RECUADRO DE DATOS -->
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="color:#4b5563; font-size: 14px; line-height: 2;">
                  <tr>
                    <td width="110" style="color: #1e3a8a;"><b>Participantes:</b></td>
                    <td style="border-bottom: 1px dashed #cbd5e1;">${data.participantes || ""}</td>
                  </tr>
                  <tr>
                    <td style="color: #1e3a8a;"><b>Fecha:</b></td>
                    <td style="border-bottom: 1px dashed #cbd5e1;">${fechaFormateada || ""}</td>
                  </tr>
                  <tr>
                    <td style="color: #1e3a8a;"><b>Hora:</b></td>
                    <td style="border-bottom: 1px dashed #cbd5e1;">${hora || ""}</td>
                  </tr>
                  <tr>
                    <td style="color: #1e3a8a;"><b>Lugar:</b></td>
                    <td style="border-bottom: 1px dashed #cbd5e1;">${data.lugar || ""}</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- OBJETIVO -->
          <tr>
            <td style="padding:0 30px;">
              <p style="font-weight:bold; color:#1e3a8a; text-transform:uppercase; font-size:12px; margin-bottom: 8px;">
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
