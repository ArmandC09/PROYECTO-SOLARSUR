export function printQuote(quote, client, company = {}) {
  const date = new Date(quote.date || new Date()).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  const items = quote.items || []
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) * Number(i.price)), 0)
  const igvPct  = Number(quote.igv || 0)
  const igvAmt  = Number(quote.igvAmt ?? (subtotal * igvPct / 100))
  const total   = Number(quote.total) || (subtotal + igvAmt)
  const note    = quote.note ||
    `Esta cotización es válida por 15 días a partir de la fecha de emisión. Precios expresados en Soles (PEN).`

  const itemsHtml = items.map((it, idx) => `
    <tr class="${idx % 2 === 0 ? 're' : 'ro'}">
      <td class="tl">${esc(it.description || it.desc || '')}</td>
      <td class="tc">${Number(it.qty)}</td>
      <td class="tr">S/ ${Number(it.price).toFixed(2)}</td>
      <td class="tr tb">S/ ${(Number(it.qty) * Number(it.price)).toFixed(2)}</td>
    </tr>`).join('')

  const logoBlock = company.logo
    ? `<img src="${esc(company.logo)}" class="logo-img" alt="Logo" />`
    : `<div class="logo-text">${esc(company.name || 'SolarSur')}</div>`

  const clientInfo = [
    client?.dni      ? `<tr><td class="il">DNI</td><td>${esc(client.dni)}</td></tr>` : '',
    client?.ruc      ? `<tr><td class="il">RUC</td><td>${esc(client.ruc)}</td></tr>` : '',
    client?.email    ? `<tr><td class="il">Email</td><td>${esc(client.email)}</td></tr>` : '',
    client?.phone    ? `<tr><td class="il">Teléfono</td><td>${esc(client.phone)}</td></tr>` : '',
    (client?.address || client?.district || client?.city)
      ? `<tr><td class="il">Dirección</td><td>${esc([client?.address,client?.district,client?.city].filter(Boolean).join(', '))}</td></tr>`
      : ''
  ].join('')

  const companyInfo = [
    company?.ruc     ? `<tr><td class="il">RUC</td><td>${esc(company.ruc)}</td></tr>` : '',
    company?.email   ? `<tr><td class="il">Email</td><td>${esc(company.email)}</td></tr>` : '',
    company?.phone   ? `<tr><td class="il">Teléfono</td><td>${esc(company.phone)}</td></tr>` : '',
    company?.address ? `<tr><td class="il">Dirección</td><td>${esc(company.address)}</td></tr>` : '',
  ].join('')

  const igvRow = igvPct > 0
    ? `<tr><td>IGV (${igvPct}%)</td><td class="tr">S/ ${igvAmt.toFixed(2)}</td></tr>`
    : `<tr class="muted"><td>IGV (0%)</td><td class="tr">S/ 0.00</td></tr>`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Cotización ${esc(String(quote.id||''))} · ${esc(client?.name||'')}</title>
  <style>
    @page { size: A4; margin: 14mm 16mm 18mm; }
    *  { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; font-size: 13px; line-height: 1.55; }

    /* TOP BAR */
    .topbar { height: 7px; background: linear-gradient(90deg,#0b4ea6,#1a7fd4,#0b4ea6); }

    /* HEADER */
    .hdr { display: flex; justify-content: space-between; align-items: center; padding: 22px 0 18px; border-bottom: 2px solid #e2eaf8; gap: 24px; }
    .logo-img  { max-height: 72px; max-width: 200px; object-fit: contain; display: block; }
    .logo-text { font-size: 26px; font-weight: 900; color: #0b4ea6; letter-spacing: -0.5px; }

    .hdr-right { text-align: right; }
    .doc-type  { font-size: 30px; font-weight: 900; color: #0b4ea6; letter-spacing: 3px; text-transform: uppercase; }
    .doc-sub   { font-size: 11px; color: #8898b4; margin-top: 3px; letter-spacing: 0.5px; }
    .doc-num   {
      display: inline-block; margin-top: 8px;
      background: #eef4ff; color: #0b4ea6; border: 1.5px solid #c0d4f7;
      font-weight: 700; font-size: 13px; padding: 5px 16px; border-radius: 99px;
    }

    /* META BOXES */
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 20px 0 18px; }
    .mbox {
      background: #f6faff; border: 1px solid #dde8f8; border-radius: 12px;
      padding: 14px 16px;
    }
    .mbox-title {
      font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px;
      color: #0b4ea6; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #dde8f8;
    }
    .mbox table { width: 100%; font-size: 12.5px; }
    .mbox td { padding: 3px 0; vertical-align: top; }
    .il { color: #8898b4; font-size: 11px; font-weight: 600; padding-right: 10px; white-space: nowrap; }
    .mbox .name { font-size: 15px; font-weight: 800; color: #0b1220; padding-bottom: 6px; }

    /* DATE BADGE */
    .date-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: #eef4ff; color: #0b4ea6; border: 1px solid #c0d4f7;
      font-size: 11.5px; font-weight: 700; padding: 5px 12px; border-radius: 99px;
      margin-top: 10px;
    }

    /* ITEMS TABLE */
    .sect-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; color: #0b4ea6; margin-bottom: 8px; }
    table.items { width: 100%; border-collapse: collapse; border-radius: 12px; overflow: hidden; font-size: 13px; }
    table.items thead tr { background: linear-gradient(135deg,#0b4ea6,#1a7fd4); }
    table.items thead th { color: #fff; font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 12px 14px; }
    .tl { text-align: left; padding: 11px 14px; }
    .tc { text-align: center; padding: 11px 14px; color: #374151; }
    .tr { text-align: right; padding: 11px 14px; color: #374151; }
    .tb { font-weight: 700; color: #0b4ea6 !important; }
    .re { background: #fff; }
    .ro { background: #f6faff; }

    /* TOTALS */
    .tot-wrap { display: flex; justify-content: flex-end; margin: 14px 0 20px; }
    .tot-box  { width: 260px; border: 1.5px solid #dde8f8; border-radius: 12px; overflow: hidden; }
    .tot-box table { width: 100%; font-size: 13px; }
    .tot-box td { padding: 10px 16px; border-bottom: 1px solid #e8eef8; }
    .tot-box tr:last-child td { border-bottom: none; }
    .tot-box .muted td { color: #9ca3af; }
    .tot-final td { background: linear-gradient(135deg,#0b4ea6,#1a7fd4); color: #fff !important; font-weight: 800; font-size: 15px; padding: 14px 16px; }

    /* FOOTER */
    .note { background: #f6faff; border: 1px solid #dde8f8; border-radius: 10px; padding: 13px 16px; font-size: 11.5px; color: #5a6e8e; margin-bottom: 18px; }
    .note strong { color: #0b4ea6; }
    .byline { text-align: center; font-size: 10.5px; color: #aab4c8; margin-bottom: 14px; }
    .botbar { height: 5px; background: linear-gradient(90deg,#0b4ea6,#1a7fd4,#0b4ea6); border-radius: 3px; }

    .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 18px 0 0; }
    .sig-box { text-align: center; }
    .sig-line { border-top: 1.5px solid #c0cfe0; padding-top: 6px; font-size: 11px; color: #8898b4; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="topbar"></div>
  <div style="padding:0 2px">

    <!-- HEADER -->
    <div class="hdr">
      <div>${logoBlock}</div>
      <div class="hdr-right">
        <div class="doc-type">Cotización</div>
        <div class="doc-sub">Documento proforma · presupuesto</div>
        <div class="doc-num">${esc(String(quote.id||''))}</div>
      </div>
    </div>

    <!-- META -->
    <div class="meta">
      <div class="mbox">
        <div class="mbox-title">Cliente</div>
        <table>
          <tr><td colspan="2" class="name">${esc(client?.name||'—')}</td></tr>
          ${clientInfo || '<tr><td colspan="2" style="color:#9ca3af;font-size:12px">Sin datos adicionales</td></tr>'}
        </table>
      </div>
      <div class="mbox">
        <div class="mbox-title">Empresa emisora</div>
        <table>
          <tr><td colspan="2" class="name">${esc(company?.name||'SolarSur')}</td></tr>
          ${companyInfo || ''}
        </table>
        <div class="date-badge">${date}</div>
      </div>
    </div>

    <!-- ITEMS -->
    <div class="sect-title">Detalle de productos y servicios</div>
    <table class="items">
      <thead>
        <tr>
          <th class="tl" style="width:50%">Descripción</th>
          <th class="tc" style="width:12%">Cant.</th>
          <th class="tr" style="width:19%">Precio unit.</th>
          <th class="tr" style="width:19%">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml||'<tr><td colspan="4" style="text-align:center;padding:20px;color:#9ca3af">Sin productos</td></tr>'}
      </tbody>
    </table>

    <!-- TOTALS -->
    <div class="tot-wrap">
      <div class="tot-box">
        <table>
          <tr><td>Subtotal</td><td class="tr">S/ ${subtotal.toFixed(2)}</td></tr>
          ${igvRow}
          <tr class="tot-final"><td>TOTAL</td><td class="tr">S/ ${total.toFixed(2)}</td></tr>
        </table>
      </div>
    </div>

    <!-- FIRMAS -->
    <div class="sig-row">
      <div class="sig-box">
        <div class="sig-line">Firma del cliente<br/><strong>${esc(client?.name||'')}</strong></div>
      </div>
      <div class="sig-box">
        <div class="sig-line">Firma y sello<br/><strong>${esc(company?.name||'SolarSur')}</strong></div>
      </div>
    </div>

    <!-- NOTE -->
    <div class="note" style="margin-top:18px">
      <strong>Condiciones:</strong> ${esc(note)}
    </div>

    <div class="byline">Documento generado electrónicamente · ${esc(company?.name||'SolarSur')} · ${date}</div>
    <div class="botbar"></div>
  </div>
  <script>window.onload=function(){setTimeout(function(){window.print()},350)}</script>
</body>
</html>`

  const w = window.open('','_blank','width=920,height=720')
  if (!w) { alert('Permite los pop-ups en tu navegador para exportar el PDF.'); return }
  w.document.open(); w.document.write(html); w.document.close()
}

function esc(s) {
  if (s == null) return ''
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}
