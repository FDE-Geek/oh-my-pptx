import type {
  ChartSpec,
  Slide,
  ContentSlide,
  TwoColumnSlide,
  QuoteSlide,
  CodeSlide,
  ImageSlide,
  TableSlide,
  ChartSlide,
  ColumnContent,
  DiagramSlide,
  SectionSlide,
  EndSlide,
} from '../../types'
import type { SlidePatchOpts } from '../../hooks/useEditorDoc'
import { Field, Section, TextInput, TextArea, Select, Toggle, ListEditor } from './Controls'
import { DiagramCanvas } from './DiagramCanvas'
import { SLIDE_TYPE_META } from './slideFactory'

const TRANSITION_OPTIONS = [
  { value: 'fade', label: '淡入（默认）' },
  { value: 'slide', label: '滑动' },
  { value: 'zoom', label: '缩放' },
  { value: 'none', label: '无' },
] as const

export function SlideForm({
  slide,
  onChange,
  onConvert,
}: {
  slide: Slide
  onChange: (patch: Partial<Slide>, opts?: SlidePatchOpts) => void
  onConvert: (type: Slide['type']) => void
}) {
  const text = (patch: Partial<Slide>) => onChange(patch, { coalesce: true })
  return (
    <div className="flex flex-col gap-phi-md">
      <Section>页面</Section>
      <Field label="页型">
        <Select<Slide['type']>
          value={slide.type}
          options={SLIDE_TYPE_META.map(item => ({
            value: item.type,
            label: `${item.label} · ${item.type}`,
          }))}
          onChange={onConvert}
        />
      </Field>
      <Field label="页眉面包屑（tag）">
        <TextInput
          value={slide.tag ?? ''}
          placeholder="§1 · 章节名（可选）"
          onChange={v => text({ tag: v || undefined })}
        />
      </Field>

      <Section>内容</Section>
      <SwitchByType slide={slide} onChange={onChange} text={text} />

      <Section>讲稿</Section>

      <Field label="讲者备注（notes：目的 + 转场）">
        <TextArea
          value={slide.notes ?? ''}
          rows={2}
          placeholder="目的：…转场：…"
          onChange={v => text({ notes: v || undefined })}
        />
      </Field>
      <Field label="口播稿（narration：完整句子）">
        <TextArea
          value={slide.narration ?? ''}
          rows={2}
          placeholder="写给 TTS 的完整口播句；缺省自动拼接"
          onChange={v => text({ narration: v || undefined })}
        />
      </Field>
      <Field label="切换动效（覆盖全局）">
        <Select
          value={slide.transition ?? 'fade'}
          options={TRANSITION_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          onChange={v => onChange({ transition: v })}
        />
      </Field>
    </div>
  )
}

function SwitchByType({
  slide,
  onChange,
  text,
}: {
  slide: Slide
  onChange: (patch: Partial<Slide>, opts?: SlidePatchOpts) => void
  text: (patch: Partial<Slide>) => void
}) {
  switch (slide.type) {
    case 'cover':
      return (
        <>
          <Field label="标题">
            <TextInput value={slide.title} onChange={v => text({ title: v })} />
          </Field>
          <Field label="副标题">
            <TextInput
              value={slide.subtitle ?? ''}
              onChange={v => text({ subtitle: v || undefined })}
            />
          </Field>
        </>
      )
    case 'section': {
      const section = slide as SectionSlide
      const items = section.items ?? []
      return (
        <>
          <Field label="标题">
            <TextInput value={section.title} onChange={v => text({ title: v })} />
          </Field>
          <Field label="副标题">
            <TextInput
              value={section.subtitle ?? ''}
              onChange={v => text({ subtitle: v || undefined })}
            />
          </Field>
          <ListEditor
            label={`目录条目（${items.length}，有则渲染 TOC）`}
            items={items}
            onAdd={() => onChange({ items: [...items, { title: '新条目' }] })}
            onRemove={i => onChange({ items: items.filter((_, j) => j !== i) })}
            onMove={(from, to) => {
              const next = [...items]
              const [moved] = next.splice(from, 1)
              next.splice(to, 0, moved)
              onChange({ items: next })
            }}
          >
            {i => (
              <div className="flex flex-col gap-phi-xs">
                <TextInput
                  value={items[i].title}
                  placeholder="条目标题"
                  onChange={v =>
                    text({
                      items: items.map((item, j) => (j === i ? { ...item, title: v } : item)),
                    })
                  }
                />
                <TextInput
                  value={items[i].summary ?? ''}
                  placeholder="摘要（可选）"
                  onChange={v =>
                    text({
                      items: items.map((item, j) =>
                        j === i ? { ...item, summary: v || undefined } : item,
                      ),
                    })
                  }
                />
              </div>
            )}
          </ListEditor>
        </>
      )
    }
    case 'end': {
      const end = slide as EndSlide
      return (
        <>
          <Field label="标题">
            <TextInput value={end.title} onChange={v => text({ title: v })} />
          </Field>
          <Field label="副标题">
            <TextInput
              value={end.subtitle ?? ''}
              onChange={v => text({ subtitle: v || undefined })}
            />
          </Field>
          <BulletsEditor
            bullets={end.takeaways ?? []}
            onChange={(takeaways, opts) =>
              onChange({ takeaways: takeaways.length ? takeaways : undefined }, opts)
            }
          />
        </>
      )
    }
    case 'content': {
      const content = slide as ContentSlide
      return (
        <>
          <Field label="标题">
            <TextInput value={content.title} onChange={v => text({ title: v })} />
          </Field>
          <BulletsEditor
            bullets={content.bullets ?? []}
            onChange={(bullets, opts) => onChange({ bullets }, opts)}
          />
          <Field label="版式">
            <Select<'left' | 'center' | 'card'>
              value={content.layout ?? 'left'}
              options={[
                { value: 'left', label: '左对齐（缺省）' },
                { value: 'center', label: '居中' },
                { value: 'card', label: '卡片网格' },
              ]}
              onChange={(v: 'left' | 'center' | 'card') =>
                onChange({ layout: v === 'left' ? undefined : v })
              }
            />
          </Field>
          <Toggle
            checked={content.step === true}
            onChange={v => onChange({ step: v || undefined })}
            label="逐条出现（step）"
          />
        </>
      )
    }
    case 'two-column': {
      const two = slide as TwoColumnSlide
      return (
        <>
          <Field label="标题">
            <TextInput value={two.title} onChange={v => text({ title: v })} />
          </Field>
          <ColumnEditor
            label="左列"
            column={two.left}
            onChange={(left, opts) => onChange({ left }, opts)}
          />
          <ColumnEditor
            label="右列"
            column={two.right}
            onChange={(right, opts) => onChange({ right }, opts)}
          />
        </>
      )
    }
    case 'quote': {
      const quote = slide as QuoteSlide
      return (
        <>
          <Field label="引用内容">
            <TextArea
              value={quote.quote}
              rows={4}
              onChange={v => text({ quote: v })}
            />
          </Field>
          <Field label="署名">
            <TextInput
              value={quote.author ?? ''}
              onChange={v => text({ author: v || undefined })}
            />
          </Field>
        </>
      )
    }
    case 'code': {
      const code = slide as CodeSlide
      return (
        <>
          <Field label="标题">
            <TextInput value={code.title} onChange={v => text({ title: v })} />
          </Field>
          <Field label="文件名（窗口标题）">
            <TextInput
              value={code.filename ?? ''}
              onChange={v => text({ filename: v || undefined })}
            />
          </Field>
          <Field label="语言">
            <TextInput
              value={code.language ?? ''}
              placeholder="js / ts / py / bash"
              onChange={v => text({ language: v || undefined })}
            />
          </Field>
          <Field label="代码">
            <TextArea
              value={code.code}
              rows={10}
              onChange={v => text({ code: v })}
            />
          </Field>
        </>
      )
    }
    case 'image': {
      const image = slide as ImageSlide
      return (
        <>
          <Field label="标题">
            <TextInput value={image.title} onChange={v => text({ title: v })} />
          </Field>
          <Field label="图片地址（src）">
            <TextInput value={image.src} onChange={v => text({ src: v })} />
          </Field>
          <Field label="说明文字">
            <TextInput
              value={image.caption ?? ''}
              onChange={v => text({ caption: v || undefined })}
            />
          </Field>
        </>
      )
    }
    case 'table': {
      const table = slide as TableSlide
      return (
        <>
          <Field label="标题">
            <TextInput value={table.title} onChange={v => text({ title: v })} />
          </Field>
          <Field label="表头（逗号分隔）">
            <TextInput
              value={table.headers.join(', ')}
              onChange={v =>
                text({ headers: v.split(/[,，]/).map(s => s.trim()).filter(Boolean) })
              }
            />
          </Field>
          <TableRowsEditor
            rows={table.rows}
            onChange={(rows, opts) => onChange({ rows }, opts)}
          />
        </>
      )
    }
    case 'chart': {
      const chart = slide as ChartSlide
      return (
        <>
          <Field label="标题">
            <TextInput value={chart.title} onChange={v => text({ title: v })} />
          </Field>
          <ChartEditor
            chart={chart.chart}
            onChange={(next, opts) => onChange({ chart: next }, opts)}
          />
        </>
      )
    }
    case 'diagram': {
      const diagram = slide as DiagramSlide
      return (
        <>
          <Field label="标题">
            <TextInput value={diagram.title} onChange={v => text({ title: v })} />
          </Field>
          {/* 入口卡片；Graph 宿主只在专注工作台（portal，不在本表单 DOM） */}
          <DiagramCanvas
            spec={diagram.diagram}
            onChange={next => onChange({ diagram: next }, { coalesce: true })}
          />
        </>
      )
    }
  }
}

function BulletsEditor({
  bullets,
  onChange,
}: {
  bullets: string[]
  onChange: (bullets: string[], opts?: SlidePatchOpts) => void
}) {
  return (
    <ListEditor
      label={`要点（${bullets.length}）`}
      items={bullets}
      onAdd={() => onChange([...bullets, ''])}
      onRemove={i => onChange(bullets.filter((_, j) => j !== i))}
      onMove={(from, to) => {
        const next = [...bullets]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        onChange(next)
      }}
    >
      {i => (
        <TextInput
          value={bullets[i]}
          placeholder={`要点 ${i + 1}`}
          onChange={v => onChange(bullets.map((b, j) => (j === i ? v : b)), { coalesce: true })}
        />
      )}
    </ListEditor>
  )
}

function ColumnEditor({
  label,
  column,
  onChange,
}: {
  label: string
  column: ColumnContent
  onChange: (column: ColumnContent, opts?: SlidePatchOpts) => void
}) {
  return (
    <div className="rounded-lg border border-[var(--chrome-outline)] p-phi-sm bg-[var(--chrome-card)]">
      <p className="mb-phi-sm text-xs font-semibold text-accent">{label}</p>
      <div className="flex flex-col gap-phi-sm">
        <Field label="列标题">
          <TextInput
            value={column.title ?? ''}
            onChange={v => onChange({ ...column, title: v || undefined }, { coalesce: true })}
          />
        </Field>
        <BulletsEditor
          bullets={column.bullets ?? []}
          onChange={(bullets, opts) => onChange({ ...column, bullets }, opts)}
        />
      </div>
    </div>
  )
}

function TableRowsEditor({
  rows,
  onChange,
}: {
  rows: string[][]
  onChange: (rows: string[][], opts?: SlidePatchOpts) => void
}) {
  return (
    <ListEditor
      label={`数据行（${rows.length}）`}
      items={rows}
      onAdd={() => onChange([...rows, ['']])}
      onRemove={i => onChange(rows.filter((_, j) => j !== i))}
      onMove={(from, to) => {
        const next = [...rows]
        const [moved] = next.splice(from, 1)
        next.splice(to, 0, moved)
        onChange(next)
      }}
    >
      {i => (
        <TextInput
          value={rows[i].join(', ')}
          placeholder="单元格1, 单元格2, …（逗号分隔）"
          onChange={v =>
            onChange(
              rows.map((row, j) =>
                j === i ? v.split(/[,，]/).map(s => s.trim()) : row,
              ),
              { coalesce: true },
            )
          }
        />
      )}
    </ListEditor>
  )
}

function ChartEditor({
  chart,
  onChange,
}: {
  chart: ChartSpec
  onChange: (chart: ChartSpec, opts?: SlidePatchOpts) => void
}) {
  return (
    <div className="flex flex-col gap-phi-sm rounded-lg border border-[var(--chrome-outline)] p-phi-sm bg-[var(--chrome-card)]">
      <Field label="图表类型">
        <Select
          value={chart.kind}
          options={[
            { value: 'bar', label: '柱状图' },
            { value: 'line', label: '折线图' },
            { value: 'pie', label: '饼图' },
          ]}
          onChange={kind => onChange({ ...chart, kind })}
        />
      </Field>
      <Field label="标签（逗号分隔）">
        <TextInput
          value={chart.labels.join(', ')}
          onChange={v =>
            onChange(
              { ...chart, labels: v.split(/[,，]/).map(s => s.trim()).filter(Boolean) },
              { coalesce: true },
            )
          }
        />
      </Field>
      <ListEditor
        label={`数据系列（${chart.series.length}）`}
        items={chart.series}
        onAdd={() =>
          onChange({ ...chart, series: [...chart.series, { name: '', data: chart.labels.map(() => 0) }] })
        }
        onRemove={i => onChange({ ...chart, series: chart.series.filter((_, j) => j !== i) })}
        onMove={(from, to) => {
          const series = [...chart.series]
          const [moved] = series.splice(from, 1)
          series.splice(to, 0, moved)
          onChange({ ...chart, series })
        }}
      >
        {i => (
          <div className="flex flex-col gap-phi-xs">
            <TextInput
              value={chart.series[i].name}
              placeholder="系列名"
              onChange={v =>
                onChange(
                  {
                    ...chart,
                    series: chart.series.map((s, j) => (j === i ? { ...s, name: v } : s)),
                  },
                  { coalesce: true },
                )
              }
            />
            <TextInput
              value={chart.series[i].data.join(', ')}
              placeholder="数据（逗号分隔数字）"
              onChange={v =>
                onChange(
                  {
                    ...chart,
                    series: chart.series.map((s, j) =>
                      j === i
                        ? { ...s, data: v.split(/[,，]/).map(x => Number(x.trim()) || 0) }
                        : s,
                    ),
                  },
                  { coalesce: true },
                )
              }
            />
          </div>
        )}
      </ListEditor>
    </div>
  )
}
