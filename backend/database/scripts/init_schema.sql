-- ======================================================
-- 🔹 SCHEMA MODERNIZADO PARA ENCUESTAS Y DASHBOARD
-- ======================================================

-- 1. Dimensiones (Categorías para análisis de KPIs)
CREATE TABLE IF NOT EXISTS encuesta_dimensiones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Templates de Encuestas
CREATE TABLE IF NOT EXISTS encuesta_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    version INT DEFAULT 1,
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Preguntas Normalizadas
CREATE TABLE IF NOT EXISTS encuesta_preguntas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    dimension_id INT,
    texto TEXT NOT NULL,
    tipo ENUM('escala', 'seleccion_unica', 'seleccion_multiple', 'texto') NOT NULL,
    opciones_json JSON, -- Ejemplo: ["Muy Malo", "Malo", "Regular", "Bueno", "Excelente"]
    orden INT DEFAULT 0,
    requerida TINYINT(1) DEFAULT 0,
    activo TINYINT(1) DEFAULT 1,
    FOREIGN KEY (template_id) REFERENCES encuesta_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (dimension_id) REFERENCES encuesta_dimensiones(id) ON DELETE SET NULL
);

-- 4. Encuestas (Instancias enviadas a clientes/usuarios)
CREATE TABLE IF NOT EXISTS encuestas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    template_id INT NOT NULL,
    empresa_id INT,
    ejecutiva_id INT,
    token VARCHAR(100) UNIQUE NOT NULL,
    estado ENUM('pendiente', 'completada') DEFAULT 'pendiente',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta TIMESTAMP NULL,
    FOREIGN KEY (template_id) REFERENCES encuesta_templates(id),
    -- Nota: Asumimos que existen las tablas empresas y ejecutivas
    INDEX (token)
);

-- 5. Respuestas Detalladas (LA CLAVE DEL DASHBOARD)
-- Esta tabla permite hacer AVG(), COUNT(), y filtros rápidos sin parsear JSON
CREATE TABLE IF NOT EXISTS encuesta_respuestas (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    encuesta_id INT NOT NULL,
    pregunta_id INT NOT NULL,
    valor_texto TEXT, -- Para respuestas tipo 'texto'
    valor_numerico DECIMAL(10,2), -- Para escalas (1-5) o índices de opciones
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (encuesta_id) REFERENCES encuestas(id) ON DELETE CASCADE,
    FOREIGN KEY (pregunta_id) REFERENCES encuesta_preguntas(id),
    INDEX (encuesta_id),
    INDEX (pregunta_id)
);

-- 6. Vista para Dashboard (Opcional pero recomendada)
-- CREATE VIEW v_dashboard_respuestas AS
-- SELECT 
--     r.id as respuesta_id,
--     e.id as encuesta_id,
--     e.empresa_id,
--     e.ejecutiva_id,
--     p.texto as pregunta,
--     p.tipo as tipo_pregunta,
--     d.nombre as dimension,
--     r.valor_numerico,
--     r.valor_texto,
--     r.created_at
-- FROM encuesta_respuestas r
-- JOIN encuestas e ON r.encuesta_id = e.id
-- JOIN encuesta_preguntas p ON r.pregunta_id = p.id
-- LEFT JOIN encuesta_dimensiones d ON p.dimension_id = d.id;
