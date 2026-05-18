type ExportCell = string | number | null | undefined

function escapeHtml(value: ExportCell) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function escapeCsv(value: ExportCell) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export function createCsv(headers: string[], rows: ExportCell[][]) {
  return [headers.map(escapeCsv).join(','), ...rows.map((row) => row.map(escapeCsv).join(','))].join('\n')
}

export function createExcelHtml(title: string, headers: string[], rows: ExportCell[][]) {
  const headerHtml = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')
  const rowsHtml = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head>
<body>
<h1>${escapeHtml(title)}</h1>
<table border="1">
<thead><tr>${headerHtml}</tr></thead>
<tbody>${rowsHtml}</tbody>
</table>
</body>
</html>`
}

export function createSimplePdf(title: string, lines: string[]) {
  const contentLines = [
    'BT',
    '/F1 18 Tf',
    '50 790 Td',
    `(${pdfText(title)}) Tj`,
    '/F1 10 Tf',
    '0 -28 Td',
    ...lines.flatMap((line) => [`(${pdfText(line)}) Tj`, '0 -15 Td']),
    'ET',
  ]
  const stream = contentLines.join('\n')
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`,
  ]
  let offset = '%PDF-1.4\n'.length
  const xref = objects.map((object) => {
    const line = `${String(offset).padStart(10, '0')} 00000 n `
    offset += Buffer.byteLength(`${object}\n`)
    return line
  })
  const body = objects.join('\n') + '\n'
  const startXref = Buffer.byteLength('%PDF-1.4\n' + body)

  return `%PDF-1.4
${body}xref
0 ${objects.length + 1}
0000000000 65535 f 
${xref.join('\n')}
trailer << /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${startXref}
%%EOF`
}

function pdfText(value: string) {
  return value.replace(/[()\\]/g, (char) => `\\${char}`).replace(/[^\x20-\x7E]/g, '')
}
