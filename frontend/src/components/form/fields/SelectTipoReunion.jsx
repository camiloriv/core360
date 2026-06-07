function SelectTipoReunion({ value, onChange, detalle, onDetalleChange, tipos = [], required }) {

  const esOtro = value === "Otros";

  // Filter out any "Otros" value if it was saved in the db, as we handle it separately
  // and ensure we don't have duplicates.
  const filteredTipos = (tipos || []).filter(t => t !== "Otros");

  return (
    <div className="field">
      <label>
        TIPO REUNIÓN {required && <span style={{ color: 'red' }}>*</span>}
      </label>

      <select
        value={value || ""}
        onChange={onChange}
      >
        <option value="">Seleccione</option>
        {filteredTipos.map((tipo) => (
          <option key={tipo} value={tipo}>
            {tipo}
          </option>
        ))}
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
