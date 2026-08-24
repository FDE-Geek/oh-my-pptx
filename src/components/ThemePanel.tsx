import { Check, Moon, Sun } from 'lucide-react'

export interface AccentOption {
  name: string
  seed: string
}

/** 内置种子色板（OKLCH 推导算法保证任何种子可用）。 */
export const ACCENTS: AccentOption[] = [
  { name: '天空蓝', seed: '#61b0f1' },
  { name: '紫', seed: '#9b7abf' },
  { name: '青绿', seed: '#2e8a7a' },
  { name: '翡翠', seed: '#198b43' },
  { name: '琥珀', seed: '#d4a574' },
  { name: '玫红', seed: '#cf7a8a' },
  { name: '赤陶', seed: '#e06c5a' },
  { name: '海蓝', seed: '#5b8af8' },
]

export function ThemePanel({
  dark,
  accent,
  onToggleDark,
  onPickAccent,
}: {
  dark: boolean
  accent: string
  onToggleDark: () => void
  onPickAccent: (seed: string) => void
}) {
  return (
    <div className="flex flex-col gap-phi-md px-phi-md pb-phi-sm">
      <div className="flex items-center justify-between px-phi-xs pt-phi-xs">
        <span className="text-xs font-medium tracking-widest text-sfg uppercase">
          主题色
        </span>
        <button
          onClick={onToggleDark}
          className="flex items-center gap-phi-xs rounded-full bg-bg px-phi-sm py-phi-xs text-xs text-sfg transition-colors hover:text-[var(--chrome-accent)]"
        >
          {dark ? <Sun size={12} /> : <Moon size={12} />}
          {dark ? '浅色' : '深色'}
        </button>
      </div>
      <div className="grid grid-cols-4 gap-phi-sm">
        {ACCENTS.map(option => {
          const active =
            accent.toLowerCase() === option.seed.toLowerCase()
          return (
            <button
              key={option.seed}
              title={option.name}
              onClick={() => onPickAccent(option.seed)}
              className={`relative flex h-9 items-center justify-center rounded-lg border transition-all ${
                active
                  ? 'border-accent ring-2 ring-accent/30'
                  : 'border-outline hover:border-accent'
              }`}
              style={{ backgroundColor: option.seed }}
            >
              {active && (
                <Check
                  size={14}
                  strokeWidth={3}
                  style={{ color: pickCheckColor(option.seed) }}
                />
              )}
            </button>
          )
        })}
      </div>
      <p className="px-phi-xs text-[11px] leading-relaxed text-sfg">
        种子色经 OKLCH 推导整套界面色 · 刷新后恢复 config 设定
      </p>
    </div>
  )
}

/** 亮种子用墨勾、暗种子用纸勾（简单亮度判断即可，勾是唯一文字元素）。 */
function pickCheckColor(seed: string): string {
  const h = seed.replace('#', '')
  const r = Number.parseInt(h.slice(0, 2), 16)
  const g = Number.parseInt(h.slice(2, 4), 16)
  const b = Number.parseInt(h.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#161616' : '#fafafa'
}
