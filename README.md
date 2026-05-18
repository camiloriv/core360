# Core360 - Plataforma Integral de Gestión y Analítica

![NodeJS](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![MySQL](https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

**Core360** es una solución corporativa avanzada para la gestión de encuestas, seguimiento de reuniones y análisis estratégico. Diseñada para centralizar la comunicación ejecutiva y transformar el feedback de los clientes en indicadores accionables (KPIs).

## 🚀 Características Principales

*   **Gestión de Minutas:** Editor enriquecido (TipTap) para actas de reuniones con seguimiento de compromisos.
*   **Sistema de Encuestas Dinámico:** Biblioteca de preguntas y envío automatizado de encuestas de satisfacción.
*   **Dashboards Estratégicos:** Visualización de datos con Recharts (Gráficos Radar, NPS, Tasa de Respuesta).
*   **Estructura Jerárquica:** Filtrado avanzado por Jefaturas, Ejecutivas y Empresas.
*   **Autenticación y RBAC:** Gestión centralizada de usuarios con roles y permisos específicos.
*   **Automatización:** Envío de correos electrónicos y gestión de adjuntos.

## 🏗️ Arquitectura

El proyecto está dividido en dos grandes bloques desacoplados:

### Backend (API REST)
Ubicado en `/backend`, construido con **Node.js** y **Express**.
*   **Estructura:** Modular (por dominios).
*   **Base de Datos:** MySQL.
*   **Servicios:** Nodemailer para correos y Multer para carga de archivos.

### Frontend (SPA)
Ubicado en `/frontend`, desarrollado con **React 19** y **Vite**.
*   **UI/UX:** Diseño premium con variables CSS estandarizadas globalmente y micro-animaciones.
*   **Estado:** React Hooks y Context API.

## 🛠️ Instalación y Configuración

### Requisitos Previos
*   Node.js v18+
*   MySQL 8.0+
*   Docker (opcional, para despliegue rápido)

### Configuración de Variables de Entorno
Crea un archivo `.env` en las carpetas correspondientes basándote en los archivos `.env.example`.

#### Backend (`/backend/.env`)
```env
PORT=8080
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=core360
EMAIL_USER=tu_correo@ejemplo.com
EMAIL_PASS=tu_app_password
```

#### Frontend (`/frontend/.env`)
```env
VITE_API_URL=http://localhost:8080
```

### Ejecución Local

1.  **Clonar el repositorio**
2.  **Backend:**
    ```bash
    cd backend
    npm install
    npm start
    ```
3.  **Frontend:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## 🐳 Docker (Recomendado para Producción/Pruebas)

Puedes levantar todo el entorno (incluyendo la base de datos) usando:

```bash
docker-compose up --build
```

## 📂 Estructura del Repositorio

```text
.
├── backend/            # Servidor API Express
├── frontend/           # Aplicación React Vite
├── docker-compose.yml  # Orquestación de contenedores
└── README.md           # Documentación principal
```

## 📄 Licencia
Este proyecto es privado y confidencial.

---
Desarrollado para **Proforma** - 2026.
