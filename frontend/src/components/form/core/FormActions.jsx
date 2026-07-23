function FormActions({ loading }) {
  return (
    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
      <button 
        type="submit" 
        name="borrador"
        className="btn-secondary" 
        disabled={loading} 
        style={{ backgroundColor: '#fef08a', color: '#854d0e', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold' }}
      >
        {loading ? "Guardando..." : "Dejar en borrador (Enviarme a mi mismo)"}
      </button>
      <button 
        type="submit" 
        name="enviar"
        className="btn" 
        disabled={loading}
        style={{ padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold' }}
      >
        {loading ? "Enviando..." : "Enviar minuta a clientes"}
      </button>
    </div>
  );
}

export default FormActions;
