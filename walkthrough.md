# Walkthrough - Módulo de Gestión de Empresas y Traspasos Masivos

Hemos refactorizado por completo la pestaña de **Gestión de Personal** (`/gestion-ejecutivas`) para convertirla en el centro neurálgico de **Gestión de Empresas** (`/gestion-empresas`). Se actualizó el sidebar, el enrutamiento del frontend y creamos una interfaz premium con soporte CRUD completo y un panel avanzado de **Traspaso Masivo**.

---

## 🛠️ Cambios Realizados

### 1. Backend (API REST)
Extendimos y aseguramos los endpoints en el backend en una arquitectura modular limpia:

- **[MODIFY]** [empresas.controller.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/backend/modules/empresas/empresas.controller.js):
  - Modificamos `actualizarEmpresa` para permitir la edición tanto del **Nombre de la Empresa** como de su **Jefatura asociada**.
  - Añadimos `crearEmpresa` (`POST /`) que inserta la empresa en la BD y asigna su estado inicial como `'pendiente'`.
  - Añadimos `eliminarEmpresa` (`DELETE /:id`) para posibilitar la baja física directa de cuentas en el sistema.
  - Diseñamos `traspasoMasivo` (`POST /traspaso-masivo`) que acepta `{ source_jefatura_id, target_jefatura_id, empresa_ids }`, actualizando en lote las llaves foráneas en una única operación optimizada.
- **[MODIFY]** [empresas.routes.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/backend/modules/empresas/empresas.routes.js):
  - Registramos y expusimos públicamente los nuevos endpoints CRUD y de traspaso en lote.

### 2. Frontend (Single Page Application)

- **[NEW]** [GestionEmpresas.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/pages/GestionEmpresas.jsx):
  - **Estructura Depurada (UX Optimizada)**: Eliminamos por completo el listado y tabla inferior de empresas para evitar saturación visual y redundancia en la interfaz, dejando un espacio de trabajo limpio enfocado únicamente en la carga masiva y reasignación.
  - **Nueva Ubicación del Botón**: Reubicamos el botón **`🏢 + Nueva Empresa`** de forma elegante en la cabecera superior de la página, alineado a la derecha del título, con efectos de sombreado y micro-animaciones premium al pasar el mouse.
  - **Asociación de Ejecutivas en UI**: Para que la asignación sea comercialmente intuitiva, las opciones de Jefaturas en los selectores muestran dinámicamente sus ejecutivas asociadas, por ejemplo: `Beatriz Silva (Ejecutivas: Camilo Rivera, Lyan Becerra)`.
  - **Workspace Premium de Traspaso Masivo**:
    - **Pestaña de Traspaso Manual (Por Selección)**: Selectores inteligentes de origen y destino con un listado dinámico por casillas de verificación (`checkboxes`) para transferir cuentas específicas entre jefaturas de forma manual.
    - **Pestaña de Carga por Excel**: Zona interactiva para descargar la plantilla dinámica auto-generada con datos del sistema y cargar archivos `.xlsx`, `.xls` o `.csv` con previsualización del estado de cada fila en tiempo real (etiquetas `Listo` en verde o advertencias detalladas en rojo).
- **[DELETE]** `GestionEjecutivas.jsx`:
  - Eliminamos este archivo para mantener limpia la arquitectura de páginas y componentes.
- **[MODIFY]** [App.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/App.jsx):
  - Reemplazamos las importaciones y actualizamos el route provider para apuntar `/gestion-empresas` hacia `<GestionEmpresas />`.
- **[MODIFY]** [Sidebar.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/components/Sidebar.jsx):
  - Cambiamos la ruta, la etiqueta a **"Empresas"** y el título de la página a **"Gestión de Empresas"**.
  - Actualizamos la regla del filtro de permisos de administrador para filtrar la nueva URL `/gestion-empresas`.
  - Reemplazamos el icono SVG de usuarios por un icono de **Edificio de Negocios** corporativo premium.

---

## 🔬 Plan de Verificación y Compilación Exitosa

Para asegurar que todo funcione de manera consistente y sin roturas de código en el cliente React, compilamos el bundle de producción:

*   **Compilación Limpia con Vite**:
    *   Corrimos `npm run build` confirmando que todo el proyecto se empaqueta sin warnings o errores en el bundle final:
        ```bash
        vite v8.0.7 building client environment for production...
        transforming...✓ 2439 modules transformed.
        rendering chunks...
        dist/assets/index-CuXLF8Os.css     10.67 kB │ gzip:   2.61 kB
        dist/assets/index-CXOhX9rb.js   1,785.35 kB │ gzip: 537.44 kB
        ✓ built in 2.57s
        ```

---

## 🏛️ Homologación y Consistencia del Fondo de Pantalla (Background body)

Corregimos de manera definitiva una inconsistencia visual crítica relacionada con los colores de fondo del ecosistema CORE 360 al navegar entre las distintas pantallas.

### 1. El Problema Detectado
*   Anteriormente, el archivo de variables globales (`variables.css`) definía la variable `--bg-body` como un gris-azul frío y más oscuro (`#f4f6f9`).
*   La envoltura del diseño de rutas protegidas en `App.jsx` (`MainLayout`) utilizaba esta variable como fondo general de pantalla.
*   Sin embargo, las vistas individuales (al estar cargadas) sobreescribían el fondo a un off-white más suave, limpio y premium (`#f8fafc`).
*   Esto provocaba que:
    *   Durante las pantallas de **Carga / Loading** (donde se retorna un `div` simple sin estilos inline en vistas como `SeguimientoEmpresas.jsx`, `DashboardReuniones.jsx` y `GestionEmpresas.jsx`), la pantalla parpadeara mostrando el fondo `#f4f6f9`.
    *   Las vistas públicas (como `ResponderEncuesta.jsx`) o estados fallback renderizaran con `#f4f6f9` en lugar del elegante `#f8fafc`, generando inconsistencia visual en la experiencia de usuario.

### 2. Solución Implementada
*   **Ajuste en `variables.css`**: Modificamos directamente la variable de diseño global `--bg-body` asignándole el valor `#f8fafc`.
*   Esto asegura que:
    *   La base de la página (`body` en `base.css`) y el contenedor maestro `MainLayout` en `App.jsx` tengan el fondo `#f8fafc` nativamente.
    *   Los componentes de carga, modales, encuestas públicas y todas las vistas del panel queden perfectamente alineadas y uniformes.
    *   Se eliminen por completo los parpadeos o cambios abruptos de tonalidades grises al navegar o refrescar la aplicación, ofreciendo una fluidez visual impecable y una estética sumamente premium.

