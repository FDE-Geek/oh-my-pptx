import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PPTConfig, Slide } from '../types'
import { getDeckConfig, getSourceConfig, saveDraft, clearDraft } from '../deck'

export interface EditorState {
  doc: PPTConfig
  selected: number
  dirty: boolean
}

const HISTORY_LIMIT = 50
const AUTOSAVE_DELAY = 600

/** 编辑器文档状态：增删改排序 + 撤销/重做；草稿防抖自动保存到 localStorage。 */
export function useEditorDoc() {
  const [state, setState] = useState<EditorState>(() => ({
    doc: structuredClone(getDeckConfig()),
    selected: 0,
    dirty: false,
  }))
  const [past, setPast] = useState<PPTConfig[]>([])
  const [future, setFuture] = useState<PPTConfig[]>([])
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const saveTimer = useRef<number | null>(null)
  // 源文档快照（不含草稿）：恢复自草稿时 dirty 应为 true，撤销回源则自动清草稿
  const pristineJson = useRef(JSON.stringify(getSourceConfig()))

  const commit = useCallback(
    (mutate: (draft: PPTConfig) => void, select?: number) => {
      setState(current => {
        const draft = structuredClone(current.doc)
        mutate(draft)
        setPast(p => [...p.slice(-HISTORY_LIMIT + 1), current.doc])
        setFuture([])
        return {
          doc: draft,
          selected: select ?? current.selected,
          dirty: true,
        }
      })
    },
    [],
  )

  const select = useCallback((index: number) => {
    setState(s => ({ ...s, selected: Math.max(0, Math.min(index, s.doc.slides.length - 1)) }))
  }, [])

  const updateSlide = useCallback(
    (index: number, patch: Partial<Slide>) => {
      commit(draft => {
        draft.slides[index] = { ...draft.slides[index], ...patch } as Slide
      })
    },
    [commit],
  )

  const addSlide = useCallback(
    (slide: Slide) => {
      commit(
        draft => {
          draft.slides.push(slide)
        },
        state.doc.slides.length,
      )
    },
    [commit, state.doc.slides.length],
  )

  const duplicateSlide = useCallback(
    (index: number) => {
      commit(
        draft => {
          draft.slides.splice(index + 1, 0, structuredClone(draft.slides[index]))
        },
        index + 1,
      )
    },
    [commit],
  )

  const removeSlide = useCallback(
    (index: number) => {
      if (state.doc.slides.length <= 1) return
      commit(
        draft => {
          draft.slides.splice(index, 1)
        },
        Math.max(0, index - 1),
      )
    },
    [commit, state.doc.slides.length],
  )

  const moveSlide = useCallback(
    (from: number, to: number) => {
      if (from === to || to < 0 || to >= state.doc.slides.length) return
      commit(
        draft => {
          const [moved] = draft.slides.splice(from, 1)
          draft.slides.splice(to, 0, moved)
        },
        to,
      )
    },
    [commit, state.doc.slides.length],
  )

  const updateMeta = useCallback(
    (patch: Partial<PPTConfig>) => {
      commit(draft => {
        Object.assign(draft, patch)
      })
    },
    [commit],
  )

  const undo = useCallback(() => {
    setState(current => {
      if (past.length === 0) return current
      const previous = past[past.length - 1]
      setPast(p => p.slice(0, -1))
      setFuture(f => [current.doc, ...f])
      return {
        ...current,
        doc: previous,
        selected: Math.min(current.selected, previous.slides.length - 1),
        dirty: true,
      }
    })
  }, [past])

  const redo = useCallback(() => {
    setState(current => {
      if (future.length === 0) return current
      const next = future[0]
      setFuture(f => f.slice(1))
      setPast(p => [...p, current.doc])
      return {
        ...current,
        doc: next,
        selected: Math.min(current.selected, next.slides.length - 1),
        dirty: true,
      }
    })
  }, [future])

  const canUndo = past.length > 0
  const canRedo = future.length > 0

  // dirty 由内容比较得出：恢复自草稿 → true；撤销回源 → false
  const dirty = state.dirty || JSON.stringify(state.doc) !== pristineJson.current

  // 草稿自动保存：有实际修改才存；改回源内容则清掉草稿
  useEffect(() => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current)
    }
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null
      if (JSON.stringify(state.doc) !== pristineJson.current) {
        if (saveDraft(state.doc)) {
          setSavedAt(Date.now())
        }
      } else {
        clearDraft()
        setSavedAt(null)
      }
    }, AUTOSAVE_DELAY)
    return () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current)
      }
    }
  }, [state.doc])

  const discardDraft = useCallback(() => {
    clearDraft()
    window.location.reload()
  }, [])

  const loadDoc = useCallback((doc: PPTConfig) => {
    setState({
      doc: structuredClone(doc),
      selected: 0,
      dirty: false,
    })
    setPast([])
    setFuture([])
  }, [])

  return useMemo(
    () => ({
      ...state,
      dirty,
      canUndo,
      canRedo,
      savedAt,
      select,
      updateSlide,
      addSlide,
      duplicateSlide,
      removeSlide,
      moveSlide,
      updateMeta,
      undo,
      redo,
      loadDoc,
      discardDraft,
    }),
    [
      state,
      dirty,
      canUndo,
      canRedo,
      savedAt,
      select,
      updateSlide,
      addSlide,
      duplicateSlide,
      removeSlide,
      moveSlide,
      updateMeta,
      undo,
      redo,
      loadDoc,
      discardDraft,
    ],
  )
}

export type Editor = ReturnType<typeof useEditorDoc>
