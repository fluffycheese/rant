import React, { useRef } from 'react'

export const STANDARD_CABLE_COLORS = [
  { name: 'Blue', hex: '#4a9eff' },
  { name: 'Green', hex: '#238636' },
  { name: 'Yellow', hex: '#e3b341' },
  { name: 'Orange', hex: '#f0883e' },
  { name: 'Red', hex: '#ff7b72' },
  { name: 'Purple', hex: '#a371f7' },
  { name: 'Light Grey', hex: '#8b949e' },
  { name: 'Dark Grey', hex: '#30363d' },
] as const

export interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
  style?: React.CSSProperties
}

export default function ColorPicker({
  value,
  onChange,
  disabled = false,
  style,
}: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const normalizedValue = (value || '').toLowerCase()
  const isStandardColor = STANDARD_CABLE_COLORS.some(
    c => c.hex.toLowerCase() === normalizedValue
  )

  const handleAdvancedClick = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        ...style,
      }}
    >
      {STANDARD_CABLE_COLORS.map(color => {
        const isSelected = normalizedValue === color.hex.toLowerCase()
        return (
          <button
            key={color.hex}
            type="button"
            title={`${color.name} (${color.hex})`}
            disabled={disabled}
            onClick={() => onChange(color.hex)}
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              backgroundColor: color.hex,
              border: isSelected ? '2px solid #ffffff' : '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: isSelected ? '0 0 0 1px #000, 0 0 4px rgba(255,255,255,0.4)' : 'none',
              cursor: disabled ? 'not-allowed' : 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              outline: 'none',
              opacity: disabled ? 0.5 : 1,
              transition: 'transform 0.1s, border-color 0.1s',
            }}
          />
        )
      })}

      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <button
          type="button"
          disabled={disabled}
          onClick={handleAdvancedClick}
          title={!isStandardColor && value ? `Custom: ${value}` : 'Pick custom color'}
          style={{
            height: 24,
            padding: '0 8px',
            borderRadius: 4,
            background: !isStandardColor && value ? value : '#0d1117',
            color: !isStandardColor && value ? '#ffffff' : '#8b949e',
            border: !isStandardColor && value ? '2px solid #ffffff' : '1px solid #30363d',
            boxShadow: !isStandardColor && value ? '0 0 0 1px #000, 0 0 4px rgba(255,255,255,0.4)' : 'none',
            fontSize: 11,
            fontWeight: 500,
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            opacity: disabled ? 0.5 : 1,
            textShadow: !isStandardColor && value ? '0 1px 2px rgba(0,0,0,0.8)' : 'none',
          }}
        >
          Advanced
        </button>
        <input
          ref={inputRef}
          type="color"
          value={value?.startsWith('#') && value.length === 7 ? value : '#4a9eff'}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 0,
            height: 0,
            opacity: 0,
            pointerEvents: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
          }}
        />
      </div>
    </div>
  )
}