### Instrucciones para Verificación Manual

1. **Ingresar como Administrador**: Acceda a la plataforma con una cuenta de rol `admin` para poder ver el módulo habilitado en el sidebar.
2. **Acceder a "Empresas" en el Sidebar**: Verifique que el texto diga "Empresas", que aparezca el icono de edificio corporativo, y que al hacer clic se navegue correctamente a `/gestion-empresas`.
3. **Probar el CRUD de Empresas**:
   - Abra el panel colapsable "Empresas Registradas" y presione el botón **+ Nueva Empresa**. Escriba un nombre, seleccione su Jefatura/Ejecutivas y confirme. Verifique que aparezca en el listado.
   - Presione **Editar** en una empresa existente, modifique su nombre y jefatura y guarde.
   - Presione **Eliminar** en una empresa de prueba y confirme la baja de la cuenta.
4. **Probar el Traspaso Masivo**:
   - Despliegue el panel **Traspaso Masivo de Carteras (Lote)**.
   - Seleccione una jefatura en **Origen**. Automáticamente se listarán sus empresas asociadas con casillas.
   - Seleccione una jefatura diferente en **Destino**.
   - Marque algunas empresas (o presione "Seleccionar Todas") y haga clic en **Ejecutar Traspaso en Lote**.
   - Confirme el traspaso. Al finalizar, la lista se actualizará automáticamente y las empresas seleccionadas ahora se reflejarán bajo la Jefatura receptora en la tabla de empresas.

---

## 📈 Compactación de la Tabla de Cobertura (Detalle)

Hemos refinado el diseño de la tabla **"Resumen de Cobertura por Jefatura"** dentro de la pestaña de **Detalle** en la vista de **Seguimiento de Cobertura** (`SeguimientoEmpresas.jsx`). 

### Cambios Visuales y de Proporciones:
- **Reducción de Padding**: Ajustamos el espaciado interno de las celdas de cabecera (`th`) y de datos (`td`) de un holgado `12px 15px`/`15px` a un sumamente esbelto y profesional `8px 12px`.
- **Ancho Fijo Acotado para Cifras**: Se asignaron anchos fijos de control a todas las columnas numéricas (`width: '95px'` para Pendientes, Solicitadas, Concretadas y Gestionadas, y `width: '80px'` para la columna Total). Esto evita que los números y cabeceras queden excesivamente dispersos en pantallas panorámicas.
- **Alineación Centrada Elegante**: Se centró todo el contenido numérico y sus respectivas etiquetas para mantener una perfecta simetría y legibilidad.
- **Badges Estilizados y Uniformes**: Rediseñamos los contenedores de las cifras estadísticas (`padding: '3px 8px'`) y les fijamos un ancho mínimo (`minWidth: '24px'`), garantizando que tanto los números de un dígito como los de dos dígitos se muestren de forma idéntica, compacta y estética.

Esto erradica los espacios vacíos redundantes, logrando una presentación de datos corporativa sumamente limpia, premium y balanceada.

---

## 🔒 Control de Expiración de Sesión Persistente (Inactividad de 30 minutos)

Implementamos un sistema de control de expiración robusto e infalible, de modo que la inactividad de **30 minutos** se valide tanto si el navegador se mantiene abierto como si el usuario lo cierra, apaga su terminal o desconecta su computadora.

### Detalles de la Implementación:
1. **Timestamp Persistente (`ultimoAcceso`)**: 
   - Al iniciar sesión con éxito en [Login.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/pages/Login.jsx), se inicializa una clave `ultimoAcceso` en `localStorage` con la marca de tiempo exacta (`Date.now()`).
2. **Validación en Carga Primaria (Montaje)**:
   - Al montar el hook de seguridad [useInactivityLogout.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/hooks/useInactivityLogout.js), comparamos inmediatamente el timestamp guardado contra el tiempo actual. 
   - Si la diferencia excede los 30 minutos (el tiempo de timeout configurado), la sesión es destruida en el acto, limpiando todas las claves de `localStorage` y forzando la redirección al Login. Esto previene que un usuario regrese al sistema horas después tras cerrar el navegador y acceda sin credenciales.
3. **Monitoreo de Actividad Optimizado (`Throttling`)**:
   - En lugar de reescribir en el disco en cada mínimo movimiento del mouse (lo cual genera sobrecarga innecesaria de CPU), implementamos un estrangulador (`throttle`).
   - El timestamp `ultimoAcceso` en `localStorage` únicamente se actualiza si han transcurrido **más de 5 segundos** desde la última escritura, cuidando al máximo la fluidez y el rendimiento de la aplicación React.
4. **Cierre de Sesión Manual Limpio**:
   - Al cerrar sesión voluntariamente en la barra lateral ([Sidebar.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/components/Sidebar.jsx)), se limpian de forma segura tanto la clave de `usuario` como la de `ultimoAcceso`.

Esto brinda un balance ideal entre persistencia cómoda y seguridad informática estricta en el ecosistema CORE 360.

---

## 🔒 Rediseño de Vista de Login Premium (CORE 360)

Hemos rediseñado por completo la vista de inicio de sesión (`Login.jsx`) para que coincida de forma milimétrica con la imagen de referencia y las especificaciones solicitadas, creando una interfaz oscura, sofisticada y de excelente usabilidad.

### Cambios Clave Realizados:
- **Estructura Oscura Minimalista**: Eliminamos las tarjetas flotantes tradicionales y los blobs de color claro, logrando una estética ultra-limpia basada en un degradado lineal oscuro (`#2b2b2b` a `#1e1e1e`) y centrado absoluto.
- **Fondo de Red Tecnológica**: Añadimos un fondo de líneas de red y nodos circulares SVG asimétricos renderizados de forma dinámica a partir de porcentajes exactos de pantalla. Esto imita fielmente el patrón visual "tech" de la referencia sin sobrecargar la CPU.
- **Branding CORE 360**: Implementamos el logotipo "CORE 360" en mayúsculas utilizando tipografía geométrica blanca con espaciado de letras expandido (`letterSpacing: "8px"`), otorgando un aspecto sumamente moderno e institucional.
- **Campos en Formato Píldora Centrada**: Rediseñamos los campos de entrada como píldoras suaves y redondeadas (`borderRadius: "100px"`) con fondo azul-grisáceo muy claro (`#eff4fc`). El texto escrito y los placeholders están perfectamente al centro (`textAlign: "center"`).
- **Botón de Ingreso Azul Acero**: Diseñamos el botón píldora "INGRESAR" en el tono exacto de azul acero (`#426ca5`) con transiciones suaves en eventos de hover y active.
- **Sección de Ayuda Dinámica**: Añadimos el enlace "Ayuda | contactar al administrador" y el botón azul `Ver >`, configurado para disparar un cuadro modal informativo de SweetAlert2 con la información de soporte técnico (correo, teléfono y horarios).
- **Pie de Página CORE 360 | 2026**: Añadimos el divisor horizontal y el pie de página actualizado.
- **Compilación Exitosa**: Todo el bundle de producción compila de forma limpia en solo 3.38 segundos.

