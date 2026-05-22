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
