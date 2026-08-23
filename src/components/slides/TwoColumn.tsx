import type { ColumnContent, TwoColumnSlide } from '../../types'

function Column({ column }: { column: ColumnContent }) {
  return (
    <div className="flex flex-col items-start gap-5">
      {column.title && <h3 className="text-2xl font-semibold text-accent">{column.title}</h3>}
      <ul className="flex flex-col gap-4">
        {column.bullets?.map(bullet => (
          <li key={bullet} className="flex items-center gap-3 text-xl">
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
    <div className="slide-enter flex w-full max-w-4xl flex-col items-start gap-8">
      <h2 className="text-5xl font-bold tracking-tight">{slide.title}</h2>
      <div className="h-1 w-14 rounded-full bg-accent" />
      <div className="grid w-full grid-cols-2 gap-12">
        <Column column={slide.left} />
        <Column column={slide.right} />
      </div>
    </div>
  )
}
