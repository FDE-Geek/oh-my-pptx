import type { ChartSlide } from '../../types'
import { Chart } from '../charts/Charts'

export function ChartSlideView({ slide }: { slide: ChartSlide }) {
  return (
    <div className="slide-enter flex w-full max-w-4xl flex-col items-start gap-6">
      <h2 className="text-4xl font-bold tracking-tight">{slide.title}</h2>
      <div className="flex h-[420px] w-full items-center justify-center text-fg">
        <Chart chart={slide.chart} />
      </div>
    </div>
  )
}
