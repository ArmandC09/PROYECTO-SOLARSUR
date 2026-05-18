import React, { useState, useEffect } from 'react'

/**
 * PhoneInput — prefijo editable (sugerencias +51 y (054)) + número solo dígitos
 * Guarda el valor completo: ej "+51 987654321" o "(054) 325000"
 */
export default function PhoneInput({ value = '', onChange }) {
  const parseValue = (v) => {
    if (!v) return { prefix: '+51', number: '' }
    const match = v.match(/^(\(\d+\)|\+\d+)\s*(.*)$/)
    if (match) return { prefix: match[1], number: match[2].replace(/\D/g, '') }
    return { prefix: '+51', number: v.replace(/\D/g, '') }
  }

  const [prefix, setPrefix] = useState(() => parseValue(value).prefix)
  const [number, setNumber] = useState(() => parseValue(value).number)

  useEffect(() => {
    const parsed = parseValue(value)
    setPrefix(parsed.prefix)
    setNumber(parsed.number)
  }, [value])

  const emit = (p, n) => {
    if (!n) { onChange(''); return }
    onChange(`${p} ${n}`)
  }

  const handlePrefix = (e) => {
    const raw = e.target.value.replace(/[^\d+()]/g, '')
    setPrefix(raw)
    emit(raw, number)
  }

  const handleNumber = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 12)
    setNumber(raw)
    emit(prefix, raw)
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input
        list="phone-prefixes"
        value={prefix}
        onChange={handlePrefix}
        style={{
          width: 90, flexShrink: 0,
          padding: '9px 8px', borderRadius: 8,
          border: '1.5px solid #e2e8f0',
          background: '#f8fafc', color: '#374151',
          fontSize: 13, fontWeight: 600, outline: 'none'
        }}
        placeholder="+51"
      />
      <datalist id="phone-prefixes">
        <option value="+51" />
        <option value="(054)" />
        <option value="(052)" />
        <option value="(053)" />
        <option value="+1" />
        <option value="+56" />
        <option value="+57" />
        <option value="+591" />
      </datalist>
      <input
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        value={number}
        onChange={handleNumber}
        placeholder="Número"
        style={{ flex: 1 }}
      />
    </div>
  )
}
