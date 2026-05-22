import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";

import "./styles/base.css";
import "./styles/layout.css";
import "./styles/agoras-theme.css";
import "./styles/components.css";
import CrearEncuesta from "./pages/CrearEncuesta";
import ResponderEncuesta from "./pages/ResponderEncuesta";


import DashboardReuniones from "./pages/DashboardReuniones";
import DashboardEncuestas from "./pages/DashboardEncuestas";
import EditorEncuestas from "./pages/EditorEncuestas";
import GestionEmpresas from "./pages/GestionEmpresas";
import SeguimientoEmpresas from "./pages/SeguimientoEmpresas";
import GestionUsuarios from "./pages/GestionUsuarios";
import Sidebar from "./components/Sidebar";
import { useInactivityLogout } from "./hooks/useInactivityLogout";

// ProtectedRoute component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem("usuario") || "null");
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.permisos)) {
    return <Navigate to="/registrar-reunion" replace />;
  }

  return children;
};

// MainLayout wrapper to handle inactivity logout hook
const MainLayout = () => {
  useInactivityLogout();
  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: '100px', minHeight: '100vh', background: 'var(--bg-body)' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/registrar-reunion" replace />} />
          <Route path="/registrar-reunion" element={<Home />} />
          <Route path="/crear-encuesta" element={<CrearEncuesta />} />
          <Route path="/dashboard-reuniones" element={<DashboardReuniones />} />
          <Route path="/dashboard-encuestas" element={<DashboardEncuestas />} />
          
          {/* Jefatura y Ejecutiva tienen los mismos permisos */}
          <Route path="/editor-encuestas" element={<ProtectedRoute allowedRoles={['jefatura', 'ejecutiva', 'admin']}><EditorEncuestas /></ProtectedRoute>} />
          
          {/* Solo Administradores */}
          <Route path="/gestion-empresas" element={<ProtectedRoute allowedRoles={['admin']}><GestionEmpresas /></ProtectedRoute>} />
          <Route path="/seguimiento-empresas" element={<ProtectedRoute allowedRoles={['jefatura', 'admin', 'ejecutiva', 'gerencia', 'gerencia_general']}><SeguimientoEmpresas /></ProtectedRoute>} />
          
          {/* Solo Administradores */}
          <Route path="/gestion-usuarios" element={<ProtectedRoute allowedRoles={['admin']}><GestionUsuarios /></ProtectedRoute>} />
        </Routes>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;
