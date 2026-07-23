# Documentación del Proyecto: Core360

## 📝 Introducción
**Core360** es una plataforma integral diseñada para la gestión de encuestas, seguimiento de reuniones, agendamiento con Microsoft Teams y análisis de datos ejecutivos. El sistema permite a las organizaciones administrar flujos de trabajo de comunicación (minutas de reuniones), sincronizar calendarios de Teams, desplegar encuestas de satisfacción, gestionar el pipeline comercial de nuevos negocios y visualizar métricas críticas a través de tableros analíticos avanzados.

---

## 🏗️ Arquitectura del Sistema
El proyecto sigue una arquitectura de **Desacoplamiento Front-Back** (Client-Server), permitiendo una escalabilidad independiente de ambos componentes.

### 1. Backend (API REST)
Ubicado en la carpeta `/backend`, es una aplicación **Node.js** utilizando el framework **Express 5**.
- **Gestión de Datos:** Utiliza MySQL (mysql2) para la persistencia, con sistema de migraciones automáticas al inicio.
- **Módulos:** Estructurado de forma modular (11 módulos) para facilitar el mantenimiento.
- **Servicios:** Implementa lógica de envío de correos (Microsoft Graph API vía Azure AD), procesamiento de archivos (Multer), templates HTML para emails, y un scheduler de tareas programadas (node-cron).
- **Seguridad:** Autenticación JWT, Helmet para cabeceras HTTP, Rate Limiting, CORS dinámico, y compresión GZIP.
- **Despliegue:** Soporte Docker incluido (Dockerfile y .dockerignore).

### 2. Frontend (Single Page Application)
Ubicado en la carpeta `/frontend`, construido con **React 19** y **Vite 8**.
- **Estado y Navegación:** Gestionado con React Router DOM v7 con Code Splitting (lazy loading).
- **Visualización:** Implementación de gráficos dinámicos con Recharts.
- **Calendario:** Integración visual con React Big Calendar para agendamiento.
- **Editor de Texto:** TipTap v3 con extensiones de tablas, colores, tipografías y alineación.
- **UI/UX:** Diseño moderno y premium con CSS vanilla (sistema de variables CSS), íconos Lucide React, alertas con SweetAlert2, exportación a Excel (xlsx). Incluye sistema de logout por inactividad.
- **RBAC en Frontend:** Control de acceso por vistas permitidas y roles (admin, jefatura, ejecutiva, gerencia, gerencia_general).

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | React 19 | Biblioteca de interfaz de usuario. |
| **Build Tool** | Vite 8 | Entorno de desarrollo rápido y bundling. |
| **Backend** | Node.js / Express 5 | Servidor de aplicaciones y API REST. |
| **Base de Datos** | MySQL (mysql2) | Almacenamiento relacional con pool de conexiones. |
| **Gráficos** | Recharts | Visualización de KPIs y analíticas. |
| **Calendario** | React Big Calendar | Visualización de agenda y eventos Teams. |
| **Estilos** | CSS Moderno | Diseño responsivo, variables CSS y animaciones. |
| **Íconos** | Lucide React | Sistema de iconografía consistente. |
| **Infraestructura / Despliegue** | Docker & Docker Compose | Contenedorización de la aplicación y base de datos para entornos consistentes. |
| **Editor** | TipTap v3 | Edición de minutas en formato enriquecido (tablas, colores, tipografía). |
| **Comunicaciones** | Microsoft Graph API (Azure AD) | Envío automatizado de correos vía OAuth2. |
| **Autenticación** | JWT (jsonwebtoken) + bcrypt | Autenticación y hashing seguro de contraseñas. |
| **Seguridad** | Helmet / express-rate-limit | Cabeceras HTTP seguras y protección contra DDoS. |
| **Tareas Programadas** | node-cron | Scheduler para encuestas y sincronización diaria con Teams. |
| **Carga de Archivos** | Multer | Manejo de uploads de archivos adjuntos. |
| **Excel** | xlsx (SheetJS) | Importación/exportación de datos en formato Excel. |
| **Alertas** | SweetAlert2 | Diálogos y notificaciones interactivas en el frontend. |
| **Fechas** | date-fns | Manipulación y formateo de fechas. |
| **HTTP Client** | Axios | Comunicación frontend-backend. |
| **IDs únicos** | uuid | Generación de identificadores únicos. |

