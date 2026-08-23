import type { ImageSlide } from '../../types'

export function Image({ slide }: { slide: ImageSlide }) {
  return (
    <div className="slide-enter flex w-full max-w-4xl flex-col items-center gap-6">
      <h2 className="self-start text-4xl font-bold tracking-tight">{slide.title}</h2>
      <img
        src={slide.src}
        alt={slide.title}
        className="max-h-[440px] w-auto max-w-full rounded-xl object-contain shadow-lg"
      />
      {slide.caption && <p className="text-lg text-sfg">{slide.caption}</p>}
    </div>
  )
}
