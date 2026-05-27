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

    const handleLogout = () => {
      // Remover usuario de la sesión y del timestamp
      localStorage.removeItem('usuario');
      localStorage.removeItem('ultimoAcceso');
      
      // Mostrar alerta al usuario y redirigir al login al presionar Aceptar
      Swal.fire({
        title: 'Sesión Expirada',
        text: 'Tu sesión ha sido cerrada automáticamente tras 30 minutos de inactividad.',
        icon: 'warning',
        confirmButtonText: 'Volver a Ingresar',
        confirmButtonColor: 'var(--secondary-color, #e05e2b)',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(() => {
        window.location.href = '/login';
      });
    };

    // Verificar en el montaje si ya excedió el tiempo límite mientras el navegador estuvo cerrado
    const ultimoAcceso = localStorage.getItem('ultimoAcceso');
    if (ultimoAcceso) {
      const diff = Date.now() - parseInt(ultimoAcceso, 10);
      if (diff > timeoutMs) {
        handleLogout();
        return;
      }
    } else {
      localStorage.setItem('ultimoAcceso', Date.now().toString());
    }

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(handleLogout, timeoutMs);

      // Throttling: solo escribir en localStorage si han pasado más de 5 segundos desde la última actualización
      const now = Date.now();
      const lastWrite = parseInt(localStorage.getItem('ultimoAcceso') || '0', 10);
      if (now - lastWrite > 5000) {
        localStorage.setItem('ultimoAcceso', now.toString());
      }
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