---

## ⚙️ Simplificación del Modal de Control de Templates

Hemos rediseñado y simplificado por completo el modal **"Panel de Control de Template"** en el panel de administración de encuestas (`EditorEncuestas.jsx`), eliminando la sobrecarga visual de contenedores y centralizando las acciones del administrador.

### Cambios Clave Realizados:
- **Encabezado Integrado**: Eliminamos la tarjeta gris intermedia (`#f8fafc`) que consumía espacio redundante. El nombre del template (ej. `📋 template_prueba`) ahora se sitúa directamente como el título principal en la parte superior del modal SweetAlert2, junto a un badge de visibilidad estilizado (`ACTIVO` en verde, `INACTIVO` en rojo) para una rápida confirmación de estado.
- **Barra de Herramientas Unificada**: Consolidamos todos los controles del template y de vinculación de preguntas en una única fila horizontal compacta y balanceada. El panel ahora muestra el contador de `"Preguntas Vinculadas (N)"` a la izquierda y agrupa las acciones a la derecha en botones píldora uniformes de `32px` de alto:
  - `✏️ Renombrar / Estado`
  - `🔍 Vincular`
  - `➕ Nueva Pregunta`
  - `🗑️ Eliminar`
- **Mayor Densidad Visual**: La tabla de preguntas vinculadas se monta directamente debajo de la barra unificada, reduciendo el espacio vertical desperdiciado y brindando una visualización inmediata del contenido del template con un scroll mínimo.
- **Validación**: Todas las funciones internas (vinculación, edición, eliminación de preguntas y reordenamiento ascendente/descendente) siguen operando de manera perfecta, y el bundle de producción compila de manera impecable en Vite en solo 2.14 segundos.

---

## 🎨 Ajustes Estéticos: Ocultación de Estados y Centrado de Títulos

Ajustamos la visualización en el gestor de encuestas (`EditorEncuestas.jsx`) para simplificar aún más el diseño del panel, ocultando los indicadores de estado y centrando las cabeceras de los cuadros de diálogo principales:

### Cambios Realizados:
- **Ocultación de Estado en Modales**: Removimos el badge dinámico `ACTIVO` / `INACTIVO` del título en el modal principal del Panel de Control de Template.
- **Ocultación de Estado en Barra Lateral**: Eliminamos por completo la visualización de los estados bajo los nombres de los templates dentro del listado de "Templates Activos" en el panel lateral, logrando una lista de navegación mucho más limpia y despejada.
- **Centrado de Título en Modales de Edición**: 
  - Centramos el título del modal del **Panel de Control de Template** (`📋 [Nombre]`).
  - Centramos el título del modal **"Editar Template"** (`title: "Editar Template"`).
  - Centramos el título de los modales de **"Nueva Pregunta"** y **"Editar Pregunta"** para lograr una armonía geométrica de los diálogos SweetAlert2.
- **Empaquetado Limpio**: El bundle de producción de Vite volvió a compilarse con total éxito en 2.68 segundos.

---

## ✏️ Edición de Título Inline y Botón "Cambiar Estado" Unificado

Refinamos significativamente la experiencia del administrador de encuestas (`EditorEncuestas.jsx`), permitiendo la edición instantánea del nombre del template directamente en la cabecera del modal y unificando los controles en un selector de estados interactivo:

### Cambios Clave Realizados:
- **Título Editable Directamente en Modal**: Transformamos la etiqueta estática del título del template en un campo de entrada de texto (`<input>`) perfectamente centrado y estilizado. 
  - Cuenta con transiciones suaves en hover y focus.
  - Al hacer clic, se abre para edición. Al presionar **Enter** o hacer clic fuera del campo (**Blur**), el sistema realiza un guardado automático e instantáneo vía API, actualizando de forma reactiva la barra lateral y los estados locales de React sin requerir recargas de página o cierres del modal.
  - **Corrección de Renderizado de HTML**: Migramos todo este contenedor del encabezado editable al inicio del parámetro `html` de `Swal.fire` (en lugar del parámetro `title`). Esto soluciona de forma definitiva el error de parseo donde SweetAlert2 volcaba los atributos como texto plano (`placeholder="..." class="..." style="..."`) dentro de la etiqueta `<h2>` nativa de la ventana emergente.
  - **Limpieza de Etiquetas y Escala**: Eliminamos la etiqueta informativa secundaria `Nombre del Template (Haz clic para editar)` para lograr un aspecto minimalista, agrandamos el tamaño de la tipografía del input a unos imponentes `26px` en negrita, y ajustamos el relleno del contenedor principal (`padding-top: 12px`). Esto corrige de forma impecable las proporciones del modal, haciendo que la **X** del botón de cerrar se ubique perfectamente alineada y en equilibrio con la cabecera.
  - **Persistencia Abierta del Modal y Feedback Visual**: Reemplazamos la notificación `Toast.fire` de SweetAlert2 (que causaba que el modal principal se cerrara debido a la limitación de SweetAlert2 de un solo modal activo) por un **sistema de feedback visual directo en el DOM**. Al guardar con éxito, el input parpadea con un borde verde esmeralda brillante (`#10b981`) y un texto de confirmación elegante (`✓ Guardado con éxito`) aparece suavemente por debajo con una transición de opacidad durante 1.8 segundos, manteniendo el modal principal **completamente abierto y operativo** en todo momento.
