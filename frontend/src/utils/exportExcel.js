import * as XLSX from 'xlsx';

export const exportToExcel = (data, fileName) => {
  const worksheet = XLSX.utils.json_to_sheet(data, { cellDates: true, dateNF: 'dd/mm/yyyy' });
  
  // Ajuste básico de ancho de columnas
  if (data && data.length > 0) {
    const colWidths = Object.keys(data[0]).map(key => ({
      wch: Math.max(key.length, 18) // Mínimo 18 caracteres de ancho
    }));
    worksheet['!cols'] = colWidths;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Datos");
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};