---

## 📂 Estructura del Proyecto

### Backend
```text
/backend
├── /config              # Configuración del sistema
│   └── mailer.js        # Transporter de correos (Microsoft Graph API / Azure AD)
├── /database            # Conexión y configuración de BD
│   ├── connection.js    # Pool de conexiones MySQL
│   ├── migrate.js       # Sistema de migraciones automáticas
│   ├── /scripts         # Scripts de migración auxiliares
│   └── /dumps           # Respaldos de base de datos
├── /middleware           # Middlewares Express
│   ├── auth.middleware.js   # Verificación de tokens JWT
│   └── rateLimiter.js       # Rate limiting por IP
├── /modules             # Lógica de negocio dividida por dominio
│   ├── /admin           # Panel de administración del sistema
│   ├── /agendamiento    # Sincronización con Microsoft Teams (Graph API)
│   ├── /auth            # Autenticación (login, JWT, cambio de clave)
│   ├── /ejecutivas      # Gestión de personal ejecutivo
│   ├── /empresas        # Directorio de clientes/empresas
│   ├── /encuestas       # Gestión de encuestas, preguntas, respuestas y envíos
│   ├── /jefaturas       # Gestión de jefaturas y gerencias
│   ├── /nuevos_negocios # Pipeline comercial de nuevos negocios
│   ├── /reuniones       # Creación y envío de minutas
│   ├── /usuarios        # Gestión de usuarios (CRUD, roles, permisos)
│   └── /zonas           # Gestión de zonas geográficas
├── /services            # Servicios transversales
│   ├── /email           # Servicio de envío de correos (minutas y encuestas)
│   ├── /scheduler       # Tareas programadas (encuestas + sync Teams diaria)
│   └── /templates       # Templates HTML para correos
├── /assets              # Recursos estáticos del backend
│   ├── /images          # Banners para correos (header/footer)
│   └── /firmas          # Firmas personalizadas por ejecutiva
├── /uploads             # Archivos adjuntos subidos
├── /scripts             # Scripts de mantenimiento y utilidades
├── app.js               # Configuración de Express, middlewares y rutas
├── index.js             # Punto de entrada (migraciones + scheduler + server)
├── Dockerfile           # Contenedor Docker
└── package.json         # Dependencias del proyecto
```