- **Botón Unificado "Cambiar Estado"**: Fusionamos los botones `"Renombrar"` y `"Eliminar"` del menú de herramientas en un único control `"⚙️ Cambiar Estado"`. Al accionarlo, se despliega una tarjeta de selección SweetAlert2 compacta con tres opciones explícitas y coloreadas según su criticidad:
  - `🟢 ACTIVO` (Visible para envíos)
  - `🟡 INACTIVO` (Archivado / Oculto)
  - `🔴 ELIMINAR TEMPLATE` (Borrado lógico con control de confirmaciones)
- **Visual Loop Optimizada**: Al cancelar o culminar una acción en el selector de estados, el sistema retorna con suavidad al modal principal del template, garantizando un flujo interactivo ininterrumpido.
- **Compilación Flawless**: La compilación final empaquetó el bundle del cliente en Vite en solo 1.77 segundos.

---

## 🎨 Alineación de Buscador y Divisor Sutil (` | `) en Seguimiento de Cobertura

Hemos implementado un ajuste de diseño altamente solicitado en el panel de **Seguimiento de Cobertura** (`SeguimientoEmpresas.jsx`) para perfeccionar la alineación visual y la coherencia del diseño del Dashboard.

### Cambios Estéticos Aplicados:
1. **Condicionalización de la Etiqueta en `SearchableFilter`**: Modificamos el componente reutilizable `SearchableFilter.jsx` para que solo renderice el elemento `<label>` y su respectivo margen inferior de `6px` si la propiedad `label` fue provista. Esto evita la inserción de espacios verticales vacíos no deseados.
2. **Remoción de Etiqueta de Búsqueda**: Eliminamos la propiedad `label` en el buscador de empresas de la fila inferior en `SeguimientoEmpresas.jsx`. Al remover esta etiqueta superior redundante, el campo de búsqueda se alinea de forma impecable y simétrica en la misma línea que los botones de selección de vista.
3. **Divisor Vertical Sutil (` | `)**: Ajustamos el divisor a una visualización sumamente sutil (`width: '1px'`, `height: '20px'`, `background: '#cbd5e1'`) con un margen estrecho y balanceado (`margin: '0 6px'`), logrando separar elegantemente ambos componentes sin generar dispersión.
4. **Placeholder Intuitivo**: Actualizamos el placeholder del input a `"🔍 Buscar empresa..."` para mayor claridad del usuario final.
5. **Apego e Integración a la Izquierda**: El buscador se redujo levemente en ancho máximo (`maxWidth: "300px"`) y se eliminó su factor de crecimiento dinámico (`flex: "1 1 300px"`). Gracias a esto, el selector de vistas, el divisor vertical y el campo de búsqueda se sitúan de manera compacta y contigua, perfectamente apegados a la izquierda.
6. **Compilación de Producción Exitosa**: Validamos los cambios mediante la ejecución de un build limpio en Vite, logrando un empaquetado impecable en 46.97 segundos.

---

## 🔄 Sincronización Interactiva Bidireccional de Filtros

Implementamos una lógica inteligente de auto-completado y sincronización entre los filtros del Dashboard en `SeguimientoEmpresas.jsx`:

1. **Búsqueda Global Expandida**: El buscador `"Buscar Empresa"` ahora muestra todas las empresas permitidas para el usuario autenticado (independiente del filtro actual superior de Jefatura o Macro-Zona). Esto permite buscar cualquier empresa de forma instantánea.
2. **Sincronización Automática al Seleccionar Empresa**: Al buscar y elegir una empresa específica:
   - **Macro-Zona**: Se auto-selecciona automáticamente a `Matriz` o `Regiones` en base al campo `zona_nombre` de la empresa.
   - **Jefatura**: Se auto-selecciona la Jefatura/Ejecutiva encargada de dicha cuenta.
   - Esto actualiza instantáneamente los selectores superiores y despliega el estatus de la empresa seleccionada en las vistas.
3. **Reinicio Dinámico ("Todas")**: Al elegir la opción `"Todas"` en el buscador de empresas, los filtros superiores de **Macro-Zona** y **Jefatura / Ejecutiva** se restablecen a sus valores por defecto (`"Todas"` / `"TODAS"`).
4. **Remoción de Bucles de Efecto (`useEffect` Cascade)**: Eliminamos los ganchos reactivos implícitos en favor de flujos de control explícitos e imperativos en los controladores de eventos (`handleMacroZonaChange`, `handleJefaturaChange`, `handleEmpresaFilterChange`). Esto previene ciclos de actualización infinitos y reinicios no deseados de la UI.
5. **Compilación Impecable**: Empaquetado de producción de Vite exitoso en 9.88 segundos.

---

## 📈 Avance de Cobertura Dinámico y Proporcional

Rediseñamos la lógica de cálculo del componente de visualización de **Avance de Cobertura** (KPI de cabecera en el panel) para que refleje de manera matemáticamente precisa los datos correspondientes a los filtros de período, macro-zona, jefatura y búsqueda de empresas seleccionados de manera activa:

1. **Vincular Avance a `empresasFiltradas`**: Anteriormente, el total de empresas (`totalEmpresas`) y las empresas con reuniones listas (`totalGestionadas`) en el período se computaban usando la lista estática por jefatura (`empresasPorJefatura`), lo cual ignoraba búsquedas o filtros específicos. Hemos migrado este cálculo a la variable de control final `empresasFiltradas`.
2. **Cálculo de Progreso Proporcional en Tiempo Real**:
   - **Filtro de Período**: Las reuniones se computan rigurosamente evaluando el estado `'gestionada'` en los logs del período seleccionado (ej. `2026-05`).
   - **Filtro de Jefatura y Macro-Zona**: Si se selecciona una jefatura o macro-zona específica, el total de empresas y reuniones se reduce proporcionalmente a ese subconjunto.
   - **Buscador de Empresa**: Si el usuario busca y selecciona una sola empresa, el indicador en la cabecera se adaptará dinámicamente reflejando un avance del `100%` (si fue gestionada/reunida en el período) o `0%` (si está pendiente, solicitada o agendada), mostrando la etiqueta `"1 de 1"` o `"0 de 1"`.
3. **Verificación de Compilación**: Empaquetado de producción Vite ejecutado y completado de forma impecable en **7.71 segundos** con cero advertencias de archivos.

---

## 📊 Incorporación de Métricas de Reuniones Únicas (Dashboard de Reuniones)

Resolvimos de forma clara y definitiva la diferencia conceptual entre la métrica del **Dashboard de Reuniones** (`DashboardReuniones.jsx`) y la **Vista de Cobertura** (`SeguimientoEmpresas.jsx`), añadiendo tarjetas de información premium de fácil lectura:

