function FormActions({ loading, esRetroactiva, submitAction }) {
  if (esRetroactiva) {
    return (
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', justifyContent: 'flex-end', marginTop: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
          <button 
            type="submit" 
            name="enviar"
            className="btn" 
            disabled={loading}
            style={{ padding: '10px 30px', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', height: '44px', width: '100%', margin: 0, background: '#10b981', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            📋 {loading ? "Registrando..." : "Registrar Minuta Retroactiva"}
          </button>
        </div>
      </div>
    );
  }

  const getGuardarText = () => {
    if (loading && submitAction === 'guardar') return "Guardando...";
    return "Guardar Borrador";
  };

  const getEnviarText = () => {
    if (!loading) return "Enviar";
    if (submitAction === 'guardar') return "Guardando...";
    if (submitAction === 'prueba') return "Guardando y enviando prueba...";
    return "Enviando...";
  };

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', justifyContent: 'flex-end', marginTop: '20px' }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <button 
          type="submit" 
          name="solo_guardar"
          className="btn-secondary" 
          disabled={loading}
          style={{ padding: '10px 30px', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', background: '#e2e8f0', color: '#334155', border: 'none', cursor: 'pointer', height: '44px', margin: 0 }}
          title="Guarda tu progreso sin enviar ningún correo"
        >
          {getGuardarText()}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <button 
          type="submit" 
          name="enviar"
          className="btn" 
          disabled={loading}
          style={{ padding: '10px 30px', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', height: '44px', width: '100%', margin: 0 }}
        >
          {getEnviarText()}
        </button>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          <input 
            type="checkbox" 
            name="es_borrador_checkbox" 
            style={{ width: '14px', height: '14px', cursor: 'pointer', margin: 0 }} 
          />
          Envío de prueba
        </label>
      </div>
    </div>
  );
}

export default FormActions;
