import type { SectionSlide } from '../../types'
import { Heading, Lead, Kicker } from './Heading'

export function Section({ slide }: { slide: SectionSlide }) {
  const items = slide.items
  if (items?.length) {
    return (
      <div className="slide-enter mx-auto flex w-full max-w-3xl flex-col items-center gap-phi-2xl">
        <Kicker kind="toc">{slide.title}</Kicker>
        <div className="flex w-full flex-col gap-phi-sm">
          {items.map((item, index) => (
            <div
              key={item.title}
              className="flex items-center gap-phi-md rounded-xl border border-outline bg-card px-phi-md py-phi-sm"
            >
              <span className="w-8 shrink-0 font-mono text-xl font-bold text-accent tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <Heading level={4}>{item.title}</Heading>
              {item.summary && (
                <span className="ml-auto text-right text-caption text-sfg">{item.summary}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="slide-enter mx-auto flex w-full max-w-4xl flex-col items-center gap-phi-md text-center">
      <Kicker kind="section" />
      <Heading level={2}>{slide.title}</Heading>
      {slide.subtitle && <Lead>{slide.subtitle}</Lead>}
    </div>
  )
}