### 1. Clarificación de Conceptos:
- **Dashboard de Reuniones**: Cuenta el **total bruto de reuniones/minutas** realizadas (si una sola empresa sostiene 3 reuniones en el mes, suma 3 en el total de actividad mensual).
- **Vista de Cobertura**: Cuenta la **cobertura única de empresas** (una empresa es una sola entidad corporativa y solo puede estar en un estado en el ciclo del período, por ejemplo, `'gestionada'`).

### 2. Nuevas Tarjetas Incorporadas:
Ampliamos el panel de KPIs en `DashboardReuniones.jsx` a una cuadrícula premium de **6 columnas**, integrando dos tarjetas clave que calculan la cardinalidad única en base a los filtros activos de macro-zona, jefatura, empresa y tipo:
- **`Empresas Únicas`**: Muestra la cantidad total de empresas distintas atendidas dentro del historial filtrado (`new Set(filteredReuniones.map(r => r.empresa_id)).size`).
- **`Este Mes (Únicas)`**: Muestra la cantidad de empresas distintas atendidas durante el mes calendario corriente, logrando sincronía exacta con la métrica de cobertura (por ejemplo, desplegando `12` empresas únicas frente a las `19` reuniones mensuales totales).
- **`Este Mes (Total)`**: Renombramos el anterior KPI "Este Mes" para diferenciarlo claramente de la cifra de empresas únicas.

### 3. Compilación Satisfactoria:
El código fuente empaquetó de forma impecable a través de Vite en un tiempo óptimo de **4.82 segundos** sin warnings.

---

## 🔧 Migraciones Automáticas de Base de Datos y Corrección de Advertencia Tiptap

Hemos implementado un sistema de base de datos auto-sostenible para resolver los errores 500 al guardar reuniones en entornos de producción (como Render) y solucionado advertencias de duplicados en la consola del desarrollador.

