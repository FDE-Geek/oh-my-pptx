import { useCallback, useEffect, useRef, useState } from 'react'
import type { PPTConfig, Slide } from '../types'
import { slideNarration, createNarrator, type Narrator } from '../utils/narration'
import type { AudioMixer } from '../utils/mixer'

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
  mixer,
  onTimelineStep,
}: {
  config: PPTConfig
  slides: Slide[]
  current: number
  step: number
  stepsOf: (index: number) => number
  next: () => void
  goto: (page: number) => void
  onStop: (completed: boolean) => void
  /** 录制模式的混音器（旁白音频混入）；非录制可传 null。 */
  mixer?: AudioMixer | null
  /** 时间轴驱动：animation 声明的入场时序触发（自动放映时）。 */
  onTimelineStep?: (target: number) => void
}) {
  const [mode, setMode] = useState<PlayMode>('manual')
  const narratorRef = useRef<Narrator | null>(null)
  const mixerRef = useRef<AudioMixer | null>(mixer ?? null)
  mixerRef.current = mixer ?? null
  const configRef = useRef(config)
  configRef.current = config
  const onStopRef = useRef(onStop)
  onStopRef.current = onStop

  const onTimelineStepRef = useRef(onTimelineStep)
  onTimelineStepRef.current = onTimelineStep

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }
  const timerRef = useRef<number | null>(null)
  /** 时间轴 step 定时器组（animation 字段驱动）。 */
  const timelineTimers = useRef<number[]>([])
  const clearTimeline = () => {
    for (const t of timelineTimers.current) window.clearTimeout(t)
    timelineTimers.current = []
  }

  const ensureNarrator = useCallback(() => {
    if (!narratorRef.current) {
      narratorRef.current = createNarrator(configRef.current.narration)
    }
    return narratorRef.current
  }, [])

  /** 停留一段时长（无旁白）。 */
  const wait = (ms: number) => new Promise<void>(r => window.setTimeout(r, ms))

  /** 当前在播的音频（stopAll 时强制停掉，避免取消后声音残留/叠音）。 */
  const activeAudioRef = useRef<{ audio: HTMLAudioElement; stopMix?: () => void } | null>(null)

  /** 播放一页旁白：音频文件优先（可混入录制流），否则 TTS，否则静默停时。 */
  const narrateSlide = useCallback(
    async (index: number): Promise<void> => {
      const slide = slides[index]
      const narrationConfig = configRef.current.narration

      // 时间轴：有 animation 声明时按毫秒驱动 step（替代固定 600ms 推进）
      if (slide.animation && slide.animation.length > 0) {
        for (const item of slide.animation) {
          const targetIndex = item.index ?? slide.animation.indexOf(item)
          const timer = window.setTimeout(() => {
            onTimelineStepRef.current?.(targetIndex)
          }, item.at)
          timelineTimers.current.push(timer)
        }
      }

      if (slide.narrationAudio) {
        const audio = new Audio(slide.narrationAudio)
        // ended 与 error 都放行——加载失败不能把自动放映永久卡死
        const done = new Promise<void>(r => {
          audio.addEventListener('ended', () => r(), { once: true })
          audio.addEventListener('error', () => r(), { once: true })
        })
        const mixerInstance = mixerRef.current
        let stopMix: (() => void) | undefined
        if (mixerInstance) {
          try {
            stopMix = await mixerInstance.mixUrl(slide.narrationAudio)
          } catch {
            /* 混音失败退化为直接播放 */
          }
        }
        activeAudioRef.current = { audio, stopMix }
        try {
          await audio.play()
        } catch {
          /* 自动播放策略/文件缺失：静默跳过等待 */
        }
        await done
        stopMix?.()
        activeAudioRef.current = null
        await wait(400)
        return
      }

      const text = slideNarration(slide)
      if (narrationConfig.enabled && text) {
        const narrator = ensureNarrator()
        await narrator.speak(text)
        await wait(500)
      } else {
        const duration = slide.duration ?? configRef.current.autoplay.defaultDuration
        await wait(duration)
      }
    },
    [slides, ensureNarrator, stepsOf],
  )

  const stopAll = useCallback(() => {
    clearTimer()
    clearTimeline()
    window.speechSynthesis?.cancel()
    // 强制停掉在播的旁白音频（取消放映不留残音）
    const active = activeAudioRef.current
    if (active) {
      active.audio.pause()
      active.stopMix?.()
      activeAudioRef.current = null
    }
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
