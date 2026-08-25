import { useEffect, useRef } from 'react'
import type { Slide } from '../types'
import { slideHeading } from '../utils/a11y'
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
  const currentRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    currentRef.current?.focus()
  }, [])

  return (
    <div
      className="slide-enter bg-bg/95 absolute inset-0 z-20 flex flex-col gap-phi-md p-phi-xl"
      role="dialog"
      aria-modal="true"
      aria-label="概览"
    >
      <p className="text-sm font-medium tracking-[0.3em] text-sfg uppercase">
        概览 — Esc 关闭 · 点击跳转
      </p>
      <div className="grid flex-1 auto-rows-fr grid-cols-4 gap-phi-md thin-scroll overflow-y-auto pb-phi-md">
        {slides.map((slide, index) => (
          <button
            key={index}
            type="button"
            ref={index === current ? currentRef : undefined}
            onClick={() => onPick(index)}
            aria-label={`第 ${index + 1} 页 ${slideHeading(slide)}`}
            aria-current={index === current ? 'page' : undefined}
            className={`flex items-center justify-center overflow-hidden rounded-lg border p-phi-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
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
