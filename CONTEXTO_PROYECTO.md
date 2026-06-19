# Contexto Actual del Proyecto: Módulo de Agendamiento (Core360)

Este documento contiene un resumen técnico de los cambios estructurales, de lógica y de UI realizados en los últimos días. Sirve como contexto base para que cualquier agente de IA o desarrollador pueda entender rápidamente el estado actual de la plataforma y continuar el trabajo.

## 1. Arquitectura y Base de Datos (MySQL)
Se realizaron las siguientes modificaciones en las tablas a través de scripts de migración (`migrate.js`):
- **`reuniones`**: Se agregaron las columnas `asunto_teams` (para almacenar el "Subject" real desde Graph API) e `ical_uid` (identificador universal único del evento).
- **`reuniones_huerfanas`**: Se agregó la columna `ical_uid`.
- **`empresa_seguimiento_log`**: Se agregó la columna `asunto`.
- **Limpieza de Datos:** Se borraron todas las reuniones anteriores a 2026, reuniones creadas manualmente (sin URL de Teams) y se depuraron reuniones duplicadas. Actualmente, la base de datos solo almacena reuniones válidas originadas en Microsoft Teams desde el 1 de enero de 2026.

## 2. Backend (Node.js/Express) - Sincronización Graph API
El archivo principal modificado es `agendamiento.controller.js`, el cual maneja la sincronización (`syncEventosPasados`):
- **Prevención de Duplicados (iCalUId):** Debido a que múltiples ejecutivas de Proforma pueden estar en una misma reunión, Graph API devuelve el evento en cada uno de sus calendarios con distinto `event_id`. Se implementó un sistema de deduplicación que usa `event.iCalUId`. Antes de insertar, el sistema verifica si ese `ical_uid` ya existe en `reuniones` o `reuniones_huerfanas`. Si existe, se ignora, garantizando que el evento se registre solo una vez en toda la plataforma.
- **Sincronización del Asunto:** Ahora se extrae `event.subject` de Microsoft Graph y se guarda en la base de datos (reemplazando lógicas de tipos genéricos).
- **Eliminación de "Fantasmas":** Se incorporó una rutina al inicio de la sincronización que compara los eventos actuales del calendario del usuario contra los que están en la tabla `reuniones_huerfanas` en estado pendiente. Si el evento fue cancelado o borrado en Teams/Outlook, el sistema lo elimina automáticamente de la base de datos.

## 3. Frontend (React/Vite)
El archivo principal intervenido es `DashboardReuniones.jsx`:
- **Renderizado de Tabla:** La columna "TIPO / MOTIVO" ahora renderiza dinámicamente el `asunto_teams`, unificando la visualización independientemente de cómo se haya agendado.
- **Modal de "Vincular Empresa" (Reuniones Huérfanas):**
  - **Contexto visual:** El modal ahora muestra detalles vitales de la reunión antes de asignarla (Asunto, Fecha, Hora y una lista de los correos electrónicos de los Participantes Externos detectados).
  - **Buscador Autocompletado (Mejora UX):** Se reemplazó el `<select>` tradicional de empresas por un campo de texto `<input>` interactivo. A medida que el usuario escribe, el estado de React filtra la lista de `empresas` y despliega un menú desplegable (dropdown personalizado) permitiendo una selección y asignación sumamente rápida.

## 4. Estado Actual para Próximos Pasos
- La lógica de vinculación automática basada en dominios (ej. `@empresa.cl`) y correos específicos de contactos sigue operando correctamente para enviar reuniones directamente a la tabla `reuniones` vinculadas a una `empresa_id`.
- La plataforma está saneada y estable. Las modificaciones futuras deben respetar el uso de `ical_uid` para la inserción y modificación de eventos de Microsoft Graph.

---
**Instrucciones para el Asistente:**
*Utiliza este contexto para comprender cómo funciona el flujo de importación desde Microsoft Teams y cómo está estructurada actualmente la vista de DashboardReuniones.jsx. Toda nueva funcionalidad debe mantener el diseño de UI implementado y la integridad de los datos evitando duplicados.*
