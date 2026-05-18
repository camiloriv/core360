# Documentación del Proyecto: Core360

## 📝 Introducción
**Core360** es una plataforma integral diseñada para la gestión de encuestas, seguimiento de reuniones y análisis de datos ejecutivos. El sistema permite a las organizaciones administrar flujos de trabajo de comunicación (minutas de reuniones), desplegar encuestas de satisfacción y visualizar métricas críticas a través de tableros analíticos avanzados.

---

## 🏗️ Arquitectura del Sistema
El proyecto sigue una arquitectura de **Desacoplamiento Front-Back** (Client-Server), permitiendo una escalabilidad independiente de ambos componentes.

### 1. Backend (API REST)
Ubicado en la carpeta `/backend`, es una aplicación **Node.js** utilizando el framework **Express**.
- **Gestión de Datos:** Utiliza MySQL para la persistencia.
- **Módulos:** Estructurado de forma modular para facilitar el mantenimiento.
- **Servicios:** Implementa lógica de envío de correos (Nodemailer) y procesamiento de archivos (Multer).

### 2. Frontend (Single Page Application)
Ubicado en la carpeta `/frontend`, construido con **React 19** y **Vite**.
- **Estado y Navegación:** Gestionado con React Router DOM.
- **Visualización:** Implementación de gráficos dinámicos con Recharts.
- **UI/UX:** Diseño moderno y premium con CSS vanilla, enfocado en la usabilidad y estética corporativa.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | React 19 | Biblioteca de interfaz de usuario. |
| **Build Tool** | Vite | Entorno de desarrollo rápido. |
| **Backend** | Node.js / Express | Servidor de aplicaciones y API. |
| **Base de Datos** | MySQL | Almacenamiento relacional. |
| **Gráficos** | Recharts | Visualización de KPIs y analíticas. |
| **Estilos** | CSS Moderno | Diseño responsivo y animaciones. |
| **Editor** | TipTap | Edición de minutas en formato enriquecido. |
| **Comunicaciones** | Nodemailer | Envío automatizado de correos. |

---

## 📂 Estructura del Proyecto

### Backend
```text
/backend
├── /modules             # Lógica de negocio dividida por dominio
│   ├── /encuestas       # Gestión de preguntas, respuestas y envíos
│   ├── /reuniones       # Creación de minutas y actas
│   ├── /empresas        # Directorio de clientes/empresas
│   ├── /ejecutivas      # Gestión de personal ejecutivo
│   └── /auth            # Autenticación y gestión de usuarios centralizada
├── /database            # Conexión y configuración de BD
├── /router              # Definición de rutas globales
├── app.js               # Configuración de Express y Middlewares
└── index.js             # Punto de entrada del servidor
```

### Frontend
```text
/frontend
├── /src
│   ├── /components      # Componentes reutilizables (formularios, layouts)
│   ├── /pages           # Vistas principales de la aplicación
│   ├── /styles          # Sistema de diseño con variables CSS estandarizadas
│   ├── /services        # Clientes de API (Axios)
│   └── App.jsx          # Componente raíz y rutas
└── vite.config.js       # Configuración de empaquetado
```

---

## 🚀 Funcionalidades Principales

### 1. Gestión de Encuestas
- Creación dinámica de encuestas de satisfacción.
- Visualización de resultados en tiempo real (NPS, Tasas de Respuesta).
- Exportación y filtrado por ejecutiva o empresa.

### 2. Control de Reuniones (Minutas)
- Editor de texto enriquecido (TipTap) para redactar actas de reuniones.
- Registro de compromisos y acuerdos.
- Flujo de trabajo de seguimiento automatizado.

### 3. Dashboard Analítico
- Tableros con indicadores clave (KPIs).
- Gráficos de radar para análisis multidimensional de desempeño.
- Rankings de ejecutivas basados en feedback de clientes.

### 4. Sistema de Autenticación y RBAC
- Gestión centralizada de usuarios con roles definidos (ej. admin, jefatura).
- Rutas protegidas y control de acceso basado en permisos.

---

## 🗄️ Esquema de Base de Datos

### Entidades Principales
- **`usuarios`**: Gestión centralizada de credenciales y roles (RBAC).
- **`empresas`**: Registro de clientes.
- **`ejecutivas`**: Personal responsable de cuentas.
- **`reuniones`**: Actas, participantes y archivos adjuntos.
- **`encuesta_templates`**: Modelos de encuestas dinámicas.
- **`encuesta_preguntas`**: Definición de ítems por template.
- **`encuestas_envio`**: Control de envíos y tokens de acceso.
- **`respuestas`**: Resultados almacenados en formato JSON.

### Ejemplo de Datos
| Tabla | Ejemplo de Dato |
| :--- | :--- |
| **Usuarios** | `{ id: 1, email: "admin@core360.com", permisos: "admin" }` |
| **Empresas** | `{ id: 1, nombre: "Empresa Alpha" }` |
| **Ejecutivas** | `{ id: 5, nombre: "Claudia Martínez" }` |
| **Preguntas** | `{ texto: "¿Calidad del servicio?", tipo: "opcion_multiple" }` |
| **Respuestas** | `{ "q1": "Excelente", "q2": "Muy satisfecho" }` |

---

## ⚙️ Configuración y Ejecución

### Requisitos Previos
- Node.js (v18 o superior)
- MySQL

### Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone [url-del-repo]
   ```

2. **Configurar el Backend:**
   - Ir a `/backend`.
   - Crear un archivo `.env` configurando las variables de BD.
   - Ejecutar: `npm install`
   - Iniciar: `node index.js`

3. **Configurar el Frontend:**
   - Ir a `/frontend`.
   - Ejecutar: `npm install`
   - Iniciar: `npm run dev`

---

## 🔒 Variables de Entorno (.env)
El backend requiere las siguientes configuraciones:
- `DB_HOST`: Host de la base de datos.
- `DB_USER`: Usuario de MySQL.
- `DB_PASSWORD`: Contraseña.
- `DB_NAME`: Nombre de la base de datos.
- `EMAIL_USER`: Cuenta para envío de correos.
- `EMAIL_PASS`: Credenciales de correo.

---

## 🎨 Guía de Estilo
El proyecto utiliza un sistema de diseño propio basado en **Variables CSS estandarizadas** (`frontend/src/styles/variables.css`). Se prioriza:
- **Colores:** Paletas armoniosas, controladas globalmente vía variables CSS (ej. `--primary-color`, `--bg-body`).
- **Tipografía:** Google Fonts (`--font-main`, `--font-mono`).
- **Interacciones:** Micro-animaciones en botones y transiciones de página suaves, promoviendo una experiencia fluida y consistente en todas las vistas.
