import type { Slide, Transition } from '../types'
import { Cover } from './slides/Cover'
import { Section } from './slides/Section'
import { Content } from './slides/Content'
import { End } from './slides/End'
import { TwoColumn } from './slides/TwoColumn'
import { Quote } from './slides/Quote'
import { Code } from './slides/Code'
import { Image } from './slides/Image'
import { Table } from './slides/Table'
import { ChartSlideView } from './slides/Chart'
import type { DiagramSlide } from '../types'
import { DiagramView } from './slides/Diagram'

function DiagramSlideView({ slide }: { slide: DiagramSlide }) {
  return (
    <div className="slide-enter flex h-[540px] w-full max-w-4xl flex-col items-start gap-phi-md">
      <h2 className="text-4xl font-bold tracking-tight">{slide.title}</h2>
      <div className="min-h-0 flex-1 w-full overflow-hidden rounded-xl border border-outline bg-card">
        <DiagramView spec={slide.diagram} />
      </div>
    </div>
  )
}

export function SlideRenderer({
  slide,
  transition = 'fade',
  step = 0,
}: {
  slide: Slide
  transition?: Transition
  step?: number
}) {
  const body = (() => {
    switch (slide.type) {
      case 'cover':
        return <Cover slide={slide} />
      case 'section':
        return <Section slide={slide} />
      case 'content':
        return <Content slide={slide} step={step} />
      case 'end':
        return <End slide={slide} />
      case 'two-column':
        return <TwoColumn slide={slide} />
      case 'quote':
        return <Quote slide={slide} />
      case 'code':
        return <Code slide={slide} />
      case 'image':
        return <Image slide={slide} />
      case 'table':
        return <Table slide={slide} />
      case 'chart':
        return <ChartSlideView slide={slide} />
      case 'diagram':
        return <DiagramSlideView slide={slide} />
    }
  })()

  const active = slide.transition ?? transition
  const animation =
    active === 'slide'
      ? 'slide-anim'
      : active === 'zoom'
        ? 'zoom-anim'
        : active === 'none'
          ? ''
          : 'slide-enter'

  return <div className={`${animation} w-full`.trim()}>{body}</div>
}
