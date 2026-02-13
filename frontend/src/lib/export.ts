/**
 * Export utilities with proper Bangla font support.
 *
 * PDF generation uses browser print (window.print) which natively renders
 * Bangla / Unicode via the Noto Sans Bengali web font already loaded on the page.
 * This avoids jsPDF's lack of Bangla glyph support.
 */

export function downloadCSV(filename: string, rows: Record<string, unknown>[], columns: { key: string; label: string }[]) {
  const header = columns.map((c) => c.label).join(',');
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((row) => columns.map((c) => escape(row[c.key])).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + header + '\n' + body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate a printable PDF via the browser's print dialog.
 * This supports Bangla fonts natively (Noto Sans Bengali loaded via Google Fonts).
 */
export function downloadPDF(
  title: string,
  columns: { key: string; label: string }[],
  rows: Record<string, unknown>[],
  filename?: string,
  options?: { institution?: string; subtitle?: string }
) {
  const institution = options?.institution ?? '';
  const subtitle = options?.subtitle ?? '';
  const now = new Date().toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const tableRows = rows
    .map(
      (row) =>
        '<tr>' +
        columns.map((c) => `<td>${row[c.key] != null ? String(row[c.key]) : ''}</td>`).join('') +
        '</tr>'
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi', sans-serif;
    color: #1e293b;
    padding: 20px 30px;
    font-size: 11px;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #3b82f6; padding-bottom: 12px; }
  .header h1 { font-size: 18px; font-weight: 700; color: #1e3a5f; margin-bottom: 2px; }
  .header .institution { font-size: 14px; font-weight: 600; color: #475569; }
  .header .subtitle { font-size: 11px; color: #64748b; }
  .header .date { font-size: 10px; color: #94a3b8; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f1f5f9; color: #334155; font-weight: 600; font-size: 10px; text-align: left; padding: 6px 8px; border: 1px solid #e2e8f0; }
  td { padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 10px; }
  tr:nth-child(even) { background: #f8fafc; }
  .footer { margin-top: 16px; text-align: center; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 6px; }
  @media print {
    body { padding: 10px 15px; }
    @page { margin: 12mm 10mm; size: A4; }
  }
</style>
</head>
<body>
<div class="header">
  ${institution ? `<div class="institution">${institution}</div>` : ''}
  <h1>${title}</h1>
  ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
  <div class="date">${now}</div>
</div>
<table>
  <thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join('')}</tr></thead>
  <tbody>${tableRows}</tbody>
</table>
<div class="footer">Generated from School Management System</div>
<script>
  // Auto-print after font loads
  document.fonts.ready.then(() => { setTimeout(() => window.print(), 300); });
</script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/**
 * Print any HTML element as PDF with proper Bangla font support.
 * Uses browser print to render Unicode/Bangla correctly.
 */
export function printElementAsPDF(elementId: string, title?: string) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
<meta charset="utf-8" />
<title>${title ?? 'Report'}</title>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Bengali', 'Kalpurush', 'SolaimanLipi', sans-serif;
    color: #1e293b; padding: 20px 30px; font-size: 12px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 5px 8px; border: 1px solid #e2e8f0; font-size: 11px; }
  th { background: #f1f5f9; font-weight: 600; }
  @media print { body { padding: 10px 15px; } @page { margin: 12mm 10mm; size: A4; } }
</style>
</head>
<body>${el.innerHTML}
<script>document.fonts.ready.then(()=>{setTimeout(()=>window.print(),300)});</script>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
