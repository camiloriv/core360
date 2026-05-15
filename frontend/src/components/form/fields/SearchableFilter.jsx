import { useState, useRef, useEffect } from "react";

/**
 * Componente genérico para filtros con búsqueda (Autocompletado)
 * Ideal para Dashboards donde hay muchas opciones.
 */
function SearchableFilter({ label, value, options = [], onChange, placeholder = "Buscar..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // El valor mostrado cuando no se está editando
  const displayValue = isOpen ? searchTerm : value;

  // Filtrar opciones basado en el término de búsqueda
  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
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

  const handleSelect = (opt) => {
    onChange(opt);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div style={{ position: "relative", flex: 1, minWidth: '200px' }} ref={dropdownRef}>
      <label style={{ 
        display: "block", 
        fontSize: "11px", 
        fontWeight: "bold", 
        color: "#64748b", 
        textTransform: "uppercase",
        marginBottom: "6px"
      }}>
        {label}
      </label>
      
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder={placeholder}
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
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1.5px solid #e2e8f0",
            fontSize: "13px",
            color: "#334155",
            outline: "none",
            background: "#fff",
            transition: "border-color 0.2s",
            cursor: "pointer"
          }}
        />
        <span style={{ 
            position: 'absolute', 
            right: '12px', 
            top: '50%', 
            transform: 'translateY(-50%)',
            fontSize: '10px',
            pointerEvents: 'none',
            opacity: 0.5
        }}>
            {isOpen ? '🔍' : '▼'}
        </span>
      </div>
      
      {isOpen && (
        <ul style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          maxHeight: "250px",
          overflowY: "auto",
          backgroundColor: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          marginTop: "4px",
          padding: "5px",
          listStyle: "none",
          zIndex: 100,
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
        }}>
          {filteredOptions.length === 0 ? (
            <li style={{ padding: "10px", color: "#94a3b8", fontSize: "13px", textAlign: 'center' }}>
                Sin resultados
            </li>
          ) : (
            filteredOptions.map((opt) => (
              <li
                key={opt}
                onClick={() => handleSelect(opt)}
                style={{
                  padding: "10px 12px",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: opt === value ? "#1e40af" : "#334155",
                  fontWeight: opt === value ? "bold" : "normal",
                  background: opt === value ? "#eff6ff" : "transparent",
                  borderRadius: "6px",
                  marginBottom: "2px",
                  transition: "all 0.1s"
                }}
                onMouseOver={(e) => {
                    if (opt !== value) e.target.style.backgroundColor = "#f8fafc";
                }}
                onMouseOut={(e) => {
                    if (opt !== value) e.target.style.backgroundColor = "transparent";
                }}
              >
                {opt}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default SearchableFilter;
