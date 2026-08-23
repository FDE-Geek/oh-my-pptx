import { useCallback, useEffect, useRef, useState } from 'react'
import type { PPTConfig, Slide } from '../types'
import { slideNarration, createNarrator, type Narrator } from '../utils/narration'

export type PlayMode = 'manual' | 'autoplay' | 'recording'

export function useAutoPlay({
  config,
  slides,
  current,
  step,
  stepsOf,
  next,
  goto,
  onStop,
}: {
  config: PPTConfig
  slides: Slide[]
  current: number
  step: number
  stepsOf: (index: number) => number
  next: () => void
  goto: (page: number) => void
  onStop: (completed: boolean) => void
}) {
  const [mode, setMode] = useState<PlayMode>('manual')
  const narratorRef = useRef<Narrator | null>(null)
  const configRef = useRef(config)
  configRef.current = config
  const onStopRef = useRef(onStop)
  onStopRef.current = onStop

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }
  const timerRef = useRef<number | null>(null)

  const ensureNarrator = useCallback(() => {
    if (!narratorRef.current) {
      narratorRef.current = createNarrator(configRef.current.narration)
    }
    return narratorRef.current
  }, [])

  const narrateSlide = useCallback(
    async (index: number): Promise<void> => {
      const slide = slides[index]
      const text = slideNarration(slide)
      const narrationConfig = configRef.current.narration
      if (narrationConfig.enabled && text) {
        const narrator = ensureNarrator()
        await narrator.speak(text)
        await new Promise(r => setTimeout(r, 500))
      } else {
        const duration = slide.duration ?? configRef.current.autoplay.defaultDuration
        await new Promise(r => setTimeout(r, duration))
      }
    },
    [slides, ensureNarrator],
  )

  const stopAll = useCallback(() => {
    clearTimer()
    window.speechSynthesis?.cancel()
  }, [])

  const start = useCallback(
    (record: boolean) => {
      stopAll()
      setMode(record ? 'recording' : 'autoplay')
      goto(0)
    },
    [goto, stopAll],
  )

  const cancel = useCallback(() => {
    stopAll()
    setMode('manual')
    onStopRef.current(false)
  }, [stopAll])

  useEffect(() => {
    if (mode === 'manual') return
    const isLast = current === slides.length - 1
    const slideDone = step >= stepsOf(current)

    if (!slideDone) {
      const t = window.setTimeout(next, 600)
      return () => window.clearTimeout(t)
    }

    let cancelled = false
    const run = async () => {
      await narrateSlide(current)
      if (cancelled) return
      if (isLast) {
        stopAll()
        setMode('manual')
        onStopRef.current(true)
      } else {
        next()
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [mode, current, step, stepsOf, next, narrateSlide, stopAll, slides.length])

  return { mode, start, cancel }
}
