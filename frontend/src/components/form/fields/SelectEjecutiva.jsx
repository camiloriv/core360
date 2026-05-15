import { capitalizar } from "../../../utils/textUtils";

function SelectEjecutiva({ value, ejecutivas = [], onChange, required }) {
  return (
    <div className="field">
      <label>
        EJECUTIVA {required && <span style={{ color: 'red' }}>*</span>}
      </label>

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
