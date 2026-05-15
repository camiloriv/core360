function FormActions({ loading }) {
  return (
    <button type="submit" className="btn" disabled={loading}>
      {loading ? "Guardando..." : "Guardar reunión"}
    </button>
  );
}

export default FormActions;
