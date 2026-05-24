# Tareas: Refactorización a Módulo de Empresas y Traspaso Masivo

- [x] **Modificar Backend (API)**
  - [x] Habilitar CRUD completo para empresas en `empresas.controller.js` (actualizar `actualizarEmpresa`, añadir `crearEmpresa` y `eliminarEmpresa`).
  - [x] Crear el endpoint de `traspasoMasivo` en `empresas.controller.js` para migrar empresas entre jefaturas en lote.
  - [x] Registrar las nuevas rutas (`POST /`, `DELETE /:id`, `POST /traspaso-masivo`) en `empresas.routes.js`.
- [x] **Modificar Frontend (Enrutamiento e Interfaz)**
  - [x] Diseñar el nuevo componente premium `GestionEmpresas.jsx` en `frontend/src/pages/`.
  - [x] Implementar la sección de CRUD de empresas con SweetAlert2 en el nuevo componente.
  - [x] Implementar la interfaz visual premium de "Traspaso Masivo" (doble listado y selección masiva).
  - [x] Eliminar el archivo antiguo `GestionEjecutivas.jsx`.
  - [x] Actualizar el sidebar en `Sidebar.jsx` (cambiar ruta `/gestion-ejecutivas` a `/gestion-empresas`, etiqueta a "Empresas", título y el icono SVG).
  - [x] Actualizar el enrutamiento en `App.jsx` (reemplazar la importación y la ruta `/gestion-ejecutivas` por `/gestion-empresas`).
- [x] **Verificación y Pruebas**
  - [x] Validar que al eliminar un template no se eliminen sus encuestas generadas ni sus respuestas (soft delete exitoso).
  - [x] Validar que los campos de los modales calcen con proporciones perfectas.
  - [x] Ejecutar el build de producción para validar la compilación sin errores.
  - [x] Verificar creación, edición y eliminación de empresas.
  - [x] Verificar el traspaso masivo de carteras de empresas.
  - [x] Validar que todas las vistas administrativas luzcan idénticas en estructura.
- [x] **Ajustes de Proporciones y Estandarización de Botones**
  - [x] Eliminar botones "editar/borrar" que causaban desproporción en las tarjetas de templates en la barra lateral.
  - [x] Implementar manejador de menú SweetAlert2 (`handleTemplateOptions`) interactivo para el template seleccionado con opciones premium para Cargar, Editar o Eliminar.
  - [x] Estandarizar los tres botones de cabecera ("Biblioteca Maestro", "Dimensiones" y "Nuevo Template") con el mismo formato estilizado, fuente y transiciones premium utilizando la clase `.btn-editor-header`.

- [/] **Corrección de Biblioteca Maestro**
  - [/] Eliminar `Swal.close()` de las acciones de transición en `handleSelectFromLibrary` para solucionar el problema de botones "Eliminar" y "Nueva Pregunta" que no funcionan.
  - [/] Garantizar la remoción total del botón "Vincular" y la limpieza de cualquier residuo en listeners.
  - [/] Mejorar la transición de reordenar preguntas en el panel de control del template para actualizarse instantáneamente sin parpadeos.
  - [/] Ejecutar compilación de producción con `npm run build` para asegurar cambios activos.

- [x] **5. Reestructuración de Filtros de Vista Cobertura (Administrador)**
  - [x] En `SeguimientoEmpresas.jsx`, reordenar la disposición espacial de los filtros.
  - [x] Agrupar Macro-Zona y Jefaturas / Ejecutivas arriba utilizando un diseño flexbox responsivo en paralelo (side-by-side).
  - [x] Renombrar la etiqueta del selector a `"Seleccionar Jefatura / Ejecutiva"`.
  - [x] Agrupar "Buscar Empresa" y "Avance de Cobertura" abajo en perfecta alineación vertical e inferior.
  - [x] Compilar con `npm run build` de forma limpia y exitosa.

