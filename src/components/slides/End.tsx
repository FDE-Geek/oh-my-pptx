import type { EndSlide } from '../../types'

export function End({ slide }: { slide: EndSlide }) {
  return (
    <div className="slide-enter flex flex-col items-center gap-6 text-center">
      <div className="h-1.5 w-16 rounded-full bg-accent" />
      <h1 className="text-7xl font-bold tracking-tight">{slide.title}</h1>
      {slide.subtitle && <p className="text-2xl text-sfg">{slide.subtitle}</p>}
      {slide.takeaways && (
        <ul className="mt-phi-md flex flex-col gap-phi-sm">
          {slide.takeaways.map(item => (
            <li key={item} className="flex items-center gap-phi-sm text-xl text-sfg">
              <span className="text-accent">▸</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
