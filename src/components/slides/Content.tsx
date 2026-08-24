import type { ContentSlide } from '../../types'
import { SlideTag } from './SlideTag'

export function Content({
  slide,
  step = 0,
}: {
  slide: ContentSlide
  step?: number
}) {
  const bullets = slide.bullets ?? []
  const stepMode = slide.step === true
  const layout = slide.layout ?? 'left'

  const visible = (index: number) => !stepMode || index <= step

  if (layout === 'center') {
    return (
      <div className="slide-enter flex w-full max-w-3xl flex-col items-center gap-phi-lg text-center">
        <SlideTag tag={slide.tag} />
          <h2 className="text-5xl font-bold tracking-tight">{slide.title}</h2>
        <div className="h-1 w-14 rounded-full bg-accent" />
        <ul className="flex flex-col items-center gap-phi-md">
          {bullets.map((bullet, index) => (
            <li
              key={bullet}
              className={`text-2xl transition-all duration-300 ${
                visible(index) ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}
            >
              {bullet}
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (layout === 'card') {
    return (
      <div className="slide-enter flex w-full max-w-4xl flex-col items-start gap-phi-lg">
        <SlideTag tag={slide.tag} />
          <h2 className="text-5xl font-bold tracking-tight">{slide.title}</h2>
        <div className="grid w-full grid-cols-2 gap-phi-md">
          {bullets.map((bullet, index) => (
            <div
              key={bullet}
              className={`flex items-center gap-phi-sm rounded-xl border border-outline bg-card p-phi-md transition-all duration-300 ${
                visible(index) ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-[4px] bg-accent" />
              <span className="text-xl">{bullet}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="slide-enter flex w-full max-w-3xl flex-col items-start gap-phi-lg">
      <SlideTag tag={slide.tag} />
          <h2 className="text-5xl font-bold tracking-tight">{slide.title}</h2>
      <div className="h-1 w-14 rounded-full bg-accent" />
      <ul className="flex flex-col gap-phi-md">
        {bullets.map((bullet, index) => (
          <li
            key={bullet}
            className={`flex items-center gap-phi-md text-2xl transition-all duration-300 ${
              visible(index) ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
            }`}
          >
            <span className="h-2 w-2 shrink-0 rounded-[4px] bg-accent" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
