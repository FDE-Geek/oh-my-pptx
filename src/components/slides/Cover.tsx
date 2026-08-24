import type { CoverSlide } from '../../types'
import { useDeck } from '../DeckContext'
import { SlideTag } from './SlideTag'
import { Heading, Lead } from './Heading'

export function Cover({ slide }: { slide: CoverSlide }) {
  const author = useDeck().author
  return (
    <div className="slide-enter flex flex-col items-center gap-phi-lg text-center">
      <SlideTag tag={slide.tag} />
      <div className="h-1.5 w-16 rounded-full bg-accent" />
      <Heading level={1}>{slide.title}</Heading>
      {slide.subtitle && <Lead>{slide.subtitle}</Lead>}
      {author && <p className="mt-phi-2xl text-body text-sfg">{author}</p>}
    </div>
  )
}
