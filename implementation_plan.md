# Plan de Implementación: Gestión de Empresas y Traspaso Masivo

Refactorizaremos el módulo de **Gestión de Personal** (`/gestion-ejecutivas`) para convertirlo en el centro de **Gestión de Empresas** (`/gestion-empresas`). Actualizaremos los accesos en el sidebar, el enrutamiento del frontend y crearemos una interfaz premium con soporte para:
1. Crear, editar y eliminar empresas.
2. Modificar ejecutivas y jefaturas.
3. Un flujo de **Traspaso Masivo** (bulk transfer) intuitivo y potente para migrar carteras completas o parciales de empresas entre distintos equipos de ejecutivas/jefaturas.

---

## Confirmación de Lógica de Negocio

> [!IMPORTANT]
> **Relación Ejecutivas - Empresas - Jefaturas:**
> En la base de datos, las empresas están asociadas a una jefatura (`jefatura_id`) y las ejecutivas a su vez pertenecen a una jefatura (`jefatura_id`). Por ende, una empresa es gestionada por el grupo de ejecutivas asignadas a esa jefatura.
> Para que el usuario tenga una experiencia clara, en las listas y selectores del frontend mostraremos las jefaturas con sus ejecutivas asociadas (por ejemplo: **`Jefatura: Juan Pérez (Ejecutivas: Ana, Claudia, María)`**). De este modo, realizar un traspaso a una jefatura equivale exactamente a reasignar las empresas a la nueva ejecutiva y su equipo.

---

## Cambios Propuestos

### 1. Backend (API REST)

#### [MODIFY] [empresas.controller.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/backend/modules/empresas/empresas.controller.js)
- **`actualizarEmpresa`**: Modificar para que permita actualizar tanto el `nombre` como el `jefatura_id`.
- **`crearEmpresa` [NEW]**: Endpoint para registrar una nueva empresa con nombre y jefatura.
- **`eliminarEmpresa` [NEW]**: Endpoint para dar de baja una empresa del sistema.
- **`traspasoMasivo` [NEW]**: Endpoint que recibe `{ source_jefatura_id, target_jefatura_id, empresa_ids }`. Actualiza la `jefatura_id` de forma masiva para las empresas seleccionadas en una sola transacción SQL.

#### [MODIFY] [empresas.routes.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/backend/modules/empresas/empresas.routes.js)
- Agregar rutas para:
  - `POST /` -> `crearEmpresa`
  - `DELETE /:id` -> `eliminarEmpresa`
  - `POST /traspaso-masivo` -> `traspasoMasivo`

---

### 2. Frontend (Single Page Application)

#### [MODIFY] [Sidebar.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/components/Sidebar.jsx)
- Actualizar el elemento de menú `/gestion-ejecutivas`:
  - Cambiar `path` a `/gestion-empresas`
  - Cambiar `label` a `'Empresas'`
  - Cambiar `title` a `'Gestión de Empresas'`
  - Reemplazar el icono SVG por uno de tipo "Edificio/Empresa/Maletín".
- Modificar el filtro de permisos de admin para ocultar `/gestion-empresas` en lugar de `/gestion-ejecutivas` si no es administrador.

#### [MODIFY] [App.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/App.jsx)
- Cambiar la importación de `GestionEjecutivas` a `GestionEmpresas` desde `./pages/GestionEmpresas`.
- Cambiar la ruta `/gestion-ejecutivas` por `/gestion-empresas` vinculada a `<GestionEmpresas />`.

#### [DELETE] `GestionEjecutivas.jsx`
- Eliminar el archivo antiguo para mantener la limpieza del proyecto.

#### [NEW] [GestionEmpresas.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/pages/GestionEmpresas.jsx)
Diseñaremos una interfaz avanzada de tres secciones colapsables (Jefaturas, Ejecutivas, Empresas) con un diseño visualmente impactante, sombras suaves y transiciones fluidas.

##### Características del panel de Empresas:
1. **Creación**: Botón `+ Nueva Empresa` que despliega un SweetAlert modal con inputs para Nombre de Empresa y Selección de Jefatura.
2. **Edición**: Modal que permite cambiar tanto el Nombre de la Empresa como su Jefatura asignada.
3. **Eliminación**: Botón de eliminación directa con modal Swal de confirmación.
4. **Sección de Traspaso Masivo**: Un workspace premium integrado:
   - Selector de **Jefatura Origen** y selector de **Jefatura Destino**.
   - Tabla dinámica con checkboxes de las empresas asociadas al Origen.
   - Botón general de "Seleccionar Todas".
   - Botón dinámico con micro-animación **"Ejecutar Traspaso"** que ejecuta el cambio en lote con feedback visual inmediato.

---

## Plan de Verificación

### Pruebas Automatizadas y Compilación
1. Ejecutar `npm run build` en el frontend para asegurar que el enrutamiento y las referencias del nuevo componente compilen perfectamente sin errores de TypeScript/Linter.

### Verificación Manual
1. **Creación de Empresa**: Registrar una empresa de prueba y verificar que se refleje inmediatamente en el listado y en la base de datos.
2. **Edición/Eliminación**: Renombrar la empresa de prueba y reasignarla de jefatura. Posteriormente, eliminarla para validar la eliminación física/lógica.
3. **Traspaso Masivo**:
   - Crear 3 empresas bajo una jefatura "A".
   - En el panel de Traspaso Masivo, seleccionar Origen: "A", Destino: "B".
   - Seleccionar 2 de las 3 empresas y presionar "Ejecutar Traspaso".
   - Verificar en la tabla de empresas que las 2 seleccionadas ahora pertenezcan a la jefatura "B" y la tercera permanezca en la jefatura "A".
