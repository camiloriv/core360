import { useState, useRef, useEffect } from "react";

function AutocompleteInput({ value, suggestions = [], onChange, placeholder, required }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || "");
  const dropdownRef = useRef(null);

  useEffect(() => {
    setSearchTerm(value || "");
  }, [value]);

  const filteredSuggestions = suggestions.filter((s) =>
    s.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    onChange({ target: { value: val } });
    setSearchTerm(val);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChange(e);
    setIsOpen(true);
  };

  return (
    <div className="field full" ref={dropdownRef} style={{ position: "relative" }}>
      <input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onFocus={() => setIsOpen(true)}
        onChange={handleInputChange}
        autoComplete="off"
        required={required}
      />
      
      {isOpen && filteredSuggestions.length > 0 && (
        <ul className="autocomplete-list" style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          maxHeight: "200px",
          overflowY: "auto",
          backgroundColor: "white",
          border: "1px solid #cbd5e1",
          borderRadius: "4px",
          margin: 0,
          padding: 0,
          listStyle: "none",
          zIndex: 100,
          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
        }}>
          {filteredSuggestions.map((s, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(s)}
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
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AutocompleteInput;
