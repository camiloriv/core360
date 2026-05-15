import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";


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
import Sidebar from "./components/Sidebar";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🔓 RUTA PÚBLICA (Sin Sidebar) */}
        <Route path="/encuesta/:token" element={<ResponderEncuesta />} />

        {/* 🔒 RUTAS ADMINISTRATIVAS (Con Sidebar) */}
        <Route 
          path="*" 
          element={
            <div style={{ display: 'flex' }}>
              <Sidebar />
              <div style={{ flex: 1, marginLeft: '100px', minHeight: '100vh', background: '#f8fafc' }}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/crear-encuesta" element={<CrearEncuesta />} />
                  <Route path="/dashboard-reuniones" element={<DashboardReuniones />} />
                  <Route path="/dashboard-encuestas" element={<DashboardEncuestas />} />
                  <Route path="/editor-encuestas" element={<EditorEncuestas />} />
                  <Route path="/gestion-ejecutivas" element={<GestionEjecutivas />} />
                  <Route path="/seguimiento-empresas" element={<SeguimientoEmpresas />} />
                </Routes>
              </div>
            </div>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
