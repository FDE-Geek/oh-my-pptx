import type { ChartSlide } from '../../types'
import { Chart } from '../charts/Charts'
import { SlideTag } from './SlideTag'
import { Heading } from './Heading'

export function ChartSlideView({ slide }: { slide: ChartSlide }) {
  return (
    <div className="slide-enter mx-auto flex w-full max-w-4xl flex-col items-center gap-phi-2xl">
      <header className="flex flex-col items-center gap-phi-sm">
        <SlideTag tag={slide.tag} />
        <Heading level={3} className="text-center">{slide.title}</Heading>
      </header>
      <div className="flex h-[420px] w-full items-center justify-center text-fg">
        <Chart chart={slide.chart} />
      </div>
    </div>
  )
}
