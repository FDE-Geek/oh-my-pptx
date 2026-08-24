import { useCallback, useEffect, useRef, useState } from 'react'
import type { DeckMessage, Slide } from '../types'
import { createDeckChannel } from '../utils/channel'

function slideFromHash(count: number): number {
  const n = Number.parseInt(window.location.hash.replace(/\D/g, ''), 10)
  return Number.isInteger(n) && n >= 1 && n <= count ? n - 1 : 0
}

export function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen().catch(() => {})
  }
}

export interface DeckState {
  current: number
  step: number
  overview: boolean
  stepsOf: (index: number) => number
  next: () => void
  prev: () => void
  /** 时间轴驱动：直接跳到某一步（自动放映 animation 用）。 */
  forceStep: (n: number) => void
  toggleOverview: () => void
  goto: (page: number, broadcast?: boolean) => void
}

export function useDeck(slides: Slide[], enabled = true): DeckState {
  const count = slides.length
  const [current, setCurrent] = useState(() => slideFromHash(count))
  const [step, setStep] = useState(0)
  const [overview, setOverview] = useState(false)
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const channelRef = useRef<ReturnType<typeof createDeckChannel> | null>(null)

  const stepsOf = useCallback(
    (index: number): number => {
      const slide = slides[index]
      return slide?.type === 'content' && slide.step ? (slide.bullets?.length ?? 0) : 0
    },
    [slides],
  )

  const goto = useCallback(
    (page: number, broadcast = true) => {
      const clamped = Math.max(0, Math.min(page, count - 1))
      setCurrent(clamped)
      setStep(0)
      setOverview(false)
      if (broadcast && enabledRef.current && channelRef.current) {
        const message: DeckMessage = { kind: 'goto', page: clamped }
        channelRef.current.post(message)
      }
    },
    [count],
  )

  const next = useCallback(() => {
    if (overview) {
      goto(count - 1)
      return
    }
    if (step < stepsOf(current)) {
      setStep(s => s + 1)
      return
    }
    if (current < count - 1) goto(current + 1)
  }, [overview, step, stepsOf, current, count, goto])

  const prev = useCallback(() => {
    if (overview) {
      goto(0)
      return
    }
    if (step > 0) {
      setStep(s => s - 1)
      return
    }
    if (current > 0) goto(current - 1)
  }, [overview, step, current, goto])

  const toggleOverview = useCallback(() => setOverview(o => !o), [])

  const forceStep = useCallback((n: number) => setStep(Math.max(0, n)), [])

  useEffect(() => {
    // 禁用态（编辑器/frame iframe）不订阅也不广播——避免串台
    if (!enabledRef.current) return
    const channel = createDeckChannel()
    channelRef.current = channel
    const unsubscribe = channel.subscribe(message => {
      if (message.kind === 'goto') {
        setCurrent(message.page)
        setStep(0)
      }
    })
    return () => {
      unsubscribe()
      channel.close()
      channelRef.current = null
    }
  }, [])

  useEffect(() => {
    const onHashChange = () => goto(slideFromHash(count), false)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [count, goto])

  useEffect(() => {
    const hash = `#${current + 1}`
    if (window.location.hash !== hash) {
      window.history.replaceState(null, '', hash)
    }
  }, [current])

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      // 输入控件内的按键归输入框（含空格/箭头），不触发翻页
      const target = e.target as HTMLElement | null
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable
      ) {
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        prev()
      } else if (e.key === 'Home') {
        goto(0)
      } else if (e.key === 'End') {
        goto(count - 1)
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen()
      } else if (e.key === 'g' || e.key === 'G') {
        toggleOverview()
      } else if (e.key === 'Escape') {
        setOverview(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, next, prev, goto, count])

  return { current, step, overview, stepsOf, next, prev, forceStep, toggleOverview, goto }
}
