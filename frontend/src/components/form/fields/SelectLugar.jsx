function SelectLugar({ label, name, opciones = [], form, setField }) {

  const esPresencial = form[name] === "Presencial";

  return (
    <div className="field full">
      <label>{label}</label>

      <select
        value={form[name] || ""}
        onChange={(e) => setField(name, e.target.value)}
      >
        <option value="">Seleccione</option>

        {opciones.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>

      {esPresencial && (
        <input
          placeholder="Dirección"
          value={form.lugar_detalle || ""}
          onChange={(e) => setField("lugar_detalle", e.target.value)}
        />
      )}
    </div>
  );
}

export default SelectLugar;
