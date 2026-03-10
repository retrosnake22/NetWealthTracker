import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CurrencyInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  prefix?: string
}

function formatDisplay(raw: string): string {
  const num = parseFloat(raw)
  if (isNaN(num)) return ''
  return num.toLocaleString('en-AU', { maximumFractionDigits: 2 })
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  className,
  prefix = '$',
}: CurrencyInputProps) {
  const [focused, setFocused] = useState(false)
  const [displayValue, setDisplayValue] = useState(() => formatDisplay(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!focused) {
      setDisplayValue(formatDisplay(value))
    }
  }, [value, focused])

  const handleFocus = () => {
    setFocused(true)
    setDisplayValue(value)
  }

  const handleBlur = () => {
    setFocused(false)
    // Clean up the value
    const cleaned = displayValue.replace(/[^0-9.-]/g, '')
    onChange(cleaned)
    setDisplayValue(formatDisplay(cleaned))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setDisplayValue(raw)
    // Pass through cleaned numeric value
    const cleaned = raw.replace(/[^0-9.-]/g, '')
    onChange(cleaned)
  }

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
        {prefix}
      </span>
      <Input
        ref={inputRef}
        type={focused ? 'number' : 'text'}
        value={focused ? displayValue : displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn('pl-7', className)}
      />
    </div>
  )
}
