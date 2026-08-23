import type { Slide } from '../types'
import { SlideRenderer } from './SlideRenderer'

export function Overview({
  slides,
  current,
  onPick,
}: {
  slides: Slide[]
  current: number
  onPick: (page: number) => void
}) {
  return (
    <div className="slide-enter bg-bg/95 absolute inset-0 z-20 flex flex-col gap-phi-md p-phi-xl">
      <p className="text-sm font-medium tracking-[0.3em] text-sfg uppercase">
        Overview — Esc 关闭 · 点击跳转
      </p>
      <div className="grid flex-1 auto-rows-fr grid-cols-4 gap-phi-md thin-scroll overflow-y-auto pb-phi-md">
        {slides.map((slide, index) => (
          <button
            key={index}
            onClick={() => onPick(index)}
            className={`flex items-center justify-center overflow-hidden rounded-lg border p-phi-sm transition-colors ${
              index === current
                ? 'border-accent bg-card'
                : 'border-outline bg-card hover:border-accent'
            }`}
          >
            <div className="pointer-events-none origin-center scale-[0.28] md:scale-[0.3]">
              <div className="flex h-[540px] w-[960px] items-center px-phi-3xl">
                <SlideRenderer slide={slide} transition="none" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
