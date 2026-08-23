import type { QuoteSlide } from '../../types'

export function Quote({ slide }: { slide: QuoteSlide }) {
  return (
    <div className="slide-enter flex max-w-3xl flex-col items-start gap-8">
      <span className="text-8xl leading-none font-bold text-accent select-none">"</span>
      <blockquote className="text-4xl leading-snug font-medium tracking-tight">
        {slide.quote}
      </blockquote>
      {slide.author && (
        <p className="text-xl text-sfg">— {slide.author}</p>
      )}
    </div>
  )
}
