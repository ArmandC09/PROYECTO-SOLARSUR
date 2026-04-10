import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function StyledSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  disabled = false,
  className = '',
  triggerClassName = '',
  menuClassName = ''
}) {
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const listboxId = useId()

  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState(null)

  const normalizedValue = String(value ?? '')

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value ?? '') === normalizedValue) || null,
    [options, normalizedValue]
  )

  useEffect(() => {
    if (!open) return undefined

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      setMenuStyle({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }

    const handlePointerDown = (event) => {
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return
      setOpen(false)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    updatePosition()
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
    setOpen((current) => !current)
  }

  const handleTriggerKeyDown = (event) => {
    if (disabled || options.length === 0) return

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      toggleOpen()
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
    }
  }

  const handleSelect = (nextValue) => {
    setOpen(false)
    if (String(nextValue ?? '') !== normalizedValue) onChange?.(nextValue)
  }

  return (
    <div ref={rootRef} className={`styled-select ${className} ${disabled ? 'is-disabled' : ''}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        className={`styled-select-trigger ${triggerClassName} ${open ? 'is-open' : ''}`.trim()}
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
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
          className={`styled-select-menu ${menuClassName}`.trim()}
          style={menuStyle}
          role="listbox"
        >
          {options.length === 0 ? (
            <div className="styled-select-empty">Sin opciones</div>
          ) : (
            options.map((option) => {
              const optionValue = String(option.value ?? '')
              const isSelected = optionValue === normalizedValue

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