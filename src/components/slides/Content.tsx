import type { ContentSlide } from '../../types'

export function Content({
  slide,
  step = 0,
}: {
  slide: ContentSlide
  step?: number
}) {
  const bullets = slide.bullets ?? []
  const stepMode = slide.step === true

  return (
    <div className="slide-enter flex w-full max-w-3xl flex-col items-start gap-8">
      <h2 className="text-5xl font-bold tracking-tight">{slide.title}</h2>
      <div className="h-1 w-14 rounded-full bg-accent" />
      <ul className="flex flex-col gap-5">
        {bullets.map((bullet, index) => {
          const visible = !stepMode || index <= step
          return (
            <li
              key={bullet}
              className={`flex items-center gap-4 text-2xl transition-all duration-300 ${
                visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}
            >
              <span className="h-2 w-2 shrink-0 rounded-[4px] bg-accent" />
              <span>{bullet}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
