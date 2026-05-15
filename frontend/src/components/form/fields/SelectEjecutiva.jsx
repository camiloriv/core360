import { capitalizar } from "../../../utils/textUtils";

function SelectEjecutiva({ value, ejecutivas = [], onChange }) {
  return (
    <div className="field">
      <label>EJECUTIVA</label>

      <select
        name="ejecutiva_id"
        value={value}
        onChange={onChange}
      >
        <option value="">Seleccione</option>

        {ejecutivas.map(e => (
          <option key={e.id} value={e.id}>
            {capitalizar(e.nombre)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SelectEjecutiva;