### Frontend
```text
/frontend
├── /src
│   ├── /components      # Componentes reutilizables
│   │   ├── Sidebar.jsx  # Navegación lateral con control RBAC
│   │   ├── Topbar.jsx   # Barra superior con menú usuario
│   │   ├── /agendar     # Componentes de agendamiento
│   │   ├── /dashboard   # Widgets y gráficos del dashboard
│   │   ├── /form        # Componentes de formulario reutilizables
│   │   └── /reuniones   # Componentes específicos de reuniones
│   ├── /pages           # Vistas principales de la aplicación
│   │   ├── Login.jsx               # Inicio de sesión
│   │   ├── Home.jsx                # Vista principal / Registro de reuniones
│   │   ├── AgendarReunion.jsx      # Calendario y agendamiento con Teams
│   │   ├── VincularReuniones.jsx   # Vinculación de eventos Teams a minutas
│   │   ├── DashboardReuniones.jsx  # Dashboard analítico de reuniones
│   │   ├── DashboardEncuestas.jsx  # Dashboard analítico de encuestas
│   │   ├── EditorEncuestas.jsx     # Editor de plantillas de encuestas
│   │   ├── GenerarEncuesta.jsx     # Generación y envío de encuestas
│   │   ├── ResponderEncuesta.jsx   # Vista pública para responder encuestas
│   │   ├── GestionEmpresas.jsx     # CRUD de empresas y contactos
│   │   ├── SeguimientoEmpresas.jsx # Seguimiento de cobertura por empresa
│   │   ├── SeguimientoNegocios.jsx # Pipeline de nuevos negocios
│   │   ├── GestionUsuarios.jsx     # Administración de usuarios y roles
│   │   └── AdminPanel.jsx          # Panel de administración del sistema
│   ├── /hooks           # Custom hooks de React
│   │   ├── useDashboardData.js     # Fetching y procesamiento de datos para dashboards
│   │   ├── useInactivityLogout.js  # Auto-logout por inactividad del usuario
│   │   ├── /encuestas              # Hooks específicos de encuestas
│   │   └── /reuniones              # Hooks específicos de reuniones
│   ├── /services        # Clientes de API (Axios)
│   │   ├── api.js                  # Instancia Axios base con interceptors
│   │   ├── reunionesService.js     # Llamadas API de reuniones
│   │   ├── encuestaService.js      # Llamadas API de encuestas
│   │   ├── agendamientoService.js  # Llamadas API de agendamiento Teams
│   │   ├── dataService.js          # Servicio genérico de datos
│   │   └── nuevosNegociosService.js # Llamadas API de pipeline comercial
│   ├── /styles          # Sistema de diseño con variables CSS estandarizadas
│   │   ├── variables.css           # Variables CSS globales (colores, fuentes, espaciado)
│   │   ├── base.css                # Estilos base y reset
│   │   ├── layout.css              # Estructura y grids
│   │   ├── core360-theme.css       # Tema principal de la aplicación
│   │   ├── components.css          # Estilos de componentes reutilizables
│   │   ├── DashboardStyles.js      # Estilos inline para componentes del dashboard
│   │   ├── mobile.css              # Estilos responsivos para móvil
│   │   └── encuesta.css            # Estilos de la vista pública de encuestas
│   ├── /utils           # Utilidades compartidas
│   │   ├── exportExcel.js          # Exportación de datos a Excel
│   │   └── textUtils.js            # Utilidades de manipulación de texto
│   ├── /data            # Datos estáticos / constantes
│   ├── App.jsx          # Componente raíz, rutas y RBAC
│   └── main.jsx         # Punto de entrada de React
├── vite.config.js       # Configuración de empaquetado
└── eslint.config.js     # Configuración de ESLint (linting de código)
```

---

## 🚀 Funcionalidades Principales

### 1. Gestión de Encuestas
- Creación dinámica de encuestas de satisfacción con catálogo de preguntas personalizable.
- Programación de envíos automáticos vinculados a reuniones (scheduler cada minuto).
- Visualización de resultados en tiempo real (NPS, Tasas de Respuesta).
- Exportación y filtrado por ejecutiva, empresa o zona.
- Vista pública de encuestas accesible por token único.

### 2. Control de Reuniones (Minutas)
- Editor de texto enriquecido (TipTap) para redactar minutas de reuniones.
- Soporte de archivos adjuntos, enlaces de video (grabaciones Teams) y texto previo personalizable.
- Envío automatizado de correos con banners corporativos y firma personalizada por ejecutiva.
- Sistema de estados: borrador → enviado → no aplica.
- Redirección de correos en entorno de desarrollo (`REDIRECT_EMAILS_TO`).

### 3. Agendamiento con Microsoft Teams
- Sincronización bidireccional con calendarios de Microsoft 365 vía Graph API.
- Calendario visual (React Big Calendar) para ver y gestionar eventos.
- Vinculación de eventos Teams a minutas del sistema.
- Sincronización diaria automatizada a las 3:00 AM (Chile) con log de ejecución.
- Detección inteligente de empresas por dominio de asistentes.

### 4. Dashboard Analítico
- Tableros con indicadores clave (KPIs) de reuniones y encuestas.
- Gráficos de radar para análisis multidimensional de desempeño.
- Rankings de ejecutivas basados en feedback de clientes.
- Filtrado por zona, ejecutiva, empresa y rango de fechas.
- Exportación de reportes a Excel.

