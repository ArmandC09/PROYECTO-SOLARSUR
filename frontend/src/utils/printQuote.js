export function printQuote(quote, client, company = {}) {
  const date = new Date(quote.date || new Date()).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  const items    = quote.items || []
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0)
  const igvPct   = Number(quote.igv || 0)
  const igvAmt   = Number(quote.igvAmt ?? (subtotal * igvPct / 100))
  const total    = Number(quote.total) || (subtotal + igvAmt)
  const note     = quote.note ||
    `Esta cotización es válida por 15 días a partir de la fecha de emisión. Precios expresados en Soles (PEN).`

  const itemsHtml = items.map((it, idx) => `
    <tr class="${idx % 2 === 0 ? 're' : 'ro'}">
      <td class="tl">${esc(it.description || it.desc || '')}</td>
      <td class="tc">${Number(it.qty)}</td>
      <td class="tr">S/ ${Number(it.price).toFixed(2)}</td>
      <td class="tr tb">S/ ${(Number(it.qty) * Number(it.price)).toFixed(2)}</td>
    </tr>`).join('')

  const clientInfo = [
    client?.dni   ? `<tr><td class="il">DNI</td><td>${esc(client.dni)}</td></tr>` : '',
    client?.ruc   ? `<tr><td class="il">RUC</td><td>${esc(client.ruc)}</td></tr>` : '',
    client?.email ? `<tr><td class="il">Email</td><td>${esc(client.email)}</td></tr>` : '',
    client?.phone ? `<tr><td class="il">Teléfono</td><td>${esc(client.phone)}</td></tr>` : '',
    (client?.address || client?.district || client?.city)
      ? `<tr><td class="il">Dirección</td><td>${esc([client?.address, client?.district, client?.city].filter(Boolean).join(', '))}</td></tr>`
      : ''
  ].join('')

  const companyInfo = [
    company?.ruc     ? `<tr><td class="il">RUC</td><td>${esc(company.ruc)}</td></tr>` : '',
    company?.email   ? `<tr><td class="il">Email</td><td>${esc(company.email)}</td></tr>` : '',
    company?.phone   ? `<tr><td class="il">Teléfono</td><td>${esc(company.phone)}${company.phone2 ? ` / ${esc(company.phone2)}` : ''}</td></tr>` : '',
    (!company?.phone && company?.phone2) ? `<tr><td class="il">Teléfono</td><td>${esc(company.phone2)}</td></tr>` : '',
    company?.address ? `<tr><td class="il">Dirección</td><td>${esc(company.address)}</td></tr>` : '',
  ].join('')

  const igvRow = igvPct > 0
    ? `<tr><td>IGV (${igvPct}%)</td><td class="tr">S/ ${igvAmt.toFixed(2)}</td></tr>`
    : `<tr class="muted"><td>IGV (0%)</td><td class="tr">S/ 0.00</td></tr>`

  // Construir el logo HTML directamente aquí — mismo proceso, mismo hilo, sin restricciones
  let logoHtml = `<span class="logo-text">${esc(company.name || 'SolarSur')}</span>`
  if (company.logo) {
    if (company.logo.startsWith('data:image/svg')) {
      try {
        const b64 = company.logo.split(',')[1]
        // Decodificar base64 byte a byte para manejar caracteres especiales y encabezado XML
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
        const svgText = new TextDecoder('utf-8').decode(bytes)
        // Extraer solo el tag <svg>...</svg> ignorando <?xml ...?> y <!DOCTYPE>
        const svgMatch = svgText.match(/<svg[\s\S]*<\/svg>/)
        if (svgMatch) {
          const tmp = document.createElement('div')
          tmp.innerHTML = svgMatch[0]
          const svgEl = tmp.querySelector('svg')
          if (svgEl) {
            // Forzar dimensiones explícitas — sin esto el SVG inline tiene tamaño 0
            svgEl.setAttribute('width', '220')
            svgEl.setAttribute('height', '84')
            svgEl.setAttribute('style', 'display:block;')
            // Asegurar que el viewBox esté presente para que escale bien
            if (!svgEl.getAttribute('viewBox')) {
              svgEl.setAttribute('viewBox', '0 0 815 309')
            }
            logoHtml = svgEl.outerHTML
          }
        }
      } catch (e) {
        logoHtml = `<span class="logo-text">${esc(company.name || 'SolarSur')}</span>`
      }
    } else {
      logoHtml = `<img src="${company.logo}" style="max-height:70px;max-width:200px;display:block;object-fit:contain;" />`
    }
  }

  const css = `
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; font-size: 13px; line-height: 1.55; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    .page-header { background: linear-gradient(135deg, #0a3d8f 0%, #0b5ed7 55%, #1e7ee8 100%); padding: 28px 36px 24px; display: flex; justify-content: space-between; align-items: center; gap: 20px; }
    .logo-container { background: transparent; padding: 0; display:inline-flex; align-items:center; }
    .logo-text { font-size: 22px; font-weight: 900; color: #0a3d8f; letter-spacing: -0.5px; }
    .hdr-right { text-align: right; }
    .doc-type  { font-size: 34px; font-weight: 900; color: #fff; letter-spacing: 4px; text-transform: uppercase; text-shadow: 0 2px 8px rgba(0,0,0,0.18); }
    .doc-sub   { font-size: 11px; color: rgba(255,255,255,0.70); margin-top: 4px; letter-spacing: 0.5px; }
    .doc-num   { display: inline-block; margin-top: 10px; background: rgba(255,255,255,0.18); color: #fff; border: 1.5px solid rgba(255,255,255,0.45); font-weight: 700; font-size: 13px; padding: 5px 18px; border-radius: 99px; letter-spacing: 0.5px; }
    .header-accent { height: 5px; background: linear-gradient(90deg, #f59e0b, #fbbf24, #f59e0b); }
    .body-wrap { padding: 24px 36px 28px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 0 0 22px; }
    .mbox { background: #f7faff; border: 1px solid #dde8f8; border-radius: 12px; padding: 14px 16px; }
    .mbox-title { font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: #0b4ea6; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #dde8f8; }
    .mbox table { width: 100%; font-size: 12.5px; }
    .mbox td { padding: 3px 0; vertical-align: top; }
    .il { color: #8898b4; font-size: 11px; font-weight: 600; padding-right: 10px; white-space: nowrap; }
    .mbox .name { font-size: 15px; font-weight: 800; color: #0b1220; padding-bottom: 6px; }
    .date-badge { display: inline-flex; align-items: center; background: linear-gradient(135deg,#0b4ea6,#1a7fd4); color: #fff; font-size: 11px; font-weight: 700; padding: 5px 14px; border-radius: 99px; margin-top: 10px; letter-spacing: 0.3px; }
    .sect-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: #0b4ea6; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .sect-title::after { content:''; flex:1; height:1.5px; background:linear-gradient(90deg,#c0d4f7,transparent); }
    table.items { width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden; font-size: 13px; }
    table.items thead tr { background: linear-gradient(135deg,#0a3d8f,#1a7fd4); }
    table.items thead th { color: #fff; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 13px 14px; }
    .tl { text-align: left; padding: 11px 14px; }
    .tc { text-align: center; padding: 11px 14px; color: #374151; }
    .tr { text-align: right; padding: 11px 14px; color: #374151; }
    .tb { font-weight: 700; color: #0b4ea6 !important; }
    .re { background: #fff; }
    .ro { background: #f5f9ff; }
    table.items tbody tr { border-bottom: 1px solid #eef2fb; }
    .tot-wrap { display: flex; justify-content: flex-end; margin: 16px 0 22px; }
    .tot-box { width: 270px; border: 1.5px solid #dde8f8; border-radius: 12px; overflow: hidden; }
    .tot-box table { width: 100%; font-size: 13px; }
    .tot-box td { padding: 10px 16px; border-bottom: 1px solid #e8eef8; }
    .tot-box tr:last-child td { border-bottom: none; }
    .tot-box .muted td { color: #9ca3af; }
    .tot-final td { background: linear-gradient(135deg,#0a3d8f,#1a7fd4); color: #fff !important; font-weight: 800; font-size: 15px; padding: 14px 16px; }
    .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 4px 0 20px; }
    .sig-box { text-align: center; }
    .sig-line { border-top: 1.5px solid #c0cfe0; padding-top: 6px; font-size: 11px; color: #8898b4; margin-top: 44px; }
    .sig-line strong { color: #374151; }
    .note { background: #f7faff; border-left: 4px solid #0b5ed7; border-radius: 0 10px 10px 0; padding: 12px 16px; font-size: 11.5px; color: #5a6e8e; margin-bottom: 18px; }
    .note strong { color: #0b4ea6; }
    .byline { text-align: center; font-size: 10px; color: #aab4c8; margin-bottom: 10px; }
    .page-footer { height: 8px; background: linear-gradient(90deg, #0a3d8f, #0b5ed7, #f59e0b, #0b5ed7, #0a3d8f); }
  `

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
    <style>${css}</style></head><body>
    <div class="page-header">
      <div class="logo-container">${logoHtml}</div>
      <div class="hdr-right">
        <div class="doc-type">Cotización</div>
        <div class="doc-sub">Documento proforma · presupuesto</div>
        <div class="doc-num">${esc(String(quote.id || ''))}</div>
      </div>
    </div>
    <div class="header-accent"></div>
    <div class="body-wrap">
      <div class="meta">
        <div class="mbox">
          <div class="mbox-title">Cliente</div>
          <table>
            <tr><td colspan="2" class="name">${esc(client?.name || '—')}</td></tr>
            ${clientInfo || '<tr><td colspan="2" style="color:#9ca3af;font-size:12px">Sin datos adicionales</td></tr>'}
          </table>
        </div>
        <div class="mbox">
          <div class="mbox-title">Empresa emisora</div>
          <table>
            <tr><td colspan="2" class="name">${esc(company?.name || 'SolarSur')}</td></tr>
            ${companyInfo || ''}
          </table>
          <div class="date-badge">${date}</div>
        </div>
      </div>
      <div class="sect-title">Detalle de productos y servicios</div>
      <table class="items">
        <thead><tr>
          <th class="tl" style="width:50%">Descripción</th>
          <th class="tc" style="width:12%">Cant.</th>
          <th class="tr" style="width:19%">Precio unit.</th>
          <th class="tr" style="width:19%">Subtotal</th>
        </tr></thead>
        <tbody>${itemsHtml || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#9ca3af">Sin productos</td></tr>'}</tbody>
      </table>
      <div class="tot-wrap"><div class="tot-box"><table>
        <tr><td>Subtotal</td><td class="tr">S/ ${subtotal.toFixed(2)}</td></tr>
        ${igvRow}
        <tr class="tot-final"><td>TOTAL</td><td class="tr">S/ ${total.toFixed(2)}</td></tr>
      </table></div></div>
      <div class="sig-row">
        <div class="sig-box"><div class="sig-line">Firma del cliente<br/><strong>${esc(client?.name || '')}</strong></div></div>
        <div class="sig-box"><div class="sig-line">Firma y sello<br/><strong>${esc(company?.name || 'SolarSur')}</strong></div></div>
      </div>
      <div class="note"><strong>Condiciones:</strong> ${esc(note)}</div>
      <div class="byline">Documento generado electrónicamente · ${esc(company?.name || 'SolarSur')} · ${date}</div>
    </div>
    <div class="page-footer"></div>
  </body></html>`

  // Crear iframe oculto en el mismo documento — mismo origen, sin restricciones
  const oldFrame = document.getElementById('__print_frame__')
  if (oldFrame) oldFrame.remove()

  const iframe = document.createElement('iframe')
  iframe.id = '__print_frame__'
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;'
  document.body.appendChild(iframe)

  const doc = iframe.contentDocument || iframe.contentWindow.document
  doc.open()
  doc.write(html)
  doc.close()

  // Imprimir desde el iframe
  setTimeout(() => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    // Limpiar después de imprimir
    setTimeout(() => iframe.remove(), 2000)
  }, 400)
}

function esc(s) {
  if (s == null) return ''
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}
