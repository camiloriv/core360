function SelectTipoReunion({ value, onChange, detalle, onDetalleChange }) {

  const esOtro = value === "Otros";

  return (
    <div className="field">
      <label>TIPO REUNIÓN</label>

      <select
        value={value || ""}
        onChange={onChange}
      >
        <option value="">Seleccione</option>
        <option value="Inducción">Inducción</option>
        <option value="Implementación TI">Implementación TI</option>
        <option value="Otros">Otros</option>
      </select>

      {esOtro && (
        <input
          type="text"
          placeholder="Especifique tipo de reunión"
          value={detalle || ""}
          onChange={(e) =>
            onDetalleChange({
              target: { value: e.target.value }
            })
          }
        />
      )}
    </div>
  );
}

export default SelectTipoReunion;