### 1. Migraciones Autónomas al Iniciar el Servidor (Backend)
- **Nuevo script de migración**: Creamos [migrate.js](file:///C:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20(1)/Escritorio/core360/backend/database/migrate.js) en `backend/database/` para unificar y verificar la presencia de todas las tablas y columnas creadas en desarrollo:
  - Crear la tabla `zonas` e insertar las macro-zonas por defecto.
  - Verificar y agregar las columnas `zona_id`, `gerencia_id` y `vistas_permitidas` en la tabla `usuarios`.
  - Verificar y agregar la columna `zona_id` en la tabla `empresas`.
  - Crear la tabla intermedia `usuario_gerencias` y migrar las relaciones previas.
  - Verificar y agregar la columna `activo` en `encuesta_catalogo_preguntas`.
  - Crear la tabla `empresa_seguimiento_log` y migrar los logs iniciales de cobertura.
- **Ejecución en Startup**: Modificamos [index.js](file:///C:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20(1)/Escritorio/core360/backend/index.js) de la API para que ejecute `runMigrations()` asíncronamente en el arranque del servidor, antes de abrir el puerto de escucha. Esto asegura que la base de datos de producción se actualice de forma transparente en cada despliegue, resolviendo el error 500 por la tabla faltante `empresa_seguimiento_log`.

### 2. Remoción de Advertencia de Duplicado de Extensión Tiptap (Frontend)
- En [MinutaEditor.jsx](file:///C:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20(1)/Escritorio/core360/frontend/src/components/form/fields/MinutaEditor.jsx), removimos el registro manual e importación de la extensión `Underline` desde `@tiptap/extension-underline` porque el paquete `StarterKit` de Tiptap v3 ya incluye soporte nativo de subrayado. Esto elimina la advertencia `[tiptap warn]: Duplicate extension names found: ['underline']` de la consola de desarrollo de forma permanente sin afectar la funcionalidad.

### 3. Resolución de Rutas Absolutas para Adjuntos en Multer
- **Problema**: Al subir archivos adjuntos en producción/desarrollo (Render), la petición fallaba con error 500 porque Multer utilizaba una ruta relativa (`uploads/`) dependiente del directorio de ejecución actual (`process.cwd()`). Si el proceso Node se iniciaba desde la raíz, no encontraba la carpeta y abortaba la operación, bloqueando el guardado y el consecuente envío de correos.
- **Solución**:
  - Modificamos [app.js](file:///C:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20(1)/Escritorio/core360/backend/app.js) para asegurar la creación del directorio `backend/uploads` en el arranque de la API mediante `fs.mkdirSync` y rutas absolutas independientes del entorno.
  - Modificamos [reuniones.routes.js](file:///C:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20(1)/Escritorio/core360/backend/modules/reuniones/reuniones.routes.js) para que la propiedad `destination` de Multer resuelva una ruta absoluta inequívoca a través de `path.resolve(__dirname, "../../uploads")`. Esto asegura que los archivos se carguen y adjunten exitosamente, permitiendo el flujo normal de guardado de minutas y envíos de emails.

---

## 📋 Reordenación de Campos en Registrar Reunión

Reorganizamos la estructura de los campos en el formulario para registrar reuniones ([ReunionesForm.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/components/reuniones/ReunionesForm.jsx)) para optimizar la usabilidad y la legibilidad según lo solicitado:

1. **Motivo al lado de Tipo Reunión**:
   - Movimos el bloque de **Motivo** justo después de **Tipo Reunión**.
   - Como ambos campos ocupan una sola columna en la grilla CSS de dos columnas, se renderizan perfectamente uno al lado del otro.

2. **En Copia (CC) debajo de Enviar A**:
   - Movimos el bloque de **En Copia (CC)** para que quede ubicado directamente debajo del campo de **Enviar A**.
   - Le asignamos la propiedad `full` a la sección de **En Copia (CC)** para que abarque las dos columnas del formulario. Esto no solo da una consistencia simétrica excelente al ubicarse entre los campos de ancho completo **Enviar A** y **Participantes**, sino que también brinda mucho más espacio para la edición de las múltiples direcciones de correo asociadas.

3. **Recarga Automática del CC al Cambiar de Empresa/Ejecutiva**:
   - Añadimos un `useEffect` que escucha los cambios en `form.empresa_id`. Al cambiar de empresa:
     - Bloquea temporalmente el input de copia reseteando `isCcEditable` a `false`.
     - Limpia el contenido actual de `correos_cc`.
     - En perfiles administrativos (`admin` o `gerencia`), restablece los campos `ejecutiva_id` y `jefatura_id` a `""` (ya que la lista de ejecutivas disponibles cambia por completo).
   - Añadimos un `useEffect` que escucha los cambios en `form.ejecutiva_id` para restablecer también `isCcEditable` a `false` al reasignar el usuario.
   - Estos reinicios gatillan de forma segura la consulta a la API (`getDefaultCc`) para traer los correos CC por defecto correspondientes a la nueva combinación seleccionada, evitando que persistan datos de la empresa anterior.

4. **Persistencia y Recarga de Empresas tras Envío**:
   - Solucionamos un bug en el hook [useSubmitReunion.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/hooks/reuniones/useSubmitReunion.js) donde, al culminar un envío exitoso, se llamaba a `setEmpresas([])` vaciando el listado del estado global, lo que impedía buscar/seleccionar empresas en la sesión actual sin refrescar.
   - Removimos el vaciado de empresas y expusimos el método `fetchEmpresas` en [useReunionesData.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/hooks/reuniones/useReunionesData.js).
   - Ahora, al registrar una minuta, se ejecuta `fetchEmpresas()` en la resolución exitosa del callback para volver a cargar el listado de empresas con su estatus actualizado, manteniendo el buscador 100% operativo de forma ininterrumpida.

5. **Exclusión de Prefijo de Prueba (`prueba_`) en Filtros Demo**:
   - Para permitir cambiar los correos de usuarios reales a formatos de prueba (ej: `prueba_correo@proforma.cl`) sin que el sistema los clasifique erróneamente como usuarios "Demo" (lo cual restringía su visibilidad únicamente a empresas de prueba/demo), ajustamos el helper de detección `isUserDemo`.
   - Modificamos la expresión para validar que, si bien la palabra "prueba" o "demo" esté presente en el correo, se descarte si contiene el patrón de email de prueba real `prueba_` (con guion bajo).
   - Este ajuste se aplicó de forma consistente en:
     - [ReunionesForm.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/components/reuniones/ReunionesForm.jsx)
     - [useReunionesData.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/hooks/reuniones/useReunionesData.js)
     - [useDashboardData.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/hooks/useDashboardData.js)
     - [CrearEncuesta.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/pages/CrearEncuesta.jsx)
     - [DashboardEncuestas.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/pages/DashboardEncuestas.jsx)
     - [GestionEmpresas.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/pages/GestionEmpresas.jsx)

6. **Lógica de CC por Roles e Inclusión del Remitente**:
   - Para proveer un respaldo del envío de minutas/encuestas a los usuarios logueados (ya que el servidor físico utiliza el correo remitente genérico `minutas@proforma.cl` y esto no deja copia en sus bandejas personales de "Enviados"), actualizamos y extrajimos la lógica de CC en el helper de backend `calcularDefaultCc`.
   - La nueva estructura incluye a todas las partes interesadas según el rol del remitente, sin filtrar su propia dirección:
     - **Ejecutiva**: Copia a Ejecutiva + Jefatura + Gerencia (Lilian Ortega).
     - **Jefatura**: Copia a Jefatura + Ejecutivas de su equipo + Gerencia (Lilian Ortega).
     - **Gerencia / Admin**: Copia a Gerencia + Ejecutiva seleccionada + Jefatura de la ejecutiva.
   - En el frontend, `ReunionesForm.jsx` y `reunionesService.js` ahora envían también el `user.id` (`enviado_por_id`) al backend para resolver de forma precisa e inequívoca el rol del remitente en el caso de correos de prueba duplicados.

7. **Mejoras en la Previsualización de Minuta**:
   - En el editor de minutas [MinutaEditor.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/components/form/fields/MinutaEditor.jsx), implementamos el formateador `formatPreviewDate` para cambiar la fecha del input estándar (`YYYY-MM-DD`) al formato tradicional chileno `DD/MM/YYYY`.
   - Agregamos la previsualización del campo de texto **DOCUMENTOS ADJUNTOS** (`form.documentos_adjuntos`) bajo una sección dedicada "Documentos Adjuntos:", replicando fielmente el diseño de la plantilla HTML final.

8. **URL Dinámica para Encuestas**:
   - En el servicio de backend [encuestas.service.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/backend/modules/encuestas/encuestas.service.js), reemplazamos la dirección hardcodeada con `localhost` en la generación de enlaces de encuesta por la variable de entorno `${process.env.FRONTEND_URL || 'http://localhost:5173'}`. Esto permite que en el entorno de Railway se generen enlaces correctos con el dominio de desarrollo/producción configurado en lugar de enlaces locales inservibles.

### Validación
- El proyecto compila de manera impecable y sin errores en Vite tras realizar `npm run build`.

---

## 📅 Vista Móvil del Calendario (Estilo de Tarjetas y Cronológico)

Hemos rediseñado por completo el comportamiento y la visualización del calendario (`/agendar`) para dispositivos móviles (`max-width: 768px`) para proporcionar una experiencia de usuario premium adaptada:

1. **Ocultamiento del Calendario Tradicional**:
   - En pantallas móviles, se oculta completamente la grilla pesada del calendario estándar (React Big Calendar).

2. **Visualización de Tarjetas Cronológicas**:
   - **Vista de Día**: Muestra bloques horarios hora por hora desde las **06:00 hasta las 19:00**.
     - Los horarios con reuniones agendadas muestran una tarjeta detallada con el nombre del evento, rango de tiempo, y botones para unirse a Teams o eliminar/anular.
     - Los horarios disponibles se muestran como tarjetas discontinuas con la palabra **"Libre"**. Al hacer clic en ellas, se abre el modal de agendamiento preconfigurado para esa fecha y hora.
   - **Vista de Semana**: Agrupa los eventos día a día en la semana actual.
   - **Vista de Mes**: Agrupa los eventos del mes de forma cronológica vertical.

3. **Navegación e Interacción**:
   - Agregamos selectores de vista ("Día", "Semana", "Mes") en formato de barra de botones píldora.
   - Flechas de navegación para avanzar o retroceder de día/semana/mes de forma intuitiva.
   - Integración de un selector de fecha nativo oculto tras el indicador de fecha para saltos rápidos.

4. **Diseño de Botones Circulares Perfectos (Sin Óvalos)**:
   - Para las flechas de navegación (`‹` / `›`) y el botón de cierre del modal (`✕`), se ajustaron las propiedades CSS (`width`, `height`, `min-width`, `max-width`, `flex-shrink: 0`, `padding: 0` y `border-radius: 50%` con prioridad `!important`) para evitar que la flexbox o paddings heredados los estirasen como óvalos.

### Validación
- El proyecto compila y construye correctamente mediante `npm run build` sin advertencias de CSS o compilación.

---

## 🔒 Migración de Seguridad: Hasheo de Contraseñas (Bcrypt)

Para elevar la seguridad del sistema a los estándares modernos y proteger la confidencialidad de las credenciales, hemos migrado el almacenamiento de contraseñas de texto plano a hashes criptográficos irreversibles utilizando la librería `bcrypt`.

### Cambios Clave Realizados:

1. **Instalación de Bcrypt**:
   - Se añadió el paquete `bcrypt` al backend para encriptación de grado industrial.

2. **Encriptación en Creación y Actualización**:
   - **`usuarios.controller.js`**: Cada vez que se crea un nuevo usuario, se edita un perfil, o el usuario cambia su propia contraseña, el backend captura el texto plano y genera un hash con factor de costo `10` (`bcrypt.hash(password, 10)`).
   - **`ejecutivas.controller.js`** y **`jefaturas.controller.js`**: Se aseguró que cualquier contraseña proporcionada durante la creación o actualización de estas cuentas también sea encriptada antes de ejecutar el `INSERT` o `UPDATE` en la base de datos.

3. **Verificación Segura en Autenticación**:
   - **`auth.controller.js`**: El proceso de inicio de sesión (`login`) fue modificado para buscar al usuario en la BD únicamente por su correo. Posteriormente, se utiliza `bcrypt.compare()` para verificar matemáticamente si la contraseña digitada corresponde al hash encriptado de la base de datos, evitando guardar la clave de entrada en la memoria.

4. **Remoción de Contraseñas en Consultas de Perfiles**:
   - Por razones de seguridad, las consultas globales de usuarios (`obtenerUsuarios`, `obtenerEjecutivas`, `obtenerJefaturas`) han sido reescritas para pedir columnas explícitas (`SELECT id, nombre, correo...`), omitiendo el campo `contrasena`. De esta manera, los administradores pueden ver los perfiles en el frontend sin que la API envíe hashes sensibles o datos de contraseñas.

5. **Migración Automática de la Base de Datos**:
   - **`migrate_passwords.js`**: Se diseñó un script seguro que itera sobre la base de datos. Si detecta que una contraseña es texto plano, automáticamente la hashea; si detecta que ya es un hash (ej. `$2b$...`), la omite.
   - **Arranque en `index.js`**: Este script ha sido anclado al proceso de arranque de la API en `database/migrate.js`, garantizando que en el momento del despliegue todas las cuentas existentes sean migradas a encriptación segura automáticamente, evitando que usuarios antiguos pierdan el acceso.

---

## 💅 Rediseño y Mejora de Proporciones en la Bandeja de Reuniones sin Clasificar

Hemos rediseñado la bandeja de **Reuniones Pasadas sin Clasificar** (huérfanas) en [DashboardReuniones.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/pages/DashboardReuniones.jsx) para lograr una presentación visual sumamente limpia y premium, utilizando de manera óptima el espacio a la derecha:

1. **Alineación de Alturas Consistente**:
   - Ajustamos la altura de los botones **Vincular** y **No requiere minuta** a un estándar de `42px` para coincidir de forma idéntica con la altura del buscador de empresas (`SearchableFilter`), evitando saltos y desalineaciones verticales de píxeles.

2. **Distribución Responsiva y Proporciones Mejoradas**:
   - Reemplazamos la alineación estática compacta por una distribución flexible basada en `flexWrap: "wrap"` con `flex: "2 1 600px"` en el contenedor de controles.
   - Ahora, el buscador de empresas (`SearchableFilter`) se expande de manera inteligente para rellenar de forma fluida el espacio disponible a la derecha, mientras que los botones de acción se alinean perfectamente a su lado en una disposición sumamente premium y balanceada.

3. **Formateo y Limpieza de Asistentes**:
   - Añadimos lógica de sanitización e interpretación segura para la lista de asistentes (`h.asistentes`).
   - Anteriormente se mostraba una cadena cruda en formato de arreglo JSON (`["user1@email.com", "user2@email.com"]`). Ahora, la lista se decodifica y muestra como una elipsis o enumeración limpia separada por comas (`user1@email.com, user2@email.com`), lo cual mejora de manera radical la legibilidad.

4. **Micro-interacciones y Efectos Hover**:
   - Agregamos transiciones CSS y efectos visuales interactivos (`onMouseOver` y `onMouseOut`) en ambos botones para realzar la experiencia de usuario (cambios sutiles de brillo, colores de fondo y bordes al pasar el cursor).

### Validación
- Verificamos con éxito el empaquetado del bundle de producción mediante `npm run build` sin errores en el compilador Vite.

---

## 📝 Comportamiento del Formulario al Cargar un Borrador (Minuta)

Modificamos el comportamiento por defecto de la precarga del formulario de Minutas al ingresar desde un Borrador (vinculado manualmente o detectado del calendario de Teams):

1. **Campo "Tipo Reunión" Vacío**:
   - Forzamos a que el campo **Tipo Reunión** (`tipo_reu`) se cargue completamente vacío (`""`), tanto en las inserciones de base de datos del backend ([agendamiento.controller.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/backend/modules/agendamiento/agendamiento.controller.js)) como al renderizar el borrador en el formulario del frontend ([ReunionesForm.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/components/reuniones/ReunionesForm.jsx)). Esto obliga al usuario a ingresar manualmente este dato.

2. **Campo "Enviar a" Filtrado (Solo Externos)**:
   - Para el campo **Enviar a** (`enviado_a`), implementamos un filtro automático de correos en [ReunionesForm.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/components/reuniones/ReunionesForm.jsx) que descarta cualquier correo de dominio interno (`@proforma.cl`). 
   - De esta manera, el campo solo contiene las direcciones de los participantes de la empresa externa. Las direcciones de los colaboradores internos se gestionan de forma dinámica en la sección **Copia (CC)**, calculada automáticamente según el usuario logueado que envía la minuta.

---

## 👥 Extracción y Almacenamiento de Nombres de Contactos (Borradores y Minutas)

Implementamos el flujo completo para extraer y utilizar los nombres completos de los asistentes desde los eventos de Teams/Outlook, poblando automáticamente la información de los borradores y alimentando la base de datos de contactos:

1. **Backend - Sincronización de Eventos**:
   - Modificamos `syncEventosPasados` en [agendamiento.controller.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/backend/modules/agendamiento/agendamiento.controller.js) para mapear tanto `emailAddress.name` como `emailAddress.address` en una estructura de objetos JSON en la columna `asistentes` de la base de datos.
   - Al crear una reunión autoclasificada, pobla el campo `participantes` de la tabla `reuniones` con los nombres de pila concatenados de todos los participantes y filtra la columna `enviado_a` para contener solo los correos externos.

2. **Backend - Vinculación Manual y Auto-aprendizaje**:
   - En `vincularHuerfana` ([agendamiento.controller.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/backend/modules/agendamiento/agendamiento.controller.js)), parseamos de forma segura la lista estructurada de asistentes.
   - Insertamos los nombres de pila concatenados directamente en el campo `participantes` de la tabla `reuniones` para rellenar de forma automatizada este input en el formulario de minutas.
   - Modificamos el ciclo de inserción de contactos en `empresa_contactos` para guardar/actualizar la columna `nombre` con el nombre de pila extraído del evento.

3. **Frontend - Visualización en el Dashboard**:
   - Actualizamos el renderizado de la bandeja en [DashboardReuniones.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/pages/DashboardReuniones.jsx) para soportar el renderizado mixto (soporta tanto los borradores con arreglos de correos tradicionales como los nuevos con estructuras de objetos).
   - Los asistentes de las reuniones sin clasificar ahora se visualizan con un formato altamente legible y corporativo: `"Nombre (correo@dominio.com)"` si el nombre está disponible.

### Validación
- El bundle de producción de Vite compila perfectamente sin warnings ni errores de tipos.

---

## 🔍 Motor de Resolución y Embellecimiento de Nombres de Contactos (Corrección)

Para solucionar el caso donde las reuniones agendadas con anterioridad (o sin nombres en la invitación de Teams) cargan el campo de participantes con el nombre del usuario de correo (e.g. `gpereira`, `vmejias`), implementamos un motor de resolución inteligente:

1. **Helper `resolveDisplayName`**:
   - Agregamos la función `resolveDisplayName` en [agendamiento.controller.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/backend/modules/agendamiento/agendamiento.controller.js).
   - Intenta resolver el nombre real de cada correo electrónico consultando de forma secuencial:
     1. La tabla `usuarios` del sistema (para identificar y recuperar nombres de pila de colaboradores internos como `bsilva@proforma.cl` -> `"Beatriz Silva"`).
     2. La tabla `empresa_contactos` (para recuperar nombres de contactos externos ya registrados).
     3. El nombre provisto por Microsoft Graph API si no es una dirección de correo.
     4. Un formateador de fallback para el nombre de usuario de correo que elimina caracteres especiales (puntos, guiones, etc.) y capitaliza cada palabra (e.g. `a.penaloza` -> `"A Penaloza"`, `vmejias` -> `"Vmejias"`).

2. **Resolución Asíncrona**:
   - Actualizamos tanto la sincronización de calendario como la vinculación manual para realizar búsquedas asíncronas concurrentes con `Promise.all` y resolver todos los nombres reales antes de escribir en la columna `participantes` de la tabla `reuniones`.

---

## 🔗 Opción de Desvinculación de Minuta / Reunión (Borradores)

Implementamos el flujo para desvincular borradores mal asignados y devolverlos a la bandeja de reuniones sin clasificar (huérfanas):

1. **Backend - Endpoint `/api/agendamiento/huerfanas/desvincular`**:
   - Creado en [agendamiento.controller.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/backend/modules/agendamiento/agendamiento.controller.js) y expuesto en [agendamiento.routes.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/backend/modules/agendamiento/agendamiento.routes.js).
   - Recibe el `id_reunion`. Valida que el borrador exista y no haya sido enviado como minuta finalizada.
   - Elimina físicamente el borrador de la tabla `reuniones` y actualiza el estado del evento original en `reuniones_huerfanas` de `'vinculada'` de vuelta a `'pendiente'`.

2. **Frontend - Conexión de API**:
   - Agregamos la función `desvincularBorrador` en [agendamientoService.js](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/services/agendamientoService.js) para realizar la llamada HTTP POST correspondiente.

3. **Frontend - Interfaz de Usuario**:
   - En [DashboardReuniones.jsx](file:///c:/Users/Proforma5/OneDrive%20-%20CENTRO%20INTERMEDIO%20PARA%20CAPACITACI%C3%93N%20PROFORMA%20%281%29/Escritorio/core360/frontend/src/pages/DashboardReuniones.jsx), dentro de la tabla de reuniones (columna Envío), añadimos el botón **`🔗 Desvincular`** debajo de la etiqueta amarilla `"✍️ Pendiente de Minuta"`.
   - Este botón solo se muestra para aquellos borradores que contienen un `event_id` válido (sincronizados de Teams/Outlook).
   - Al hacer clic, se dispara un cuadro de diálogo SweetAlert2 de confirmación. Si el usuario confirma, elimina el borrador y recarga la vista, haciendo que la reunión vuelva a figurar en el panel de reuniones sin clasificar para permitir asociarla a la empresa correcta.

---

## 📅 Clasificación de Reuniones Próximas y Clientes (Dashboard)

Corregimos la visualización de reuniones futuras (por ejemplo, agendadas para diciembre de 2026 u otros meses posteriores) para que aparezcan correctamente en la pestaña **"Próximas"** en lugar de la pestaña **"Clientes"** en el Historial de Reuniones:

1. **Filtro de Clientes Actualizado**: Modificamos el filtro de la pestaña **"Clientes"** para descartar reuniones cuya fecha sea hoy o posterior y cuyo estado de envío no sea `'enviado'` (finalizado).
2. **Filtro de Próximas Actualizado**: Modificamos el filtro de la pestaña **"Próximas"** para incluir reuniones futuras que no han sido finalizadas (estado distinto a `'enviado'`) o que estén explícitamente en estado `'agendada'`.
3. **Filtro de Todas Actualizado**: Modificamos la pestaña **"Todas"** para ocultar las reuniones futuras pendientes (upcoming) de la lista de reuniones realizadas.
4. **Despliegue Exitoso**: Compilamos y verificamos la aplicación mediante `npm run build` y empujamos los cambios a la rama remota `develop` en GitHub.
