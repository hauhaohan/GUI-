// src/utils/exportUtils.js
// Xuất dữ liệu bảng ra file CSV và Excel/TSV

export function exportToCsv(filename, data) {
  if (!data || !data.length) {
    alert('Không có dữ liệu để xuất file.');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Header row
  csvRows.push(headers.join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header] === null || row[header] === undefined ? '' : row[header];
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const csvString = '\uFEFF' + csvRows.join('\r\n'); // BOM UTF-8 for Excel
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToExcel(filename, data) {
  if (!data || !data.length) {
    alert('Không có dữ liệu để xuất file.');
    return;
  }

  const headers = Object.keys(data[0]);
  let tsvContent = '\uFEFF' + headers.join('\t') + '\r\n';

  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header] === null || row[header] === undefined ? '' : row[header];
      return ('' + val).replace(/\t/g, ' ');
    });
    tsvContent += values.join('\t') + '\r\n';
  }

  const blob = new Blob([tsvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, `${filename}.xls`);
}

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
