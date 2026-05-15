// === ESTILOS PARA EL DASHBOARD DE ENCUESTAS ===

const styles = {
  filterPanel: { 
    display: 'flex', 
    gap: '20px', 
    background: '#fff', 
    padding: '20px', 
    borderRadius: '12px', 
    border: '1px solid #e2e8f0', 
    marginBottom: '25px', 
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' 
  },
  filterGroup: { display: 'flex', flexDirection: 'column', flex: 1 },
  label: { fontSize: '11px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' },
  select: { padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#f8fafc', fontWeight: 'bold' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '20px', marginBottom: '40px' },
  kpiCard: { 
    background: '#fff', 
    padding: '20px', 
    borderRadius: '12px', 
    border: '1px solid #e2e8f0', 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' 
  },
  kpiTitle: { fontSize: '10px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px' },
  kpiValue: { fontSize: '32px', fontWeight: '800' },
  kpiSubText: { fontSize: '11px', color: '#64748b', marginTop: '5px' },
  chartsGrid: { display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px', marginBottom: '40px' },
  chartBox: { 
    background: '#fff', 
    padding: '25px', 
    borderRadius: '12px', 
    border: '1px solid #e2e8f0', 
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' 
  },
  sectionTitle: { 
    fontSize: '12px', 
    color: '#1e293b', 
    marginBottom: '20px', 
    textTransform: 'uppercase', 
    fontWeight: 'bold', 
    borderLeft: '4px solid #3b82f6', 
    paddingLeft: '15px' 
  },
  tableCard: { background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  tableHeader: { padding: '20px', borderBottom: '1px solid #e2e8f0' },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" },
  th: { backgroundColor: "#f8fafc", color: "#475569", borderBottom: "2px solid #e2e8f0" },
  thCell: { padding: '15px 12px', fontWeight: '700', textTransform: 'uppercase' },
  tdCell: { padding: "15px 12px", borderBottom: "1px solid #f1f5f9", color: "#475569", verticalAlign: "top" },
  tr: { transition: "background 0.2s" },
  respuestasBox: { 
    fontSize: "11px", 
    background: "#f8fafc", 
    padding: "6px 12px", 
    borderRadius: "6px", 
    border: '1px solid #e2e8f0' 
  },
  statusBadge: { fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' },
  surveyTypeBadge: { fontSize: '11px', color: '#1e3a8a', fontWeight: 'bold', textTransform: 'uppercase', marginTop: '4px' },
  meetingIdText: { fontSize: '10px', color: '#64748b', marginTop: '2px' },
  dateCol: { display: 'flex', flexDirection: 'column', gap: '4px' },
  dateLabel: { color: '#64748b' },
  companyName: { fontWeight: 'bold', color: '#1e40af' },
  ejecutivaName: { fontSize: '11px', color: '#64748b' },
  actionsCol: { display: 'flex', flexDirection: 'column', gap: '10px' },
  pendingActions: { display: 'flex', gap: '5px' },
  btnAction: { flex: 1, padding: '6px 8px', borderRadius: '6px', border: 'none', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' },
  btnSecondary: { 
    padding: '6px 12px', 
    borderRadius: '6px', 
    border: '1px solid #d1d5db', 
    background: '#fff', 
    color: '#374151', 
    fontSize: '11px', 
    fontWeight: 'bold', 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: '5px', 
    width: '100%' 
  },
  noRespText: { color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' },
  swalLabel: "font-weight: bold; color: #64748b; margin-bottom: 5px; display: block;"
};

export default styles;
