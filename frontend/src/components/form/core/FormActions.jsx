function FormActions({ loading }) {
  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'flex-end', marginTop: '20px' }}>
      <button 
        type="submit" 
        name="solo_guardar"
        className="btn-secondary" 
        disabled={loading}
        style={{ padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', fontSize: '14px', background: '#e2e8f0', color: '#334155', border: 'none', cursor: 'pointer' }}
        title="Guarda tu progreso sin enviar ningún correo"
      >
        Guardar Borrador
      </button>

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#475569', marginLeft: '10px' }}>
        <input 
          type="checkbox" 
          name="es_borrador_checkbox" 
          style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
        />
        Envío de prueba (Borrador)
      </label>
      
      <button 
        type="submit" 
        name="enviar"
        className="btn" 
        disabled={loading}
        style={{ padding: '10px 30px', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px' }}
      >
        {loading ? "Enviando..." : "Enviar"}
      </button>
    </div>
  );
}

export default FormActions;
