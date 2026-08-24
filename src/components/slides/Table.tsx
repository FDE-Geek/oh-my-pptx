import type { TableSlide } from '../../types'
import { SlideTag } from './SlideTag'
import { Heading } from './Heading'

export function Table({ slide }: { slide: TableSlide }) {
  return (
    <div className="slide-enter mx-auto flex w-full max-w-4xl flex-col items-center gap-phi-2xl">
      <header className="flex flex-col items-center gap-phi-sm">
        <SlideTag tag={slide.tag} />
        <Heading level={3} className="text-center">{slide.title}</Heading>
        <div className="h-1 w-14 rounded-full bg-accent" />
      </header>
      <table className="w-full border-collapse overflow-hidden rounded-xl text-left">
        <thead>
          <tr className="bg-accent-dim/15">
            {slide.headers.map(header => (
              <th key={header} className="px-5 py-3.5 text-lg font-semibold text-accent">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slide.rows.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? 'bg-card' : 'bg-transparent'}
            >
              {row.map((cell, j) => (
                <td key={j} className="px-5 py-3 text-lg">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
