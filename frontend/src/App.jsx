import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, lazy, useState } from "react";

import "./styles/base.css";
import "./styles/layout.css";
import "./styles/core360-theme.css";
import "./styles/components.css";
import "./styles/mobile.css";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { useInactivityLogout } from "./hooks/useInactivityLogout";

// Lazy Loaded Pages para Code Splitting
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const GenerarEncuesta = lazy(() => import("./pages/GenerarEncuesta"));
const ResponderEncuesta = lazy(() => import("./pages/ResponderEncuesta"));
const DashboardReuniones = lazy(() => import("./pages/DashboardReuniones"));
const DashboardEncuestas = lazy(() => import("./pages/DashboardEncuestas"));
const EditorEncuestas = lazy(() => import("./pages/EditorEncuestas"));
const GestionEmpresas = lazy(() => import("./pages/GestionEmpresas"));
const SeguimientoEmpresas = lazy(() => import("./pages/SeguimientoEmpresas"));
const GestionUsuarios = lazy(() => import("./pages/GestionUsuarios"));
const AgendarReunion = lazy(() => import("./pages/AgendarReunion"));
const VincularReuniones = lazy(() => import("./pages/VincularReuniones"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));

const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100%' }}>
    <div style={{ textAlign: 'center' }}>
      <div className="spinner" style={{ 
        border: '4px solid rgba(0, 0, 0, 0.1)', 
        width: '40px', height: '40px', 
        borderRadius: '50%', 
        borderLeftColor: 'var(--secondary-color)', 
        animation: 'spin 1s linear infinite',
        margin: '0 auto 15px auto' 
      }}></div>
      <p style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>Cargando...</p>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  </div>
);

// ProtectedRoute component
const ProtectedRoute = ({ children, allowedRoles, path }) => {
  const user = JSON.parse(localStorage.getItem("usuario") || "null");
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const vistas = user.vistas_permitidas
    ? (typeof user.vistas_permitidas === "string" ? JSON.parse(user.vistas_permitidas) : user.vistas_permitidas)
    : null;

  if (vistas && path && user.permisos !== "admin" && user.permisos !== "ADMIN") {
    const isVincularPermitted = path === "/vincular-reuniones" && vistas.includes("/dashboard-reuniones");
    const isGestionEmpresasPermitted = path === "/gestion-empresas" && (user.permisos === "jefatura" || user.permisos === "ejecutiva");
    const isPermitted = vistas.includes(path) 
      || (path === "/home" && (vistas.includes("/registrar-reunion") || vistas.includes("/home")))
      || (path === "/registrar-reunion" && (vistas.includes("/registrar-reunion") || vistas.includes("/home")));
    if (!isPermitted && !isVincularPermitted && !isGestionEmpresasPermitted) {
      const fallback = (vistas.includes("/home") || vistas.includes("/registrar-reunion"))
        ? "/home"
        : (vistas.length > 0 ? vistas[0] : "/login");
      return <Navigate to={fallback} replace />;
    }
  } else if (allowedRoles && !allowedRoles.includes(user.permisos) && user.permisos !== "admin" && user.permisos !== "ADMIN") {
    return <Navigate to="/home" replace />;
  }

  return children;
};

// MainLayout wrapper to handle inactivity logout hook
const MainLayout = () => {
  useInactivityLogout();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const user = JSON.parse(localStorage.getItem("usuario") || "{}");

  return (
    <div className="app-layout">
      <Topbar user={user} onMenuOpen={() => setIsMobileMenuOpen(true)} />
      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      <div className="main-content" style={{ marginTop: "60px" }}>
        {/* Overlay for mobile when sidebar is open */}
        {isMobileMenuOpen && (
          <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
        )}

        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<ProtectedRoute path="/home"><Home /></ProtectedRoute>} />
            <Route path="/minuta/:id_reunion" element={<ProtectedRoute path="/home"><Home /></ProtectedRoute>} />
            <Route path="/registrar-reunion" element={<ProtectedRoute path="/registrar-reunion"><Home /></ProtectedRoute>} />
            <Route path="/generar-encuesta" element={<ProtectedRoute path="/generar-encuesta"><GenerarEncuesta /></ProtectedRoute>} />
            <Route path="/agendar" element={<ProtectedRoute path="/agendar"><AgendarReunion /></ProtectedRoute>} />
            <Route path="/dashboard-reuniones" element={<ProtectedRoute path="/dashboard-reuniones"><DashboardReuniones /></ProtectedRoute>} />
            <Route path="/vincular-reuniones" element={<ProtectedRoute path="/vincular-reuniones"><VincularReuniones /></ProtectedRoute>} />
            <Route path="/dashboard-encuestas" element={<ProtectedRoute path="/dashboard-encuestas"><DashboardEncuestas /></ProtectedRoute>} />
            
            {/* Jefatura y Ejecutiva tienen los mismos permisos */}
            <Route path="/editor-encuestas" element={<ProtectedRoute allowedRoles={['jefatura', 'ejecutiva', 'admin']} path="/editor-encuestas"><EditorEncuestas /></ProtectedRoute>} />
            
            {/* Solo Administradores y Jefatura/Ejecutiva (con restricciones en UI) */}
            <Route path="/gestion-empresas" element={<ProtectedRoute allowedRoles={['admin', 'jefatura', 'ejecutiva']} path="/gestion-empresas"><GestionEmpresas /></ProtectedRoute>} />
            <Route path="/seguimiento-empresas" element={<ProtectedRoute allowedRoles={['jefatura', 'admin', 'ejecutiva', 'gerencia', 'gerencia_general']} path="/seguimiento-empresas"><SeguimientoEmpresas /></ProtectedRoute>} />
            
            {/* Solo Administradores */}
            <Route path="/gestion-usuarios" element={<ProtectedRoute allowedRoles={['admin']} path="/gestion-usuarios"><GestionUsuarios /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} path="/admin"><AdminPanel /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* 🔓 RUTAS PÚBLICAS */}
          <Route path="/login" element={<Login />} />
          <Route path="/encuesta/:token" element={<ResponderEncuesta />} />

          {/* 🔒 RUTAS ADMINISTRATIVAS (Con Sidebar) */}
          <Route 
            path="*" 
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
