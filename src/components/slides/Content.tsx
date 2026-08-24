import type { ContentSlide } from '../../types'
import { SlideTag } from './SlideTag'
import { Heading } from './Heading'

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
      <div className="slide-enter mx-auto flex w-full max-w-3xl flex-col items-center gap-phi-2xl text-center">
        <header className="flex flex-col items-center gap-phi-sm">
          <SlideTag tag={slide.tag} />
          <Heading level={3}>{slide.title}</Heading>
          <div className="h-1 w-14 rounded-full bg-accent" />
        </header>
        <ul className="flex flex-col items-center gap-phi-md">
          {bullets.map((bullet, index) => (
            <li
              key={bullet}
              className={`text-body transition-all duration-300 ${
                visible(index) ? 'translate-y-0 opacity-100' : 'hidden'
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
      <div className="slide-enter mx-auto flex w-full max-w-4xl flex-col items-center gap-phi-2xl">
        <header className="flex flex-col items-center gap-phi-sm">
          <SlideTag tag={slide.tag} />
          <Heading level={3} className="text-center">{slide.title}</Heading>
        </header>
        <div className="flex w-full flex-wrap justify-center gap-phi-md">
          {bullets.map((bullet, index) => (
            <div
              key={bullet}
              className={`flex w-[calc(50%-0.5rem)] min-w-[16rem] items-center gap-phi-sm rounded-xl border border-outline bg-card p-phi-md transition-all duration-300 ${
                visible(index) ? 'translate-y-0 opacity-100' : 'hidden'
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-[4px] bg-accent" />
              <span className="text-body">{bullet}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="slide-enter mx-auto flex w-full max-w-3xl flex-col items-center gap-phi-2xl">
      <header className="flex flex-col items-center gap-phi-sm">
        <SlideTag tag={slide.tag} />
        <Heading level={3} className="text-center">{slide.title}</Heading>
        <div className="h-1 w-14 rounded-full bg-accent" />
      </header>
      <ul className="flex max-w-2xl flex-col items-start gap-phi-md">
        {bullets.map((bullet, index) => (
          <li
            key={bullet}
            className={`flex items-center gap-phi-md text-body transition-all duration-300 ${
              visible(index) ? 'translate-y-0 opacity-100' : 'hidden'
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
