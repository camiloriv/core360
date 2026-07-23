function FormActions({ loading }) {
  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'flex-end', marginTop: '20px' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#475569' }}>
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