- [x] **6. Rediseño Premium de la Vista de Login (CORE 360)**
  - [x] Implementar la estructura visual en `Login.jsx` con el fondo tecnológico oscuro de líneas de red SVG.
  - [x] Añadir el isotipo "CORE 360" estilizado en blanco con espaciado ancho (`letterSpacing`).
  - [x] Configurar los campos de correo y contraseña en formato píldora centrada sin íconos y con fondo `#eff4fc`.
  - [x] Configurar el botón `INGRESAR` en formato píldora azul acero (`#426ca5`) con transiciones suaves.
  - [x] Agregar el enlace "Ayuda | contactar al administrador" con el botón píldora azul `Ver >` abriendo un modal informativo.
  - [x] Agregar el divisor horizontal y el pie de página "CORE 360 | 2026".
  - [x] Compilar y validar el funcionamiento del flujo de login y respuestas de error.

- [x] **7. Simplificación del Modal de Control de Templates**
  - [x] Reestructurar `handleOpenTemplateManager` en `EditorEncuestas.jsx` para integrar el título y el estado del template en la cabecera del modal principal.
  - [x] Eliminar el contenedor gris `#f8fafc` redundante.
  - [x] Diseñar la barra de herramientas horizontal unificada con los botones de acción (`Renombrar`, `Vincular`, `Nueva Pregunta`, `Eliminar`).
  - [x] Asegurar que la tabla de preguntas se muestre directamente bajo la barra de herramientas.
  - [x] Probar el correcto funcionamiento de todas las acciones del modal.
  - [x] Compilar y validar el bundle final con `npm run build`.

- [x] **9. Edición Inline y Botón "Cambiar Estado" Unificado**
  - [x] Convertir el título del template en el modal en un campo `<input>` interactivo y editable.
  - [x] Programar el auto-guardado inmediato vía API al presionar Enter o perder foco (Blur).
  - [x] Sincronizar reactivamente el nuevo nombre en la barra lateral y los estados locales sin cerrar el modal.
  - [x] Fusionar los botones "Renombrar" y "Eliminar" en una única acción "Cambiar Estado".
  - [x] Crear el selector interactivo vertical (Activo, Inactivo, Eliminar) con loop visual fluido al cancelar.
  - [x] Corregir error de renderizado de HTML moviendo el título editable al parámetro `html` de `Swal.fire` (evitando que SweetAlert2 vuelque los atributos del input como texto plano).
  - [x] Compilar y verificar el bundle con `npm run build`.

- [x] **8. Pulido Estético Adicional (Filtros y Centrado)**
  - [x] Quitar el estado de visibilidad (`ACTIVO`/`INACTIVO`) en el modal del Panel de Control de Template.
  - [x] Quitar la etiqueta de estado del listado lateral de templates ("Templates Activos").
  - [x] Centrar los títulos principales en los modales SweetAlert2 del gestor de encuestas (Template Manager, Editar Template, Editar Pregunta).
  - [x] Compilar de forma limpia con `npm run build`.
  - [x] Reducir el padding de las celdas `th` y `td` de la tabla de "Resumen de Cobertura por Jefatura" a `8px 12px` (antes `12px 15px` / `15px`).
  - [x] Aplicar anchos fijos y compactos a las columnas estadísticas (`95px` para Pendientes, Solicitadas, Concretadas, Gestionadas y `80px` para Total).
  - [x] Alinear horizontalmente las columnas de cifras y sus respectivos badges al centro (`textAlign: 'center'`).
  - [x] Refinar el espaciado interno (`3px 8px`) y establecer un ancho mínimo (`minWidth: '24px'`) a los badges dinámicos de colores para uniformar la presentación visual.
  - [x] Ejecutar la compilación de producción con `npm run build` y corroborar el empaquetado impecable.

- [x] **Control de Expiración de Sesión Persistente (Inactividad de 30 min)**
  - [x] Modificar `Login.jsx` para almacenar el timestamp inicial `ultimoAcceso` en `localStorage` al iniciar sesión con éxito.
  - [x] Modificar `Sidebar.jsx` para remover `ultimoAcceso` en conjunto con el usuario en el botón de cerrar sesión manual.
  - [x] Refactorizar `useInactivityLogout.js` para realizar una validación de tiempo transcurrido en el montaje (`useEffect`), forzando el cierre de sesión inmediato si han pasado más de 30 minutos de inactividad mientras el navegador estuvo cerrado.
  - [x] Implementar optimización de escritura de timestamp (`throttling` de 5 segundos) en `useInactivityLogout.js` ante eventos de interacción (mousemove, click, scroll, etc.) para cuidar el rendimiento.
  - [x] Ejecutar compilación de producción con éxito.
