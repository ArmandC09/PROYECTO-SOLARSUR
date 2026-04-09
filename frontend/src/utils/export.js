export function toCSV(rows, columns) {
  const header = columns.map(c => '"' + c.replace(/"/g, '""') + '"').join(',')
  const lines = rows.map(r => columns.map(col => {
    const v = r[col] == null ? '' : String(r[col])
    return '"' + v.replace(/"/g, '""') + '"'
  }).join(','))
  return [header].concat(lines).join('\n')
}

export function downloadCSV(filename, rows, columns) {
  const csv = toCSV(rows, columns)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.setAttribute('download', filename)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
