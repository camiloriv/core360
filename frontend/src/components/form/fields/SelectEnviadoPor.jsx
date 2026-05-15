function SelectEnviadoPor({ value, onChange, ejecutivas = [] }) {
  return (
    <div className="field">
      <label>Enviado por</label>
      <select name="enviado_por" value={value} onChange={onChange}>
        
        <option value="">Seleccione</option>
        {ejecutivas.map((ej) => (
          <option key={ej.id} value={ej.nombre.toLowerCase().replace(/ /g, '_')}>
            {ej.nombre}
          </option>
        ))}

      </select>
    </div>
  );
}

export default SelectEnviadoPor;
