import { useEffect, useState } from 'react'
import { getDeckConfig } from './deck'
import type { DeckMessage } from './types'
import { createDeckChannel } from './utils/channel'
import { SlideRenderer } from './components/SlideRenderer'

const DECK = getDeckConfig()

export default function Speaker() {
  const [page, setPage] = useState(() => {
    const n = Number.parseInt(window.location.hash.replace(/\D/g, ''), 10)
    return Number.isInteger(n) && n >= 1 && n <= DECK.slides.length ? n - 1 : 0
  })
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)

  useEffect(() => {
    const channel = createDeckChannel()
    const unsubscribe = channel.subscribe((message: DeckMessage) => {
      if (message.kind === 'goto') setPage(message.page)
    })
    return () => {
      unsubscribe()
      channel.close()
    }
  }, [])

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setElapsed(s => s + 1), 1000)
    return () => window.clearInterval(timer)
  }, [running])

  const slide = DECK.slides[page]
  const nextSlide = DECK.slides[page + 1]
  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const seconds = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="flex h-full w-full flex-col gap-phi-md bg-[var(--chrome-bg)] p-phi-lg text-[var(--chrome-fg)]">
      <div className="flex items-center justify-between">
        <span className="text-sm text-sfg tabular-nums">
          {page + 1} / {DECK.slides.length}
        </span>
        <button
          onClick={() => setRunning(r => !r)}
          className="rounded-full bg-[var(--chrome-card)] px-phi-md py-phi-xs text-sm text-sfg tabular-nums hover:text-[var(--chrome-accent)]"
        >
          {running ? '⏸' : '▶'} {minutes}:{seconds}
        </button>
      </div>

      <div className="grid flex-1 grid-cols-2 gap-phi-md overflow-hidden">
        <div className="flex flex-col gap-2 overflow-hidden">
          <p className="text-xs font-medium tracking-widest text-accent uppercase">Current</p>
          <div className="flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-[var(--chrome-card)]">
            <div className="h-full max-h-full w-full max-w-full scale-[0.45]">
              <SlideRenderer slide={slide} transition="none" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 overflow-hidden">
          <p className="text-xs font-medium tracking-widest text-sfg uppercase">Next</p>
          <div className="flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-[var(--chrome-card)] opacity-70">
            {nextSlide ? (
              <div className="h-full max-h-full w-full max-w-full scale-[0.45]">
                <SlideRenderer slide={nextSlide} transition="none" />
              </div>
            ) : (
              <span className="text-sfg">— 末页 —</span>
            )}
          </div>
        </div>
      </div>

      <div className="h-28 thin-scroll shrink-0 overflow-y-auto rounded-lg bg-[var(--chrome-card)] p-phi-md">
        <p className="text-xs font-medium tracking-widest text-sfg uppercase">Notes</p>
        <p className="mt-1 text-sm leading-relaxed">{slide.notes ?? '（无备注）'}</p>
      </div>
    </div>
  )
}
