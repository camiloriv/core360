import { useEffect } from "react";
import ReunionesForm from "../components/reuniones/ReunionesForm";

function Home() {
  useEffect(() => {
    document.title = "CORE 360 - Registrar Reunión";
  }, []);

  return (
    <div className="encuesta-page" style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <ReunionesForm />
    </div>
  );
}

export default Home;

