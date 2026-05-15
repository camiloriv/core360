import React from "react";
import styles from "../../styles/DashboardStyles";

export default function KpiCard({ title, value, sub, color }) {
  return (
    <div style={styles.kpiCard}>
      <span style={styles.kpiTitle}>{title}</span>
      <span style={{ ...styles.kpiValue, color }}>{value}</span>
      <span style={styles.kpiSubText}>{sub}</span>
    </div>
  );
}
