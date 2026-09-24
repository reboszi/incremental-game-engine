import { useEffect, useState } from 'react'

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/
function isValidHexColor(value: string) { return HEX_COLOR_REGEX.test(value) }

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const [text, setText] = useState(value)

  useEffect(() => {
    setText(value)
  }, [value])

  const updateText = (next: string) => {
    setText(next)

    if (isValidHexColor(next)) {
      onChange(next)
    }
  }

  return (
    <div className="inspector-field">
      <label>{label}</label>

      <div className="color-input-row">
        <input
          type="color"
          value={value}
          onChange={(event) => {
            setText(event.target.value)
            onChange(event.target.value)
          }}
        />

        <input
          type="text"
          value={text}
          className={isValidHexColor(text) ? '' : 'invalid'}
          onChange={(event) => updateText(event.target.value)}
        />
      </div>
    </div>
  )
}

