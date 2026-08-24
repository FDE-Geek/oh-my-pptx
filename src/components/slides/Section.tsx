import type { SectionSlide } from '../../types'

export function Section({ slide }: { slide: SectionSlide }) {
  const items = slide.items
  if (items?.length) {
    return (
      <div className="slide-enter flex w-full max-w-3xl flex-col items-start gap-phi-lg">
        <p className="font-mono text-sm font-semibold tracking-[0.22em] text-accent uppercase">
          {slide.title}
        </p>
        <div className="flex w-full flex-col gap-phi-sm">
          {items.map((item, index) => (
            <div
              key={item.title}
              className="flex items-center gap-phi-md rounded-xl border border-outline bg-card px-phi-md py-phi-sm"
            >
              <span className="w-8 shrink-0 font-mono text-xl font-bold text-accent tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="text-xl font-bold">{item.title}</span>
              {item.summary && (
                <span className="ml-auto text-right text-sm text-sfg">{item.summary}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="slide-enter flex w-full max-w-4xl flex-col items-start gap-phi-md">
      <p className="font-mono text-sm font-semibold tracking-[0.3em] text-accent uppercase">
        Section
      </p>
      <h2 className="text-6xl font-bold tracking-tight">{slide.title}</h2>
      {slide.subtitle && <p className="text-2xl text-sfg">{slide.subtitle}</p>}
    </div>
  )
}
