import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';

const DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export const useInactivityLogout = (timeoutMs = DEFAULT_TIMEOUT) => {
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef(null);

  useEffect(() => {
    // Si no hay un usuario en localStorage, no activamos el limitador de inactividad
    const user = localStorage.getItem('usuario');
    if (!user) return;

    // Si estamos en la página de login, tampoco lo necesitamos
    if (location.pathname === '/login') return;

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(handleLogout, timeoutMs);
    };

    const handleLogout = () => {
      // Remover usuario de la sesión
      localStorage.removeItem('usuario');
      
      // Mostrar alerta al usuario
      Swal.fire({
        title: 'Sesión Expirada',
        text: 'Tu sesión ha sido cerrada automáticamente tras 30 minutos de inactividad.',
        icon: 'warning',
        confirmButtonText: 'Volver a Ingresar',
        confirmButtonColor: 'var(--secondary-color, #e05e2b)',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(() => {
        // Redirigir al login
        navigate('/login');
      });
    };

    // Eventos a monitorear para reiniciar el timer de inactividad
    const events = [
      'mousemove',
      'mousedown',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    // Inicializar el temporizador
    resetTimer();

    // Agregar listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Cleanup al desmontar o cambiar de ruta
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [navigate, location.pathname, timeoutMs]);
};
