import { useCallback, useRef, useState } from 'react'
import {
  ArrowLeft,
  FileJson,
  FileCode2,
  FolderOpen,
  Redo2,
  RotateCcw,
  Settings2,
  Undo2,
} from 'lucide-react'
import type { Slide, PPTConfig } from '../../types'
import { useEditorDoc } from '../../hooks/useEditorDoc'
import { useTheme } from '../../hooks/useTheme'
import { ThumbRail } from './ThumbRail'
import { SlideForm } from './SlideForm'
import { ResizeHandle, useResizablePanel } from './ResizeHandle'
import { SlideRenderer } from '../SlideRenderer'
import { ACCENTS } from '../ThemePanel'
import { DeckContext } from '../DeckContext'
import { downloadConfigTs, downloadJson, parseImportedFile } from '../../utils/export'
import { Field, TextInput, Select, Toggle, NumberInput } from './Controls'

const NEW_SLIDE: Record<string, () => Slide> = {
  cover: () => ({ type: 'cover', title: '新封面' }),
  section: () => ({ type: 'section', title: '新章节' }),
  content: () => ({ type: 'content', title: '新页面', bullets: ['要点一', '要点二'] }),
  'two-column': () => ({
    type: 'two-column',
    title: '对比页',
    left: { title: '左', bullets: [] },
    right: { title: '右', bullets: [] },
  }),
  quote: () => ({ type: 'quote', quote: '新引用', author: '' }),
  code: () => ({ type: 'code', title: '代码页', code: 'console.log("hello")', language: 'js' }),
  image: () => ({ type: 'image', title: '图片页', src: '' }),
  table: () => ({ type: 'table', title: '表格页', headers: ['列一', '列二'], rows: [['', '']] }),
  chart: () => ({
    type: 'chart',
    title: '图表页',
    chart: {
      kind: 'bar',
      labels: ['一', '二', '三'],
      series: [{ name: '系列一', data: [1, 2, 3] }],
    },
  }),
  diagram: () => ({
    type: 'diagram',
    title: '图示页',
    diagram: {
      nodes: [
        { id: 'a', x: 80, y: 60, label: '开始' },
        { id: 'b', x: 280, y: 60, label: '处理' },
        { id: 'c', x: 480, y: 60, label: '结束' },
      ],
      edges: [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'c' },
      ],
    },
  }),
  end: () => ({ type: 'end', title: 'Thanks' }),
}

