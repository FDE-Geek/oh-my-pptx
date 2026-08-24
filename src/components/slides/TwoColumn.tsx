import type { ColumnContent, TwoColumnSlide } from '../../types'
import { SlideTag } from './SlideTag'
import { Heading } from './Heading'

function Column({ column }: { column: ColumnContent }) {
  return (
    <div className="flex flex-col items-start gap-phi-lg">
      {column.title && <Heading level={4} className="text-accent">{column.title}</Heading>}
      <ul className="flex flex-col gap-phi-md">
        {column.bullets?.map(bullet => (
          <li key={bullet} className="flex items-center gap-phi-sm text-body">
            <span className="h-2 w-2 shrink-0 rounded-[4px] bg-accent" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function TwoColumn({ slide }: { slide: TwoColumnSlide }) {
  return (
    <div className="slide-enter mx-auto flex w-full max-w-4xl flex-col items-center gap-phi-2xl">
      <header className="flex flex-col items-center gap-phi-sm">
        <SlideTag tag={slide.tag} />
        <Heading level={3} className="text-center">{slide.title}</Heading>
        <div className="h-1 w-14 rounded-full bg-accent" />
      </header>
      <div className="grid w-full grid-cols-2 gap-phi-2xl">
        <Column column={slide.left} />
        <Column column={slide.right} />
      </div>
    </div>
  )
}
