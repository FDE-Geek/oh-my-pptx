import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  FileJson,
  FileCode2,
  Film,
  FolderOpen,
  Globe,
  Redo2,
  RotateCcw,
  Settings2,
  Undo2,
} from 'lucide-react'
import './editor.css'
import type { PPTConfig } from '../../types'
import { useEditorDoc } from '../../hooks/useEditorDoc'
import { useTheme } from '../../hooks/useTheme'
import { ThumbRail } from './ThumbRail'
import { SlideForm } from './SlideForm'
import { ResizeHandle, useResizablePanel } from './ResizeHandle'
import { FitPreview } from './FitPreview'
import { convertSlide, NEW_SLIDE, SLIDE_TYPE_META } from './slideFactory'
import { ACCENTS } from '../ThemePanel'
import { BUILTIN_THEMES } from '../../theme/presets'
import { DeckContext } from '../DeckContext'
import { downloadConfigTs, downloadJson, parseImportedFile } from '../../utils/export'
import { toHyperframesComposition } from '../../utils/hyperframes'
import { exportStandaloneHtml } from '../../utils/exportHtml'
import { lintDeck } from '../../utils/lint'
import { Field, Section, TextInput, Select, Toggle, NumberInput } from './Controls'

export function EditorShell({ onExit }: { onExit: (doc: PPTConfig) => void }) {
  const editor = useEditorDoc()
  const { doc, selected, dirty } = editor
  const { dark, toggle, accent, pickAccent } = useTheme(doc)
  const [metaOpen, setMetaOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [lintOpen, setLintOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [railHidden, setRailHidden] = useState(false)
  const [formHidden, setFormHidden] = useState(false)
  const rail = useResizablePanel('oh-my-ppt:rail-w', 188, 150, 360)
  const form = useResizablePanel('oh-my-ppt:form-w', 320, 260, 520, true)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const issues = useMemo(() => lintDeck(doc), [doc])
  const errorCount = issues.filter(i => i.level === 'error').length
  const warnCount = issues.length - errorCount

  const importFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const onFilePicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = '' // 允许重复选择同一文件
      if (!file) return
      const text = await file.text()
      const parsed = parseImportedFile(text)
      if (!parsed) {
        alert('无法解析该文件：需要 editor 导出的 JSON，或项目的 config.ts（export const CONFIG = {...}）')
        return
      }
      editor.loadDoc(parsed)
    },
    [editor],
  )

  const current = doc.slides[selected]

  const exportHtml = useCallback(() => {
    exportStandaloneHtml(doc).catch(e => alert(e.message))
  }, [doc])

  const exportMp4 = useCallback(() => {
    const html = toHyperframesComposition(doc, { singleFileName: 'oh-my-ppt.html' })
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'composition.html'
    a.click()
    URL.revokeObjectURL(url)
  }, [doc])

  const exit = useCallback(() => {
    if (
      !dirty ||
      confirm('修改已存为草稿（刷新不丢）。提示：导出 config.ts 替换源文件才是永久保存。仍要退出编辑？')
    ) {
      onExit(editor.doc)
    }
  }, [dirty, editor.doc, onExit])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT'
        || target?.tagName === 'TEXTAREA'
        || target?.tagName === 'SELECT'
        || target?.isContentEditable
      const mod = e.metaKey || e.ctrlKey
      if (mod && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (e.shiftKey) editor.redo()
        else editor.undo()
        return
      }
      if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        editor.redo()
        return
      }
      if (mod && (e.key === 's' || e.key === 'S')) {
        e.preventDefault()
        exportHtml()
        return
      }
      if (e.key === 'Escape') {
        if (addOpen) { setAddOpen(false); return }
        if (exportOpen) { setExportOpen(false); return }
        if (helpOpen) { setHelpOpen(false); return }
        exit()
        return
      }
      if (typing) return
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault()
        setHelpOpen(o => !o)
        return
      }
      if (e.key === '[') {
        e.preventDefault()
        setRailHidden(o => !o)
        return
      }
      if (e.key === ']') {
        e.preventDefault()
        setFormHidden(o => !o)
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        editor.select(selected + 1)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        editor.select(selected - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [addOpen, editor, exit, exportHtml, exportOpen, helpOpen, selected])

  return (
    <DeckContext.Provider value={doc}>
      <div className="ed-root">
        <header className="ed-topbar">
          <span className="ed-logo" title="oh-my-ppt">
            <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden>
              <rect width="32" height="32" rx="7" fill="currentColor" opacity="0.12" />
              <rect x="5" y="5" width="7" height="22" rx="2" fill="var(--accent)" />
              <rect x="14" y="5" width="13" height="10" rx="2" fill="var(--accent-dim)" />
              <rect x="14" y="17" width="13" height="10" rx="2" fill="var(--accent-bright)" />
            </svg>
            oh-my-ppt
          </span>
          <input
            className="ed-title"
            value={doc.title}
            spellCheck={false}
            title="文档标题（也用于浏览器标签）"
            onChange={e => editor.updateMeta({ title: e.target.value }, { coalesce: true })}
          />
          {dirty && (
            <button
              type="button"
              className="ed-btn"
              title="放弃草稿，恢复源文件"
              onClick={() => {
                if (confirm('放弃草稿，恢复到 config.ts / 数据块的原始内容？')) editor.discardDraft()
              }}
            >
              <RotateCcw size={14} />
            </button>
          )}
          <div className="ed-group">
            <button type="button" className="ed-btn" disabled={!editor.canUndo} title="撤销 (⌘Z)" onClick={editor.undo}>
              <Undo2 size={15} />
            </button>
            <button type="button" className="ed-btn" disabled={!editor.canRedo} title="重做 (⇧⌘Z)" onClick={editor.redo}>
              <Redo2 size={15} />
            </button>
          </div>
          <div className="ed-group ed-group-right">
            {issues.length > 0 && (
              <button
                type="button"
                className={`ed-btn${lintOpen ? ' on' : ''}`}
                onClick={() => setLintOpen(o => !o)}
              >
                {errorCount > 0 ? `${errorCount} 错误` : `${warnCount} 警告`}
              </button>
            )}
            <button
              type="button"
              className={`ed-btn${metaOpen ? ' on' : ''}`}
              title="Deck 设置"
              onClick={() => setMetaOpen(o => !o)}
            >
              <Settings2 size={15} />
              <span className="ed-btn-label">Deck</span>
            </button>
            <button type="button" className="ed-btn" title="导入 config.ts / JSON" onClick={importFile}>
              <FolderOpen size={14} />
              <span className="ed-btn-label">导入</span>
            </button>
            <div className="ed-dropdown">
              <div className="ed-split">
                <button type="button" className="ed-btn ed-btn-primary" title="导出独立 HTML（⌘S）" onClick={exportHtml}>
                  <Globe size={14} />
                  <span className="ed-btn-label">导出</span>
                  <span className={`ed-dirty${dirty ? ' on' : ''}`} />
                </button>
                <button type="button" className="ed-btn ed-caret" title="更多导出" onClick={() => setExportOpen(o => !o)}>
                  <ChevronDown size={14} />
                </button>
              </div>
              {exportOpen && (
                <div className="ed-menu">
                  <button type="button" className="ed-btn" onClick={() => { downloadConfigTs(doc); setExportOpen(false) }}>
                    <FileCode2 size={14} /> config.ts
                  </button>
                  <button type="button" className="ed-btn" onClick={() => { downloadJson(doc); setExportOpen(false) }}>
                    <FileJson size={14} /> JSON
                  </button>
                  <button type="button" className="ed-btn" onClick={() => { exportMp4(); setExportOpen(false) }}>
                    <Film size={14} /> MP4 composition
                  </button>
                </div>
              )}
            </div>
            <button type="button" className="ed-btn" title="快捷键（?）" onClick={() => setHelpOpen(true)}>
              <b style={{ fontSize: 15, lineHeight: 1 }}>?</b>
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept=".ts,.json,.txt" className="hidden" onChange={onFilePicked} />
        </header>

        <div className="ed-main">
          <ThumbRail
            width={rail.width}
            collapsed={railHidden}
            slides={doc.slides}
            selected={selected}
            onSelect={editor.select}
            onAdd={() => {
              editor.select(doc.slides.length - 1)
              setAddOpen(true)
            }}
            onInsertAfter={index => {
              editor.select(index)
              setAddOpen(true)
            }}
            onDuplicate={editor.duplicateSlide}
            onRemove={editor.removeSlide}
            onMove={editor.moveSlide}
          />
          {!railHidden && <ResizeHandle dragging={rail.dragging} onPointerDown={rail.onPointerDown} />}

          <FitPreview slide={current} onPresent={exit} />

          {!formHidden && <ResizeHandle dragging={form.dragging} onPointerDown={form.onPointerDown} />}
          <aside className={`ed-props thin-scroll${formHidden ? ' ed-collapsed' : ''}`} style={{ width: formHidden ? 0 : form.width }}>
            <div className="ed-tabs">
              <button type="button" className={`ed-btn${!metaOpen ? ' on' : ''}`} onClick={() => setMetaOpen(false)}>
                第 {selected + 1} 页
              </button>
              <button type="button" className={`ed-btn${metaOpen ? ' on' : ''}`} onClick={() => setMetaOpen(true)}>
                Deck
              </button>
            </div>
            {metaOpen ? (
              <DeckMetaForm doc={doc} dark={dark} accent={accent} onToggle={toggle} onPickAccent={pickAccent} onChange={editor.updateMeta} />
            ) : (
              <SlideForm
                slide={current}
                onChange={(patch, opts) => editor.updateSlide(selected, patch, opts)}
                onConvert={type => editor.replaceSlide(selected, convertSlide(current, type))}
              />
            )}
            {lintOpen && issues.length > 0 && (
              <ul className="mt-phi-md text-xs">
                {issues.map((issue, i) => (
                  <li key={`${issue.code}-${issue.page}-${i}`} className={issue.level === 'error' ? 'text-danger' : 'text-sfg'}>
                    [{issue.code}] {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>

        {addOpen && (
          <div className="ed-help" onClick={() => setAddOpen(false)}>
            <div className="ed-pick" onClick={e => e.stopPropagation()}>
              <h3>在当前页后插入</h3>
              {SLIDE_TYPE_META.map(({ type, label }) => (
                <button
                  key={type}
                  type="button"
                  className="ed-btn"
                  style={{ border: '1px solid var(--ed-line)', justifyContent: 'flex-start' }}
                  onClick={() => {
                    editor.addSlide(NEW_SLIDE[type]())
                    setAddOpen(false)
                  }}
                >
                  <span>
                    <b>{label}</b>
                    <span className="ed-btn-label" style={{ display: 'block', fontSize: 11, color: 'var(--ed-muted)' }}>{type}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {helpOpen && (
          <div className="ed-help" onClick={() => setHelpOpen(false)}>
            <div className="ed-help-card" onClick={e => e.stopPropagation()}>
              <h2>快捷键</h2>
              <dl>
                <dt>⌘Z / ⇧⌘Z</dt><dd>撤销 / 重做</dd>
                <dt>⌘S</dt><dd>导出 HTML</dd>
                <dt>↑ ↓</dt><dd>上一页 / 下一页</dd>
                <dt>[ ]</dt><dd>缩略图栏 / 属性栏</dd>
                <dt>?</dt><dd>本说明</dd>
                <dt>Esc</dt><dd>关闭弹层，再按退出编辑</dd>
              </dl>
            </div>
          </div>
        )}
      </div>
    </DeckContext.Provider>
  )
}

function DeckMetaForm({
  doc,
  dark,
  accent,
  onToggle,
  onPickAccent,
  onChange,
}: {
  doc: PPTConfig
  dark: boolean
  accent: string
  onToggle: () => void
  onPickAccent: (seed: string) => void
  onChange: (patch: Partial<PPTConfig>) => void
}) {
  return (
    <div className="flex flex-col gap-phi-md">
      <Section>文档</Section>
      <Field label="标题（浏览器标签与顶栏）">
        <TextInput value={doc.title} onChange={(v: string) => onChange({ title: v })} />
      </Field>
      <Field label="署名（封面显示）">
        <TextInput value={doc.author} onChange={(v: string) => onChange({ author: v })} />
      </Field>
      <Section>主题</Section>
      <Field label="主题预设（themes/）">
        <Select<string>
          value={doc.themePreset ?? 'default'}
          options={BUILTIN_THEMES.map(theme => ({
            value: theme.id,
            label: `${theme.name} — ${theme.description ?? ''}`,
          }))}
          onChange={(v: string) =>
            onChange({ themePreset: v === 'default' ? undefined : v })
          }
        />
      </Field>
      <Field label="主题色种子">
        <div className="flex items-center gap-phi-sm">
          <input
            type="color"
            value={accent}
            onChange={e => onPickAccent(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-md border border-[var(--chrome-outline)] bg-[var(--chrome-bg)]"
          />
          <div className="flex flex-wrap gap-phi-xs">
            {ACCENTS.map((option: { name: string; seed: string }) => (
              <button
                key={option.seed}
                title={option.name}
                onClick={() => onPickAccent(option.seed)}
                className={`h-6 w-6 rounded-md border transition-all ${
                  accent.toLowerCase() === option.seed.toLowerCase()
                    ? 'border-accent ring-2 ring-accent/30'
                    : 'border-outline hover:border-accent'
                }`}
                style={{ backgroundColor: option.seed }}
              />
            ))}
          </div>
          <span className="text-xs text-sfg">{accent}</span>
        </div>
      </Field>
      <Field label="全局切换动效">
        <Select<'fade' | 'slide' | 'zoom' | 'none'>
          value={doc.transition ?? 'fade'}
          options={[
            { value: 'fade', label: '淡入' },
            { value: 'slide', label: '滑动' },
            { value: 'zoom', label: '缩放' },
            { value: 'none', label: '无' },
          ]}
          onChange={(v: 'fade' | 'slide' | 'zoom' | 'none') => onChange({ transition: v })}
        />
      </Field>
      <Section>旁白</Section>
      <Toggle
        checked={doc.narration.enabled}
        onChange={v => onChange({ narration: { ...doc.narration, enabled: v } })}
        label="启用旁白（narration.enabled）"
      />
      <Field label="TTS 语言">
        <TextInput
          value={doc.narration.lang}
          placeholder="zh-CN / en-US …"
          onChange={(v: string) => onChange({ narration: { ...doc.narration, lang: v } })}
        />
      </Field>
      <Field label="TTS 语速（0.5–2）">
        <NumberInput
          value={doc.narration.rate}
          min={0.5}
          max={2}
          step={0.1}
          onChange={(v: number) => onChange({ narration: { ...doc.narration, rate: v } })}
        />
      </Field>
      <Field label="无旁白页停留（毫秒）">
        <NumberInput
          value={doc.autoplay.defaultDuration}
          min={500}
          step={500}
          onChange={(v: number) => onChange({ autoplay: { ...doc.autoplay, defaultDuration: v } })}
        />
      </Field>
      <Toggle
        checked={dark}
        onChange={onToggle}
        label="深色模式预览"
      />
    </div>
  )
}
