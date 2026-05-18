import { useState, useRef, useEffect } from "react";

function SelectEmpresa({ value, empresas = [], onChange, required }) {

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Obtener nombre de la empresa seleccionada
  const selectedEmpresa = empresas.find((e) => e.id === value);
  const displayValue = isOpen ? searchTerm : (selectedEmpresa ? selectedEmpresa.nombre : "");

  // Filtrar empresas
  const filteredEmpresas = empresas.filter((emp) =>
    emp.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id) => {
    onChange({ target: { name: "empresa_id", value: id } });
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="field full" ref={dropdownRef} style={{ position: "relative" }}>
      <label>
        EMPRESA {required && <span style={{ color: 'red' }}>*</span>}
      </label>
      <input
        type="text"
        placeholder="Seleccione o busque una empresa..."
        value={displayValue}
        onFocus={() => {
          setIsOpen(true);
          setSearchTerm("");
        }}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsOpen(true);
        }}
        autoComplete="off"
      />
      
      {isOpen && (
        <ul className="autocomplete-list" style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          maxHeight: "250px",
          overflowY: "auto",
          backgroundColor: "white",
          border: "1px solid #cbd5e1",
          borderRadius: "4px",
          margin: 0,
          padding: 0,
          listStyle: "none",
          zIndex: 50,
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
        }}>
          <li
            onClick={() => handleSelect("")}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              fontSize: "13px",
              color: "var(--text-light)",
              fontStyle: "italic",
              borderBottom: "1px solid #f1f5f9"
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#f8fafc"}
            onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
          >
            -- Seleccione --
          </li>

          {filteredEmpresas.length === 0 ? (
            <li style={{ padding: "8px 12px", color: "var(--text-muted)", fontSize: "13px" }}>No se encontraron coincidencias</li>
          ) : (
            filteredEmpresas.map((emp) => (
              <li
                key={emp.id}
                onClick={() => handleSelect(emp.id)}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#334155",
                  borderBottom: "1px solid #f1f5f9",
                  transition: "background-color 0.1s"
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = "var(--bg-muted)"}
                onMouseOut={(e) => e.target.style.backgroundColor = "transparent"}
              >
                {emp.nombre}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default SelectEmpresa;
