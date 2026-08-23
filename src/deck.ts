import { CONFIG as builtin } from './config'
import type { PPTConfig } from './types'

const PREVIEW_KEY = 'oh-my-ppt:preview-doc'
export { PREVIEW_KEY }
export const DRAFT_KEY = 'oh-my-ppt:draft-doc'
export const DOC_ID = 'oh-my-ppt-doc'

declare global {
  interface Window {
    ohMyPpt?: {
      loadDoc: (json: string) => boolean
      getDoc: () => string
    }
  }
}

function readDocBlock(): PPTConfig | null {
  const element = document.getElementById(DOC_ID)
  if (!element?.textContent) return null
  try {
    const parsed = JSON.parse(element.textContent) as PPTConfig
    return Array.isArray(parsed.slides) ? parsed : null
  } catch {
    return null
  }
}

function readPreview(): PPTConfig | null {
  try {
    const raw = sessionStorage.getItem(PREVIEW_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PPTConfig
    return Array.isArray(parsed.slides) ? parsed : null
  } catch {
    return null
  }
}

/** 编辑器草稿（localStorage，跨刷新/重启保留）。 */
export function readDraft(): PPTConfig | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PPTConfig
    return Array.isArray(parsed.slides) ? parsed : null
  } catch {
    return null
  }
}

export function saveDraft(doc: PPTConfig): boolean {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(doc))
    return true
  } catch {
    return false
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * 生效优先级：编辑器草稿 > sessionStorage 预览 > #oh-my-ppt-doc 明文块 > 内置 config.ts
 * 草稿最高：编辑中的内容不能被底层数据悄悄覆盖。
 */
const source: PPTConfig = readPreview() ?? readDocBlock() ?? builtin
const active: PPTConfig = readDraft() ?? source

/** 底层源（不含草稿）：编辑器用它判断「是否真的改过」与放弃草稿的回退目标。 */
export function getSourceConfig(): PPTConfig {
  return source
}

export function getDeckConfig(): PPTConfig {
  return active
}

export function isSingleFile(): boolean {
  return !!document.getElementById(DOC_ID)
}

export function getDocJson(): string {
  return JSON.stringify(active, null, 2)
}

/** AI/外部工具 round-trip：校验 JSON 后存 sessionStorage 并刷新预览（不改文件） */
export function loadDoc(json: string): boolean {
  try {
    const parsed = JSON.parse(json)
    if (typeof parsed !== 'object' || parsed === null || !Array.isArray(parsed.slides)) {
      return false
    }
    sessionStorage.setItem(PREVIEW_KEY, JSON.stringify(parsed))
    window.location.reload()
    return true
  } catch {
    return false
  }
}

window.ohMyPpt = { loadDoc, getDoc: getDocJson }
