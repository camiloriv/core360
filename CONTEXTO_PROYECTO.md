# Contexto Actual del Proyecto: Módulo de Agendamiento (Core360)

Este documento contiene un resumen técnico de los cambios estructurales, de lógica y de UI realizados. Sirve como contexto base para que cualquier agente de IA o desarrollador pueda entender rápidamente el estado actual de la plataforma y continuar el trabajo.

## 1. Arquitectura y Base de Datos (MySQL)
El sistema utiliza las siguientes tablas principales para el flujo de agendamiento:
- **`teams_eventos`**: Fuente de verdad de todos los eventos sincronizados desde Microsoft Teams. Contiene `event_id`, `ical_uid` (identificador universal único del evento), `asunto`, `fecha`, `hora`, `asistentes` (JSON), `organizador` (JSON), `body_preview`, y estado (`agendada`, `pasada`, `cancelada`, `excluida`). Se vincula a `usuarios` (vía `usuario_id`) y opcionalmente a `empresas` (vía `empresa_id`).
- **`minutas`**: Registro de minutas de reuniones. Se vincula opcionalmente a un `teams_evento_id` para asociar una minuta a un evento de Teams. Contiene campos para el editor TipTap (`minuta`), archivos adjuntos, estado de envío (`borrador`, `enviado`, `no_aplica`), y programación de encuestas.
- **`empresa_seguimiento_log`**: Historial de estados de seguimiento por empresa, incluyendo la columna `asunto`.
- **`empresa_dominios`**: Dominios de correo asociados a cada empresa (para detección automática de vinculación).
- **`empresa_contactos`**: Directorio de contactos por empresa.
- **`sync_log`**: Registro de ejecuciones de sincronización diaria con Teams.

> **Nota:** Las tablas antiguas `reuniones` y `reuniones_huerfanas` han sido deprecadas. El sistema actual usa exclusivamente `teams_eventos` y `minutas` como fuente de datos.

## 2. Backend (Node.js/Express) - Sincronización Graph API
El módulo de agendamiento (`/backend/modules/agendamiento/`) maneja la sincronización con Microsoft Teams:
- **Prevención de Duplicados (iCalUId):** Debido a que múltiples ejecutivas de Proforma pueden estar en una misma reunión, Graph API devuelve el evento en cada uno de sus calendarios con distinto `event_id`. Se implementó un sistema de deduplicación que usa `event.iCalUId`. Antes de insertar, el sistema verifica si ese `ical_uid` ya existe en `teams_eventos`. Si existe, se ignora, garantizando que el evento se registre solo una vez en toda la plataforma.
- **Sincronización del Asunto:** Se extrae `event.subject` de Microsoft Graph y se guarda en la columna `asunto` de `teams_eventos`.
- **Eliminación de Eventos Cancelados:** Se incorporó una rutina al inicio de la sincronización que compara los eventos actuales del calendario del usuario contra los que están en la tabla `teams_eventos` en estado pendiente. Si el evento fue cancelado o borrado en Teams/Outlook, el sistema lo marca como `cancelada` automáticamente.
- **Detección Inteligente de Empresa:** Al sincronizar, el sistema analiza los dominios de correo de los asistentes externos y los compara contra `empresa_dominios` para vincular automáticamente el evento a una empresa.
- **Sincronización Diaria:** Tarea programada a las 3:00 AM (Chile) vía node-cron que sincroniza todos los calendarios automáticamente.

## 3. Frontend (React/Vite)
Las vistas principales del módulo de agendamiento son:
- **`DashboardReuniones.jsx`:** Dashboard analítico con KPIs, gráficos de radar (Recharts), tabla de reuniones con filtros avanzados (zona, ejecutiva, empresa, rango de fechas) y exportación a Excel. La columna "TIPO / MOTIVO" renderiza dinámicamente el `asunto` del evento Teams.
- **`AgendarReunion.jsx`:** Calendario visual (React Big Calendar) para ver y gestionar eventos Teams. Permite sincronizar manualmente el calendario de cada ejecutiva.
- **`VincularReuniones.jsx`:** Vista para vincular eventos de Teams huérfanos (sin empresa asignada) a minutas del sistema. Incluye buscador autocompletado de empresas con dropdown interactivo.

## 4. Despliegue
- **Backend:** Desplegado en **Railway** (Node.js + MySQL gestionada).
- **Frontend:** Desplegado en **Cloudflare Pages** (`core360.pages.dev`).
- **Contenedores:** Docker y Docker Compose disponibles para desarrollo local.

## 5. Estado Actual para Próximos Pasos
- La lógica de vinculación automática basada en dominios (ej. `@empresa.cl`) y correos específicos de contactos sigue operando correctamente para enviar eventos directamente a la tabla `teams_eventos` vinculados a una `empresa_id`.
- La plataforma está saneada y estable. Las modificaciones futuras deben respetar el uso de `ical_uid` para la inserción y modificación de eventos de Microsoft Graph.

---
**Instrucciones para el Asistente:**
*Utiliza este contexto para comprender cómo funciona el flujo de importación desde Microsoft Teams y cómo está estructurada actualmente la vista de DashboardReuniones.jsx. Toda nueva funcionalidad debe mantener el diseño de UI implementado y la integridad de los datos evitando duplicados.*
