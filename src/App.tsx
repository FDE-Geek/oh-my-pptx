import { useCallback, useEffect, useRef, useState } from 'react'
import { Play, Circle, Square, LayoutGrid, Monitor, Maximize, Palette, Printer, Pencil } from 'lucide-react'
import { getDeckConfig, isSingleFile } from './deck'
import type { PPTConfig } from './types'
import { useTheme } from './hooks/useTheme'
import { useDeck, toggleFullscreen } from './hooks/useDeck'
import { useAutoPlay } from './hooks/useAutoPlay'
import { SlideRenderer } from './components/SlideRenderer'
import { Controls } from './components/Controls'
import { ProgressBar } from './components/ProgressBar'
import { Overview } from './components/Overview'
import { ContextMenu, type MenuItem } from './components/ContextMenu'
import { ThemePanel } from './components/ThemePanel'
import { EditorShell } from './components/editor/EditorShell'
import { DeckContext } from './components/DeckContext'
import { createRecorder, downloadBlob } from './utils/recorder'

export default function App() {
  const [editing, setEditing] = useState(() => {
    try {
      return sessionStorage.getItem('oh-my-ppt:editing') === '1'
    } catch {
      return false
    }
  })
  const [liveDoc, setLiveDoc] = useState<PPTConfig | null>(null)
  const DECK = liveDoc ?? getDeckConfig()

  const { dark, toggle, accent, pickAccent } = useTheme(DECK)
  const { current, step, overview, next, prev, goto, stepsOf, forceStep, toggleOverview } = useDeck(
    DECK.slides,
    !editing,
  )
  const total = DECK.slides.length
  const recorderRef = useRef<ReturnType<typeof createRecorder> | null>(null)
  const recordingActiveRef = useRef(false)

  const onStop = useCallback(async (completed: boolean) => {
    if (!recordingActiveRef.current) return
    recordingActiveRef.current = false
    const recorder = recorderRef.current
    recorderRef.current = null
    if (recorder) {
      const blob = await recorder.stop()
      if (blob.size > 0) {
        downloadBlob(blob, `${DECK.title}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`)
      }
    }
    if (!completed) {
      window.speechSynthesis?.cancel()
    }
  }, [])

  const { mode, start, cancel } = useAutoPlay({
    config: DECK,
    slides: DECK.slides,
    current,
    step,
    stepsOf,
    next,
    goto,
    onStop,
    mixer: recorderRef.current?.mixer ?? null,
    onTimelineStep: forceStep,
  })

  const enterEditor = useCallback(() => {
    try {
      sessionStorage.setItem('oh-my-ppt:editing', '1')
    } catch {
      /* ignore */
    }
    setEditing(true)
  }, [])

  const exitEditor = useCallback((doc: PPTConfig) => {
    try {
      sessionStorage.removeItem('oh-my-ppt:editing')
    } catch {
      /* ignore */
    }
    setLiveDoc(doc)
    setEditing(false)
    goto(0)
  }, [goto])

  useEffect(() => {
    document.title = DECK.title
  }, [DECK.title])

  const openSpeaker = useCallback(() => {
    const href = isSingleFile()
      ? `${window.location.href.split(/[?#]/)[0]}?speaker`
      : 'speaker.html'
    window.open(href, '_blank', 'width=1280,height=780')
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // 编辑模式与输入控件内的按键不触发放映快捷键（否则 s/p/e 会打断打字）
      const target = e.target as HTMLElement | null
      const typing =
        editing ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable
      if (typing) return
      if (e.key === 's' || e.key === 'S') {
        openSpeaker()
      } else if (e.key === 'p' || e.key === 'P') {
        window.print()
      } else if (e.key === 'e' || e.key === 'E') {
        if (!editing) enterEditor()
      } else if (e.key === 'Escape' && mode !== 'manual') {
        cancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mode, cancel, openSpeaker, editing, enterEditor])

  const handleStart = useCallback(
    async (record: boolean) => {
      if (record) {
        const recorder = createRecorder()
        if (!recorder.isSupported) {
          alert('当前浏览器不支持屏幕录制，请使用 Chrome/Edge 桌面版')
          return
        }
        try {
          await recorder.start()
          recorderRef.current = recorder
          recordingActiveRef.current = true
        } catch {
          return
        }
      }
      start(record)
    },
    [start],
  )

  const menuItems: MenuItem[] = [
    ...(mode !== 'manual'
      ? [
          {
            label: mode === 'recording' ? '停止录制' : '停止放映',
            icon: <Square size={16} />,
            onClick: cancel,
            danger: true,
          },
        ]
      : [
          {
            label: '自动放映',
            icon: <Play size={16} />,
            onClick: () => handleStart(false),
          },
          {
            label: '录制成片',
            icon: <Circle size={14} className="text-[#e06c75]" />,
            onClick: () => handleStart(true),
          },
        ]),
    {
      label: '概览模式',
      icon: <LayoutGrid size={16} />,
      onClick: toggleOverview,
      separatorBefore: true,
    },
    {
      label: '演讲者视图',
      icon: <Monitor size={16} />,
      onClick: openSpeaker,
    },
    {
      label: '主题设置',
      icon: <Palette size={16} />,
      panel: (
        <ThemePanel
          dark={dark}
          accent={accent}
          onToggleDark={toggle}
          onPickAccent={pickAccent}
        />
      ),
      separatorAfter: true,
    },
    {
      label: '编辑模式',
      icon: <Pencil size={16} />,
      onClick: enterEditor,
      separatorBefore: true,
    },
    {
      label: '全屏',
      icon: <Maximize size={16} />,
      onClick: toggleFullscreen,
    },
    {
      label: '打印导出 PDF',
      icon: <Printer size={16} />,
      onClick: () => window.print(),
    },
  ]

  if (editing) {
    return <EditorShell onExit={exitEditor} />
  }

  return (
    <DeckContext.Provider value={DECK}>
      <div className="relative h-full w-full overflow-hidden bg-bg text-fg">
        <main className="flex h-full items-center justify-center px-phi-3xl">
          <SlideRenderer
            key={current}
            slide={DECK.slides[current]}
            transition={DECK.transition}
            step={step}
          />
        </main>
        <span className="no-print absolute bottom-lg left-lg text-sm text-sfg tabular-nums">
          {current + 1} / {total}
        </span>
        <div className="no-print">
          <Controls onPrev={prev} onNext={next} />
        </div>
        <div className="no-print">
          <ProgressBar current={current} total={total} />
        </div>
        {overview && <Overview slides={DECK.slides} current={current} onPick={goto} />}
        <ContextMenu items={menuItems} />
      </div>
    </DeckContext.Provider>
  )
}
