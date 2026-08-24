import type { TableSlide } from '../../types'

export function Table({ slide }: { slide: TableSlide }) {
  return (
    <div className="slide-enter flex w-full max-w-4xl flex-col items-start gap-8">
      <h2 className="text-5xl font-bold tracking-tight">{slide.title}</h2>
      <div className="h-1 w-14 rounded-full bg-accent" />
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
