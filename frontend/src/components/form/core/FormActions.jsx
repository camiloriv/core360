function FormActions({ loading }) {
  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', justifyContent: 'flex-end', marginTop: '20px' }}>
      <button 
        type="submit" 
        name="solo_guardar"
        className="btn-secondary" 
        disabled={loading}
        style={{ padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', background: '#e2e8f0', color: '#334155', border: 'none', cursor: 'pointer', height: '44px' }}
        title="Guarda tu progreso sin enviar ningún correo"
      >
        Guardar Borrador
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <button 
          type="submit" 
          name="enviar"
          className="btn" 
          disabled={loading}
          style={{ padding: '10px 30px', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', height: '44px', width: '100%' }}
        >
          {loading ? "Enviando..." : "Enviar"}
        </button>
        
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: 'bold', color: '#64748b', fontSize: '12px' }}>
          <input 
            type="checkbox" 
            name="es_borrador_checkbox" 
            style={{ width: '14px', height: '14px', cursor: 'pointer', margin: 0 }} 
          />
          Envío de prueba (Borrador)
        </label>
      </div>
    </div>
  );
}

export default FormActions;
