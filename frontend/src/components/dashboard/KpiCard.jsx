import React from "react";

export default function KpiCard({ title, value, sub, color, trend, icon, onClick, isSelected }) {
  const cardColor = color || "var(--primary-color)";

  // If the icon is an SVG element and we want it to be a bit larger/standardized, we can clone it.
  // But for safety if it's just a node, we'll render it as is, inside a styled wrapper.
  const renderIcon = () => {
    if (React.isValidElement(icon)) {
      // Intenta inyectar un tamaño estándar si es posible, o déjalo como está.
      return React.cloneElement(icon, { width: 28, height: 28, strokeWidth: 1.5 });
    }
    return icon;
  };

  return (
    <div
      className={`kpi-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      style={{
        background: isSelected ? `${cardColor}08` : "#fff",
        padding: "12px 14px",
        borderRadius: "10px",
        border: isSelected ? `2.5px solid ${cardColor}` : "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        boxShadow: isSelected ? "0 8px 16px rgba(0,0,0,0.08)" : "0 2px 4px rgba(0,0,0,0.02)",
        transition: "all 0.2s ease",
        cursor: onClick ? "pointer" : "default",
        overflow: "hidden",
        transform: isSelected ? "translateY(-3px)" : "translateY(0)",
      }}
      onMouseEnter={(e) => {
        if (!isSelected && onClick) {
          e.currentTarget.style.transform = "translateY(-3px)";
          e.currentTarget.style.boxShadow = "0 8px 12px -3px rgba(0,0,0,0.08)";
          e.currentTarget.style.borderColor = cardColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
          e.currentTarget.style.borderColor = "#e2e8f0";
        }
      }}
    >
      {icon && (
        <div
          className="kpi-card-icon"
          style={{
            color: cardColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {renderIcon()}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", flex: 1 }}>
        <span
          className="kpi-card-value"
          style={{
            fontSize: "18px",
            fontWeight: "800",
            color: "#1e293b",
            lineHeight: "1.1",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            overflow: "hidden"
          }}
        >
          {value}
        </span>
        <span
          className="kpi-card-title"
          title={title}
          style={{
            fontSize: "12px",
            color: "#64748b",
            lineHeight: "1.2",
            marginTop: "3px",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            overflow: "hidden",
          }}
        >
          {title}
        </span>
        {trend ? (
          <span
            style={{
              fontSize: "11px",
              fontWeight: "bold",
              color: trend.startsWith("+") || trend.startsWith("↑") ? "#059669" : "#dc2626",
              marginTop: "4px"
            }}
          >
            {trend}
          </span>
        ) : sub ? (
          <span
            title={sub}
            style={{
              fontSize: "10px",
              fontWeight: "600",
              color: cardColor,
              marginTop: "4px",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden"
            }}
          >
            {sub}
          </span>
        ) : null}
      </div>
    </div>
  );
}