### 5. Seguimiento de Empresas
- Registro de cobertura y seguimiento por empresa.
- Historial de estados con log detallado de cambios.
- Gestión de dominios y contactos por empresa.
- Visión consolidada por zona geográfica.

### 6. Pipeline de Nuevos Negocios
- Seguimiento del pipeline comercial desde prospecto hasta cierre.
- Historial de cambios de estado por negocio.
- Importación masiva desde Excel.
- Métricas de gestión comercial.

### 7. Sistema de Autenticación y RBAC
- Gestión centralizada de usuarios con roles definidos (admin, jefatura, ejecutiva, gerencia, gerencia_general).
- Contraseñas hasheadas con bcrypt y sistema de migración automática.
- Tokens JWT con validación en middleware.
- Rutas protegidas y control de acceso basado en vistas permitidas por usuario.
- Auto-logout por inactividad configurable.
- Flujo de cambio de contraseña obligatorio (`requiere_cambio_clave`).

### 8. Panel de Administración
- Gestión avanzada del sistema para administradores.
- Herramientas de diagnóstico y mantenimiento.

---

## 🗄️ Esquema de Base de Datos

### Entidades Principales
- **`usuarios`**: Gestión centralizada de credenciales, roles (RBAC), zonas, jefaturas, vistas permitidas, preferencias y tokens de sincronización.
- **`empresas`**: Registro de clientes con zona geográfica y jefatura asignada.
- **`empresa_dominios`**: Dominios de correo asociados a cada empresa (para detección automática).
- **`empresa_contactos`**: Directorio de contactos por empresa.
- **`empresa_seguimiento_log`**: Historial de estados de seguimiento por empresa.
- **`zonas`**: Zonas geográficas (Matriz, Zona Norte 1, Zona Norte 2, Concepción, Puerto Montt, Viña del Mar).
- **`teams_eventos`**: Eventos sincronizados desde Microsoft Teams (fuente de verdad).
- **`minutas`**: Minutas de reuniones con soporte de encuestas programadas.
- **`encuesta_catalogo_preguntas`**: Catálogo de preguntas disponibles para encuestas.
- **`nuevos_negocios`**: Pipeline comercial de prospectos y nuevos negocios.
- **`nuevos_negocios_historial`**: Log de cambios de estado en el pipeline.
- **`usuario_gerencias`**: Relación muchos-a-muchos entre usuarios y gerencias.
- **`sync_log`**: Registro de ejecuciones de sincronización diaria con Teams.

### Relaciones Clave
| Relación | Descripción |
| :--- | :--- |
| `usuarios.zona_id` → `zonas.id` | Cada usuario pertenece a una zona. |
| `empresas.zona_id` → `zonas.id` | Cada empresa pertenece a una zona. |
| `minutas.ejecutiva_id` → `usuarios.id` | Cada minuta es responsabilidad de una ejecutiva. |
| `minutas.empresa_id` → `empresas.id` | Cada minuta está asociada a una empresa (nullable). |
| `minutas.teams_evento_id` → `teams_eventos.id` | Vinculación opcional con evento de Teams. |
| `teams_eventos.usuario_id` → `usuarios.id` | Cada evento Teams pertenece a un usuario. |
| `empresa_dominios.empresa_id` → `empresas.id` | Dominios de correo de una empresa. |
| `empresa_contactos.empresa_id` → `empresas.id` | Contactos de una empresa. |
| `nuevos_negocios_historial.negocio_id` → `nuevos_negocios.id` | Historial de un negocio. |

---

## ⚙️ Configuración y Ejecución

### Requisitos Previos
- Node.js (v18 o superior)
- MySQL
- Credenciales de Azure AD (para envío de correos y sincronización Teams)

### Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone [url-del-repo]
   ```

2. **Configurar el Backend:**
   - Ir a `/backend`.
   - Copiar `.env.example` a `.env` y configurar las variables (ver sección siguiente).
   - Ejecutar: `npm install`
   - Iniciar: `node index.js` (ejecuta migraciones automáticamente al inicio)
   - Para desarrollo: `npm run dev` (usa nodemon)

3. **Configurar el Frontend:**
   - Ir a `/frontend`.
   - Ejecutar: `npm install`
   - Iniciar: `npm run dev`

---

## 🔒 Variables de Entorno (.env)
El backend requiere las siguientes configuraciones:

### Base de Datos
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `DB_HOST` | Host de la base de datos. | `localhost` |
| `DB_PORT` | Puerto de MySQL. | `3306` |
| `DB_USER` | Usuario de MySQL. | `root` |
| `DB_PASSWORD` | Contraseña de MySQL. | `your_password` |
| `DB_NAME` | Nombre de la base de datos. | `core360` |

### Servidor
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `PORT` | Puerto del servidor (default: 8080). | `8080` |
| `NODE_ENV` | Entorno de ejecución. | `production` |
| `FRONTEND_URL` | URL del frontend (para CORS y generación de links). | `https://core360.pages.dev` |

### Autenticación
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `JWT_SECRET` | Secreto para firmar tokens JWT (**obligatorio**). | `mi_clave_secreta_segura` |

### Microsoft Azure AD (Correos y Teams)
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `AZURE_TENANT_ID` | Tenant ID de Azure AD. | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `AZURE_CLIENT_ID` | Client ID de la aplicación Azure. | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `AZURE_CLIENT_SECRET` | Client Secret de la aplicación Azure. | `tu_client_secret` |
| `SMTP_USER` | Correo del remitente por defecto. | `minutas@proforma.cl` |

### Desarrollo (Opcionales)
| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `REDIRECT_EMAILS_TO` | Redirige todos los correos a esta dirección (para pruebas). | `dev@proforma.cl` |
| `RESET_PASSWORDS_DEV` | Resetea todas las contraseñas a "123" al iniciar. | `true` |

---

## 🎨 Guía de Estilo
El proyecto utiliza un sistema de diseño propio basado en **Variables CSS estandarizadas** (`frontend/src/styles/variables.css`). Se prioriza:
- **Colores:** Paletas armoniosas, controladas globalmente vía variables CSS (ej. `--primary-color`, `--bg-body`).
- **Tipografía:** Google Fonts (`--font-main`, `--font-mono`).
- **Responsividad:** Estilos adaptativos con archivo dedicado `mobile.css` para dispositivos móviles.
- **Interacciones:** Micro-animaciones en botones y transiciones de página suaves, promoviendo una experiencia fluida y consistente en todas las vistas.
- **Alertas:** SweetAlert2 para diálogos, confirmaciones y notificaciones con estilos personalizados.

---

## 🌐 Despliegue en Producción

| Componente | Plataforma | URL / Detalle |
| :--- | :--- | :--- |
| **Backend (API)** | Railway | Hosting del servidor Node.js/Express y base de datos MySQL. Railway provee automáticamente las variables de conexión a BD. |
| **Frontend (SPA)** | Cloudflare Pages | Build estático de Vite desplegado en `core360.pages.dev`. Se conecta al backend vía variable `VITE_API_URL`. |
| **Base de Datos** | Railway (MySQL) | Instancia MySQL gestionada dentro del mismo proyecto Railway. |
| **Contenedores** | Docker & Docker Compose | Disponibles para desarrollo local y despliegue alternativo (`docker-compose.yml` en la raíz). |

### Flujo de Despliegue
1. **Backend:** Push a la rama principal → Railway detecta cambios → Build automático con Dockerfile → Deploy.
2. **Frontend:** Push a la rama principal → Cloudflare Pages ejecuta `npm run build` → Sirve los archivos estáticos desde `/dist`.

### Herramientas de Calidad de Código
- **ESLint:** Configurado en el frontend (`eslint.config.js`) con plugins para React Hooks y React Refresh. Ejecutar con `npm run lint`.
