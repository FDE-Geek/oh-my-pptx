import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PPTConfig, Slide } from '../types'
import { getDeckConfig, getSourceConfig, saveDraft, clearDraft } from '../deck'

const HISTORY_LIMIT = 50
const AUTOSAVE_DELAY = 600
const COALESCE_MS = 800

export interface SlidePatchOpts {
  /** 连续敲同一组字段时合并成一步撤销（输入框用）。 */
  coalesce?: boolean
}

export interface EditorState {
  doc: PPTConfig
  selected: number
  /** 历史栈：past 最近的在末尾；future 最近的在开头。与 doc 同步存于单一 state。 */
  past: PPTConfig[]
  future: PPTConfig[]
}

/**
 * 编辑器文档状态：增删改排序 + 撤销/重做；草稿防抖自动保存到 localStorage。
 * 全部更新走纯 updater（StrictMode double-invoke 安全）。
 */
export function useEditorDoc() {
  const [state, setState] = useState<EditorState>(() => ({
    doc: structuredClone(getDeckConfig()),
    selected: 0,
    past: [],
    future: [],
  }))
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const saveTimer = useRef<number | null>(null)
  const lastCoalesce = useRef<{ key: string; at: number } | null>(null)
  // 源文档快照（不含草稿）：恢复自草稿时 dirty 应为 true，撤销回源则自动清草稿
  const pristineJson = useRef(JSON.stringify(getSourceConfig()))

  const commit = useCallback((
    mutate: (draft: PPTConfig) => void,
    opts?: { select?: number; coalesceKey?: string },
  ) => {
    setState(current => {
      const draft = structuredClone(current.doc)
      mutate(draft)
      const now = Date.now()
      const key = opts?.coalesceKey
      const merge = Boolean(
        key
        && lastCoalesce.current
        && lastCoalesce.current.key === key
        && now - lastCoalesce.current.at < COALESCE_MS,
      )
      lastCoalesce.current = key ? { key, at: now } : null
      if (merge) {
        return {
          ...current,
          doc: draft,
          selected: opts?.select ?? current.selected,
        }
      }
      return {
        doc: draft,
        selected: opts?.select ?? current.selected,
        past: [...current.past.slice(-HISTORY_LIMIT + 1), current.doc],
        future: [],
      }
    })
  }, [])

  const select = useCallback((index: number) => {
    setState(s => ({ ...s, selected: Math.max(0, Math.min(index, s.doc.slides.length - 1)) }))
  }, [])

  const updateSlide = useCallback(
    (index: number, patch: Partial<Slide>, opts?: SlidePatchOpts) => {
      commit(
        draft => {
          draft.slides[index] = { ...draft.slides[index], ...patch } as Slide
        },
        opts?.coalesce ? { coalesceKey: `slide:${index}:${Object.keys(patch).sort().join(',')}` } : undefined,
      )
    },
    [commit],
  )

  const replaceSlide = useCallback(
    (index: number, slide: Slide) => {
      commit(draft => {
        draft.slides[index] = slide
      })
    },
    [commit],
  )

  const addSlide = useCallback(
    (slide: Slide) => {
      setState(current => {
        const draft = structuredClone(current.doc)
        const at = Math.min(current.selected + 1, draft.slides.length)
        draft.slides.splice(at, 0, slide)
        lastCoalesce.current = null
        return {
          doc: draft,
          selected: at,
          past: [...current.past.slice(-HISTORY_LIMIT + 1), current.doc],
          future: [],
        }
      })
    },
    [],
  )

  const duplicateSlide = useCallback(
    (index: number) => {
      commit(
        draft => {
          draft.slides.splice(index + 1, 0, structuredClone(draft.slides[index]))
        },
        { select: index + 1 },
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
        { select: Math.max(0, index - 1) },
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
        { select: to },
      )
    },
    [commit, state.doc.slides.length],
  )

  const updateMeta = useCallback(
    (patch: Partial<PPTConfig>, opts?: SlidePatchOpts) => {
      commit(
        draft => {
          Object.assign(draft, patch)
        },
        opts?.coalesce ? { coalesceKey: `meta:${Object.keys(patch).sort().join(',')}` } : undefined,
      )
    },
    [commit],
  )

  const undo = useCallback(() => {
    lastCoalesce.current = null
    setState(current => {
      if (current.past.length === 0) return current
      const previous = current.past[current.past.length - 1]
      return {
        ...current,
        doc: previous,
        selected: Math.min(current.selected, previous.slides.length - 1),
        past: current.past.slice(0, -1),
        future: [current.doc, ...current.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    lastCoalesce.current = null
    setState(current => {
      if (current.future.length === 0) return current
      const next = current.future[0]
      return {
        ...current,
        doc: next,
        selected: Math.min(current.selected, next.slides.length - 1),
        past: [...current.past, current.doc],
        future: current.future.slice(1),
      }
    })
  }, [])

  const canUndo = state.past.length > 0
  const canRedo = state.future.length > 0

  // dirty 由内容比较得出：恢复自草稿 → true；撤销回源 → false
  const docJson = JSON.stringify(state.doc)
  const dirty = docJson !== pristineJson.current

  // 草稿自动保存：有实际修改才存；改回源内容则清掉草稿
  useEffect(() => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current)
    }
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null
      if (docJson !== pristineJson.current) {
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
  }, [docJson, state.doc])

  const discardDraft = useCallback(() => {
    clearDraft()
    window.location.reload()
  }, [])

  const loadDoc = useCallback((doc: PPTConfig) => {
    setState({
      doc: structuredClone(doc),
      selected: 0,
      past: [],
      future: [],
    })
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
      replaceSlide,
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
      replaceSlide,
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
