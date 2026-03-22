import { useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'

export function DebouncedSearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  delay = 300
}: {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  delay?: number
}) {
  const [internalValue, setInternalValue] = useState(value)

  useEffect(() => {
    setInternalValue(value)
  }, [value])

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(internalValue)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [internalValue, delay, onChange])

  return (
    <div className="relative flex items-center w-full max-w-sm">
      <div className="absolute left-3 text-muted pointer-events-none">
        <Search size={16} />
      </div>
      <input
        type="text"
        className="input pl-10 pr-10 w-full"
        placeholder={placeholder}
        value={internalValue}
        onChange={(e) => setInternalValue(e.target.value)}
      />
      {internalValue && (
        <button
          className="absolute right-3 text-muted hover:text-white transition-colors focus:outline-none"
          onClick={() => setInternalValue('')}
          type="button"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
