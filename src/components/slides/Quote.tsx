import type { QuoteSlide } from '../../types'

export function Quote({ slide }: { slide: QuoteSlide }) {
  return (
    <div className="slide-enter mx-auto flex max-w-3xl flex-col items-center gap-phi-xl text-center">
      <span className="text-8xl leading-none font-bold text-accent select-none">"</span>
      <blockquote className="text-heading-3 font-medium leading-snug tracking-tight">
        {slide.quote}
      </blockquote>
      {slide.author && (
        <p className="text-body text-sfg">— {slide.author}</p>
      )}
    </div>
  )
}
