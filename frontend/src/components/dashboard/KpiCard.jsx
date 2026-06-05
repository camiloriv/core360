import React from "react";

export default function KpiCard({ title, value, sub, color, trend, icon }) {
  const cardColor = color || "var(--primary-color)";

  return (
    <div
      className="kpi-card"
      style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
        height: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow =
          "0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
      }}
    >
      {/* Decorative colored left border */}
      <div
        className="kpi-card-border"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "4px",
          backgroundColor: cardColor,
        }}
      ></div>

      <div
        className="kpi-card-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "15px",
        }}
      >
        <span
          className="kpi-card-title"
          style={{
            fontSize: "11px",
            color: "#64748b",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            paddingLeft: "4px",
          }}
        >
          {title}
        </span>
        {icon && (
          <div
            className="kpi-card-icon"
            style={{
              background: `${cardColor}15`,
              padding: "6px",
              borderRadius: "8px",
              color: cardColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="kpi-card-body" style={{ paddingLeft: "4px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
          <span
            className="kpi-card-value"
            style={{
              fontSize: "32px",
              fontWeight: "800",
              color: "#1e293b",
              lineHeight: "1",
            }}
          >
            {value}
          </span>
          {trend && (
            <span
              className="kpi-card-trend"
              style={{
                fontSize: "11px",
                fontWeight: "bold",
                color:
                  trend.startsWith("+") || trend.startsWith("↑")
                    ? "#059669"
                    : "#dc2626",
                background:
                  trend.startsWith("+") || trend.startsWith("↑")
                    ? "#dcfce7"
                    : "#fee2e2",
                padding: "2px 6px",
                borderRadius: "4px",
              }}
            >
              {trend}
            </span>
          )}
        </div>
        <span
          className="kpi-card-sub"
          style={{
            fontSize: "11px",
            color: "#94a3b8",
            display: "block",
            marginTop: "8px",
          }}
        >
          {sub}
        </span>
      </div>
    </div>
  );
}
