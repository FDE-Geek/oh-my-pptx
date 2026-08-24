import { CONFIG as builtin } from './config'
import type { PPTConfig } from './types'
import { parseDesignMd, type ThemePreset } from './theme/presets'
import { diffDecks, formatDiff } from './utils/diff'
import { lintDeck, formatIssues } from './utils/lint'

const PREVIEW_KEY = 'oh-my-ppt:preview-doc'
export { PREVIEW_KEY }
export const DRAFT_KEY = 'oh-my-ppt:draft-doc'
export const DOC_ID = 'oh-my-ppt-doc'

declare global {
  interface Window {
    ohMyPpt?: {
      loadDoc: (json: string) => boolean
      getDoc: () => string
      importDesignMd: (markdown: string) => ThemePreset | null
      diffDocs: (baseJson: string, otherJson: string) => string
      validate: (json?: string) => string
      validateReport: (json?: string) => string
    }
  }
}

function readDocBlock(): PPTConfig | null {
  const element = document.getElementById(DOC_ID)
  if (!element?.textContent) return null
  try {
    const parsed = JSON.parse(element.textContent) as PPTConfig
    return isValidDoc(parsed) ? parsed : null
  } catch {
    return null
  }
}

function readPreview(): PPTConfig | null {
  try {
    const raw = sessionStorage.getItem(PREVIEW_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PPTConfig
    return isValidDoc(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** 有效性：至少 1 页（空 slides 的 deck 在渲染层会白屏，读取层直接拒绝）。 */
function isValidDoc(doc: PPTConfig | null): doc is PPTConfig {
  return !!doc && Array.isArray(doc.slides) && doc.slides.length > 0
}

/** 编辑器草稿（localStorage，跨刷新/重启保留）。 */
export function readDraft(): PPTConfig | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PPTConfig
    return isValidDoc(parsed) ? parsed : null
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

window.ohMyPpt = {
  loadDoc,
  getDoc: getDocJson,
  /** DESIGN.md（OpenDesign 9 节 schema 子集）→ ThemePreset；失败返回 null。 */
  importDesignMd: (markdown: string) => parseDesignMd(markdown) as ThemePreset | null,
  /** 两份 deck JSON 的结构化对比（文本报告）。 */
  diffDocs: (baseJson: string, otherJson: string) => {
    try {
      const base = JSON.parse(baseJson) as PPTConfig
      const other = JSON.parse(otherJson) as PPTConfig
      return formatDiff(diffDecks(base, other))
    } catch {
      return '解析失败：入参需为两份合法 deck JSON 字符串'
    }
  },
  /** 结构化校验（借鉴 bento：静默错误显性化；只读，advice not refusal）。 */
  validate: (json?: string) => {
    try {
      const doc = (json ? JSON.parse(json) : JSON.parse(getDocJson())) as PPTConfig
      return JSON.stringify(lintDeck(doc), null, 2)
    } catch (e) {
      return JSON.stringify([{ page: 0, level: 'error', code: 'invalid-json', message: e instanceof Error ? e.message : 'JSON 解析失败' }])
    }
  },
  /** 校验的可读文本版。 */
  validateReport: (json?: string) => {
    try {
      const doc = (json ? JSON.parse(json) : JSON.parse(getDocJson())) as PPTConfig
      return formatIssues(lintDeck(doc))
    } catch (e) {
      return '解析失败：' + (e instanceof Error ? e.message : '')
    }
  },
}
