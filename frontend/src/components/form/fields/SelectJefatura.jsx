import { capitalizar } from "../../../utils/textUtils";

function SelectJefatura({ value, jefaturas = [], onChange, required }) {
  return (
    <div className="field">
      <label>
        JEFATURA {required && <span style={{ color: 'red' }}>*</span>}
      </label>

      <select
        name="jefatura_id"
        value={value}
        onChange={onChange}
      >
        <option value="">Seleccione</option>

        {jefaturas.map(j => (
          <option key={j.id} value={j.id}>
            {capitalizar(j.nombre)}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SelectJefatura;
