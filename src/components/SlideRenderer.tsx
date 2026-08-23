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
