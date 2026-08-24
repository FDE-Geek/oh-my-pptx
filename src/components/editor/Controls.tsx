import type { ReactNode } from 'react'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-phi-xs">
      <span className="text-xs font-medium tracking-wide text-sfg">{label}</span>
      {children}
    </label>
  )
}

const inputClass =
  'rounded-md border border-[var(--chrome-outline)] bg-[var(--chrome-bg)] px-phi-sm py-phi-xs text-sm text-[var(--chrome-fg)] outline-none transition-colors focus:border-accent'

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={inputClass}
    />
  )
}

export function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={`${inputClass} resize-y font-normal`}
    />
  )
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(Number(e.target.value))}
      className={inputClass}
    />
  )
}

export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value as T)}
      className={inputClass}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-phi-sm text-sm text-fg"
    >
      <span
        className={`flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
          checked ? 'bg-accent' : 'bg-outline'
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-bg transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </span>
      {label}
    </button>
  )
}

/** bullets / rows / series 列表编辑器通用外壳。 */
export function ListEditor({
  label,
  items,
  onAdd,
  onRemove,
  onMove,
  children,
}: {
  label: string
  items: unknown[]
  onAdd: () => void
  onRemove: (index: number) => void
  onMove: (from: number, to: number) => void
  children: (index: number) => ReactNode
}) {
  return (
    <div className="flex flex-col gap-phi-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-sfg">{label}</span>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md bg-accent/15 px-phi-sm py-0.5 text-xs text-accent hover:bg-accent/25"
        >
          + 添加
        </button>
      </div>
      <div className="flex flex-col gap-phi-sm">
        {items.map((_, index) => (
          <div key={index} className="flex items-start gap-phi-xs">
            <div className="flex flex-col gap-0.5 pt-1">
              <button
                type="button"
                onClick={() => index > 0 && onMove(index, index - 1)}
                className="text-[10px] leading-none text-sfg hover:text-accent disabled:opacity-30"
                disabled={index === 0}
              >
                ▲
              </button>
              <button
                type="button"
                onClick={() => index < items.length - 1 && onMove(index, index + 1)}
                className="text-[10px] leading-none text-sfg hover:text-accent disabled:opacity-30"
                disabled={index === items.length - 1}
              >
                ▼
              </button>
            </div>
            <div className="flex-1">{children(index)}</div>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="pt-1.5 text-sm text-sfg hover:text-danger"
              title="删除"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
