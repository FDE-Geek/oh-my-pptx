import type { EndSlide } from '../../types'
import { Heading, Lead } from './Heading'

export function End({ slide }: { slide: EndSlide }) {
  return (
    <div className="slide-enter flex flex-col items-center gap-phi-lg text-center">
      <div className="h-1.5 w-16 rounded-full bg-accent" />
      <Heading level={1}>{slide.title}</Heading>
      {slide.subtitle && <Lead>{slide.subtitle}</Lead>}
      {slide.takeaways && (
        <ul className="mt-phi-md flex flex-col items-center gap-phi-sm">
          {slide.takeaways.map(item => (
            <li key={item} className="flex items-center justify-center gap-phi-sm text-body text-sfg">
              <span className="text-accent">▸</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
