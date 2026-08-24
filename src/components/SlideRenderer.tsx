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
import { SlideTag } from './slides/SlideTag'
import { Heading, Kicker } from './slides/Heading'

function DiagramSlideView({ slide }: { slide: DiagramSlide }) {
  return (
    <div className="slide-enter mx-auto flex h-[540px] w-full max-w-4xl flex-col items-center gap-phi-2xl">
      <header className="flex flex-col items-center gap-phi-sm">
        <SlideTag tag={slide.tag} />
        <Heading level={3} className="text-center">{slide.title}</Heading>
      </header>
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
  slide: Slide | undefined
  transition?: Transition
  step?: number
}) {
  const body = (() => {
    if (!slide) {
      return (
        <div className="flex flex-col items-center gap-phi-md text-center">
          <p className="text-4xl font-bold text-sfg">（空页）</p>
          <p className="text-lg text-sfg">此 deck 没有任何幻灯片</p>
        </div>
      )
    }
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
      default:
        // 格式规范：未知页型渲染占位页（不崩、不丢页码）
        return (
          <div className="flex flex-col items-center gap-phi-md text-center">
            <Kicker>未知页型</Kicker>
            <p className="text-4xl font-bold text-sfg">{(slide as { type: string } | undefined)?.type}</p>
          </div>
        )
    }
  })()

  const active = slide?.transition ?? transition
  const animation =
    active === 'slide'
      ? 'slide-anim'
      : active === 'zoom'
        ? 'zoom-anim'
        : active === 'none'
          ? ''
          : 'slide-enter'

  return <div className={`${animation} flex w-full justify-center`.trim()}>{body}</div>
}