export function EditorShell({ onExit }: { onExit: (doc: PPTConfig) => void }) {
  const editor = useEditorDoc()
  const { doc, selected, dirty } = editor
  const { dark, toggle, accent, pickAccent } = useTheme(doc)
  const [metaOpen, setMetaOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const rail = useResizablePanel('oh-my-ppt:rail-w', 208, 150, 420)
  const form = useResizablePanel('oh-my-ppt:form-w', 400, 300, 640)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  const exit = useCallback(() => {
    if (
      !dirty ||
      confirm('修改已存为草稿（刷新不丢）。提示：导出 config.ts 替换源文件才是永久保存。仍要退出编辑？')
    ) {
      onExit(editor.doc)
    }
  }, [dirty, editor.doc, onExit])

  return (
    <DeckContext.Provider value={doc}>
      <div className="flex h-full w-full flex-col bg-bg text-fg">
      {/* 顶栏 */}
      <header className="flex items-center gap-phi-md border-b border-outline bg-card px-phi-md py-phi-sm">
        <button
          onClick={exit}
          className="flex items-center gap-phi-xs rounded-md px-phi-sm py-phi-xs text-sm text-sfg hover:text-accent"
        >
          <ArrowLeft size={15} />
          放映
        </button>
        <span className="text-sm font-semibold">{doc.title}</span>
        {dirty && (
          <span
            className="text-xs text-sfg"
            title={`草稿已自动保存（localStorage，刷新不丢）\n「导出 config.ts」并替换 src/config.ts 后才算落盘`}
          >
            {editor.savedAt ? '✓ 草稿已保存' : '保存中…'}
          </span>
        )}
        {dirty && (
          <button
            onClick={() => {
              if (confirm('放弃草稿，恢复到 config.ts / 数据块的原始内容？')) {
                editor.discardDraft()
              }
            }}
            title="放弃草稿"
            className="rounded-md p-phi-xs text-sfg hover:text-danger"
          >
            <RotateCcw size={14} />
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={editor.undo}
          disabled={!editor.canUndo}
          title="撤销 (Ctrl+Z)"
          className="rounded-md p-phi-xs text-sfg hover:text-accent disabled:opacity-30"
        >
          <Undo2 size={16} />
        </button>
        <button
          onClick={editor.redo}
          disabled={!editor.canRedo}
          title="重做 (Ctrl+Shift+Z)"
          className="rounded-md p-phi-xs text-sfg hover:text-accent disabled:opacity-30"
        >
          <Redo2 size={16} />
        </button>
        <button
          onClick={() => setMetaOpen(o => !o)}
          title="deck 设置（标题/署名/主题/配音）"
          className={`flex items-center gap-phi-xs rounded-md px-phi-sm py-phi-xs text-sm transition-colors ${
            metaOpen ? 'bg-accent/15 text-accent' : 'text-sfg hover:text-accent'
          }`}
        >
          <Settings2 size={15} />
          Deck 设置
        </button>
        <button
          onClick={importFile}
          title="导入 config.ts / JSON（覆盖当前编辑内容，草稿将更新）"
          className="flex items-center gap-phi-xs rounded-md px-phi-sm py-phi-xs text-sm text-sfg hover:text-accent"
        >
          <FolderOpen size={14} />
          导入
        </button>
        <button
          onClick={() => downloadJson(doc)}
          className="flex items-center gap-phi-xs rounded-md px-phi-sm py-phi-xs text-sm text-sfg hover:text-accent"
        >
          <FileJson size={14} />
          JSON
        </button>
        <button
          onClick={() => downloadConfigTs(doc)}
          className="flex items-center gap-phi-xs rounded-md bg-accent px-phi-md py-phi-xs text-sm font-medium text-on-accent hover:opacity-90"
        >
          <FileCode2 size={14} />
          导出 config.ts
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ts,.json,.txt"
          className="hidden"
          onChange={onFilePicked}
        />
      </header>

      <div className="flex min-h-0 flex-1">
        {/* 缩略图侧栏（可拖宽） */}
        <ThumbRail
          width={rail.width}
          slides={doc.slides}
          selected={selected}
          onSelect={editor.select}
          onAdd={() => setAddOpen(true)}
          onDuplicate={editor.duplicateSlide}
          onRemove={editor.removeSlide}
          onMove={editor.moveSlide}
        />
        <ResizeHandle dragging={rail.dragging} onPointerDown={rail.onPointerDown} />

        {/* 表单区（可拖宽，剩余空间给预览） */}
        <main
          className="thin-scroll shrink-0 overflow-y-auto p-phi-lg"
          style={{ width: form.width }}
        >
          <div className="mb-phi-md flex items-center gap-phi-sm border-b border-outline pb-phi-sm">
            <button
              onClick={() => setMetaOpen(false)}
              className={`rounded-md px-phi-sm py-phi-xs text-xs font-medium transition-colors ${
                !metaOpen ? 'bg-accent/15 text-accent' : 'text-sfg hover:text-accent'
              }`}
            >
              页面设置 · 第 {selected + 1} 页（{current.type}）
            </button>
            <button
              onClick={() => setMetaOpen(true)}
              className={`rounded-md px-phi-sm py-phi-xs text-xs font-medium transition-colors ${
                metaOpen ? 'bg-accent/15 text-accent' : 'text-sfg hover:text-accent'
              }`}
            >
              Deck 设置
            </button>
          </div>
          {metaOpen ? (
            <DeckMetaForm doc={doc} dark={dark} accent={accent} onToggle={toggle} onPickAccent={pickAccent} onChange={editor.updateMeta} />
          ) : (
            <div className="mx-auto flex max-w-xl flex-col gap-phi-md">
              <SlideForm
                slide={current}
                onChange={patch => editor.updateSlide(selected, patch)}
              />
            </div>
          )}
        </main>
        <ResizeHandle dragging={form.dragging} onPointerDown={form.onPointerDown} />

        {/* 右侧实时预览 */}
        <section className="flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-bg p-phi-md">
          <div className="pointer-events-none flex max-h-full w-full max-w-[640px] items-center justify-center overflow-hidden rounded-lg border border-outline bg-card">
            <div className="pointer-events-none origin-center scale-[0.35]">
              <div className="flex h-[540px] w-[960px] items-center px-phi-3xl">
                <SlideRenderer slide={current} transition="none" />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* 新增页面弹层 */}
      {addOpen && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="grid w-[480px] grid-cols-2 gap-phi-sm rounded-xl bg-card p-phi-md shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <p className="col-span-2 px-phi-xs pb-phi-xs text-xs font-semibold tracking-widest text-sfg uppercase">
              新增页面
            </p>
            {Object.entries(NEW_SLIDE).map(([type, factory]) => (
              <button
                key={type}
                onClick={() => {
                  editor.addSlide(factory())
                  setAddOpen(false)
                }}
                className="rounded-lg border border-outline px-phi-md py-phi-sm text-left text-sm hover:border-accent hover:text-accent"
              >
                {type}
              </button>
            ))}
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
    <div className="mx-auto flex max-w-xl flex-col gap-phi-md">
      <Field label="标题（浏览器标签与顶栏）">
        <TextInput value={doc.title} onChange={(v: string) => onChange({ title: v })} />
      </Field>
      <Field label="署名（封面显示）">
        <TextInput value={doc.author} onChange={(v: string) => onChange({ author: v })} />
      </Field>
      <Field label="主题色种子">
        <div className="flex items-center gap-phi-sm">
          <input
            type="color"
            value={accent}
            onChange={e => onPickAccent(e.target.value)}
            className="h-9 w-14 cursor-pointer rounded-md border border-outline bg-bg"
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
