import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Normaliza texto para búsqueda: sin tildes, minúsculas
function norm(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Buscar...',
  disabled = false,
  className = '',
}) {
  const rootRef    = useRef(null)
  const triggerRef = useRef(null)
  const menuRef    = useRef(null)
  const inputRef   = useRef(null)
  const listboxId  = useId()

  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const [menuStyle, setMenuStyle] = useState(null)

  const normalizedValue = String(value ?? '')

  const selectedOption = useMemo(
    () => options.find((o) => String(o.value ?? '') === normalizedValue) || null,
    [options, normalizedValue]
  )

  // Filtrar opciones según búsqueda
  const filtered = useMemo(() => {
    if (!search.trim()) return options
    const q = norm(search)
    return options.filter((o) => norm(o.label).includes(q))
  }, [options, search])

  useEffect(() => {
    if (!open) { setSearch(''); return }

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuStyle({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }

    const handlePointerDown = (e) => {
      if (rootRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return
      setOpen(false)
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }

    updatePosition()
    setTimeout(() => inputRef.current?.focus(), 50)
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  const toggleOpen = () => {
    if (disabled || options.length === 0) return
    setOpen((prev) => !prev)
  }

  const handleSelect = (nextValue) => {
    setOpen(false)
    setSearch('')
    if (String(nextValue ?? '') !== normalizedValue) onChange?.(nextValue)
  }

  return (
    <div ref={rootRef} className={`styled-select ${className} ${disabled ? 'is-disabled' : ''}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className={`styled-select-trigger ${open ? 'is-open' : ''}`.trim()}
        onClick={toggleOpen}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
      >
        <span className={`styled-select-value ${selectedOption ? '' : 'is-placeholder'}`.trim()}>
          {selectedOption?.label || placeholder}
        </span>
      </button>

      {open && menuStyle && createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          className="styled-select-menu"
          style={{ ...menuStyle, paddingTop: 0 }}
          role="listbox"
        >
          {/* Input de búsqueda */}
          <div style={{ padding: '8px 8px 4px', borderBottom: '1px solid #e5e7eb' }}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1px solid #d1d5db', borderRadius: '6px',
                padding: '6px 10px', fontSize: '13px', outline: 'none'
              }}
            />
          </div>

          {/* Lista filtrada */}
          {filtered.length === 0 ? (
            <div className="styled-select-empty">Sin resultados</div>
          ) : (
            filtered.map((option) => {
              const optionValue = String(option.value ?? '')
              const isSelected  = optionValue === normalizedValue
              return (
                <button
                  key={optionValue || option.label}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`styled-select-option ${isSelected ? 'is-selected' : ''}`.trim()}
                  onClick={() => handleSelect(option.value)}
                >
                  <span>{option.label}</span>
                  {isSelected && <span className="styled-select-check">✓</span>}
                </button>
              )
            })
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
