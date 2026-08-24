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
} from '../../types'
import { Field, TextInput, TextArea, Select, Toggle, ListEditor } from './Controls'
import { DiagramCanvas } from './DiagramCanvas'

const TRANSITION_OPTIONS = [
  { value: 'fade', label: '淡入（默认）' },
  { value: 'slide', label: '滑动' },
  { value: 'zoom', label: '缩放' },
  { value: 'none', label: '无' },
] as const

export function SlideForm({
  slide,
  onChange,
}: {
  slide: Slide
  onChange: (patch: Partial<Slide>) => void
}) {
  return (
    <div className="flex flex-col gap-phi-md">
      <Field label="页型">
        <span className="rounded-md bg-accent/15 px-phi-sm py-phi-xs text-sm text-accent">
          {slide.type}
        </span>
      </Field>

      <SwitchByType slide={slide} onChange={onChange} />

      <div className="my-phi-xs h-px bg-outline" />

      <TextArea
        value={slide.notes ?? ''}
        rows={2}
        placeholder="演讲者备注（Speaker 视图显示）"
        onChange={v => onChange({ notes: v || undefined })}
      />
      <TextArea
        value={slide.narration ?? ''}
        rows={2}
        placeholder="TTS 旁白文本（缺省自动拼接）"
        onChange={v => onChange({ narration: v || undefined })}
      />
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
}: {
  slide: Slide
  onChange: (patch: Partial<Slide>) => void
}) {
  switch (slide.type) {
    case 'cover':
    case 'section':
    case 'end':
      return (
        <>
          <Field label="标题">
            <TextInput value={slide.title} onChange={v => onChange({ title: v })} />
          </Field>
          <Field label="副标题">
            <TextInput
              value={slide.subtitle ?? ''}
              onChange={v => onChange({ subtitle: v || undefined })}
            />
          </Field>
        </>
      )
    case 'content': {
      const content = slide as ContentSlide
      return (
        <>
          <Field label="标题">
            <TextInput value={content.title} onChange={v => onChange({ title: v })} />
          </Field>
          <BulletsEditor
            bullets={content.bullets ?? []}
            onChange={bullets => onChange({ bullets })}
          />
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
            <TextInput value={two.title} onChange={v => onChange({ title: v })} />
          </Field>
          <ColumnEditor
            label="左列"
            column={two.left}
            onChange={left => onChange({ left })}
          />
          <ColumnEditor
            label="右列"
            column={two.right}
            onChange={right => onChange({ right })}
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
              onChange={v => onChange({ quote: v })}
            />
          </Field>
          <Field label="署名">
            <TextInput
              value={quote.author ?? ''}
              onChange={v => onChange({ author: v || undefined })}
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
            <TextInput value={code.title} onChange={v => onChange({ title: v })} />
          </Field>
          <Field label="文件名（窗口标题）">
            <TextInput
              value={code.filename ?? ''}
              onChange={v => onChange({ filename: v || undefined })}
            />
          </Field>
          <Field label="语言">
            <TextInput
              value={code.language ?? ''}
              placeholder="js / ts / py / bash"
              onChange={v => onChange({ language: v || undefined })}
            />
          </Field>
          <Field label="代码">
            <TextArea
              value={code.code}
              rows={10}
              onChange={v => onChange({ code: v })}
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
            <TextInput value={image.title} onChange={v => onChange({ title: v })} />
          </Field>
          <Field label="图片地址（src）">
            <TextInput value={image.src} onChange={v => onChange({ src: v })} />
          </Field>
          <Field label="说明文字">
            <TextInput
              value={image.caption ?? ''}
              onChange={v => onChange({ caption: v || undefined })}
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
            <TextInput value={table.title} onChange={v => onChange({ title: v })} />
          </Field>
          <Field label="表头（逗号分隔）">
            <TextInput
              value={table.headers.join(', ')}
              onChange={v =>
                onChange({ headers: v.split(/[,，]/).map(s => s.trim()).filter(Boolean) })
              }
            />
          </Field>
          <TableRowsEditor rows={table.rows} onChange={rows => onChange({ rows })} />
        </>
      )
    }
    case 'chart': {
      const chart = slide as ChartSlide
      return (
        <>
          <Field label="标题">
            <TextInput value={chart.title} onChange={v => onChange({ title: v })} />
          </Field>
          <ChartEditor chart={chart.chart} onChange={next => onChange({ chart: next })} />
        </>
      )
    }
    case 'diagram': {
      const diagram = slide as DiagramSlide
      return (
        <>
          <Field label="标题">
            <TextInput value={diagram.title} onChange={v => onChange({ title: v })} />
          </Field>
          <DiagramCanvas
            spec={diagram.diagram}
            onChange={next => onChange({ diagram: next })}
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
  onChange: (bullets: string[]) => void
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
          onChange={v => onChange(bullets.map((b, j) => (j === i ? v : b)))}
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
  onChange: (column: ColumnContent) => void
}) {
  return (
    <div className="rounded-lg border border-outline p-phi-sm">
      <p className="mb-phi-sm text-xs font-semibold text-accent">{label}</p>
      <div className="flex flex-col gap-phi-sm">
        <Field label="列标题">
          <TextInput
            value={column.title ?? ''}
            onChange={v => onChange({ ...column, title: v || undefined })}
          />
        </Field>
        <BulletsEditor
          bullets={column.bullets ?? []}
          onChange={bullets => onChange({ ...column, bullets })}
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
  onChange: (rows: string[][]) => void
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
  onChange: (chart: ChartSpec) => void
}) {
  return (
    <div className="flex flex-col gap-phi-sm rounded-lg border border-outline p-phi-sm">
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
            onChange({ ...chart, labels: v.split(/[,，]/).map(s => s.trim()).filter(Boolean) })
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
                onChange({
                  ...chart,
                  series: chart.series.map((s, j) => (j === i ? { ...s, name: v } : s)),
                })
              }
            />
            <TextInput
              value={chart.series[i].data.join(', ')}
              placeholder="数据（逗号分隔数字）"
              onChange={v =>
                onChange({
                  ...chart,
                  series: chart.series.map((s, j) =>
                    j === i
                      ? { ...s, data: v.split(/[,，]/).map(x => Number(x.trim()) || 0) }
                      : s,
                  ),
                })
              }
            />
          </div>
        )}
      </ListEditor>
    </div>
  )
}
