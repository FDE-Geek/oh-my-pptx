import type { ImageSlide } from '../../types'
import { SlideTag } from './SlideTag'
import { Heading } from './Heading'

export function Image({ slide }: { slide: ImageSlide }) {
  return (
    <div className="slide-enter mx-auto flex w-full max-w-4xl flex-col items-center gap-phi-2xl">
      <header className="flex flex-col items-center gap-phi-sm">
        <SlideTag tag={slide.tag} />
        <Heading level={3} className="text-center">{slide.title}</Heading>
      </header>
      <img
        src={slide.src}
        alt={slide.title}
        className="max-h-[440px] w-auto max-w-full rounded-xl object-contain shadow-lg"
      />
      {slide.caption && <p className="text-lg text-sfg">{slide.caption}</p>}
    </div>
  )
}
