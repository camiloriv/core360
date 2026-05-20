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
import GestionEjecutivas from "./pages/GestionEjecutivas";
import SeguimientoEmpresas from "./pages/SeguimientoEmpresas";
import GestionUsuarios from "./pages/GestionUsuarios";
import Sidebar from "./components/Sidebar";

// ProtectedRoute component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const user = JSON.parse(localStorage.getItem("usuario") || "null");
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.permisos)) {
    return <Navigate to="/" replace />;
  }

  return children;
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
              <div style={{ display: 'flex' }}>
                <Sidebar />
                <div style={{ flex: 1, marginLeft: '100px', minHeight: '100vh', background: 'var(--bg-body)' }}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/crear-encuesta" element={<CrearEncuesta />} />
                    <Route path="/dashboard-reuniones" element={<DashboardReuniones />} />
                    <Route path="/dashboard-encuestas" element={<DashboardEncuestas />} />
                    
                    {/* Solo Jefatura puede ver esto, o admins */}
                    <Route path="/editor-encuestas" element={<ProtectedRoute allowedRoles={['jefatura', 'admin']}><EditorEncuestas /></ProtectedRoute>} />
                    
                    {/* Solo Administradores */}
                    <Route path="/gestion-ejecutivas" element={<ProtectedRoute allowedRoles={['admin']}><GestionEjecutivas /></ProtectedRoute>} />
                    <Route path="/seguimiento-empresas" element={<ProtectedRoute allowedRoles={['jefatura', 'admin', 'ejecutiva']}><SeguimientoEmpresas /></ProtectedRoute>} />
                    
                    {/* Solo Administradores */}
                    <Route path="/gestion-usuarios" element={<ProtectedRoute allowedRoles={['admin']}><GestionUsuarios /></ProtectedRoute>} />
                  </Routes>
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
