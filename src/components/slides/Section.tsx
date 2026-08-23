import type { SectionSlide } from '../../types'

export function Section({ slide }: { slide: SectionSlide }) {
  return (
    <div className="slide-enter flex w-full max-w-4xl flex-col items-start gap-4">
      <p className="text-lg font-medium tracking-[0.3em] text-accent uppercase">Section</p>
      <h2 className="text-6xl font-bold tracking-tight">{slide.title}</h2>
      {slide.subtitle && <p className="text-2xl text-sfg">{slide.subtitle}</p>}
    </div>
  )
}
