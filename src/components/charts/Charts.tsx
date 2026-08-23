import type { ChartSpec } from '../../types'

const SERIES_COLORS = ['#61b0f1', '#c678dd', '#98c379', '#e5c07b', '#e06c75', '#56b6c2']

function niceMax(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  return Math.ceil(value / magnitude) * magnitude
}

export function BarChart({ chart }: { chart: ChartSpec }) {
  const width = 640
  const height = 360
  const padding = { top: 20, right: 20, bottom: 40, left: 48 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom
  const groupCount = chart.labels.length
  const seriesCount = chart.series.length
  const max = niceMax(Math.max(...chart.series.flatMap(s => s.data), 0))
  const groupW = plotW / groupCount
  const barW = (groupW * 0.72) / seriesCount

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <g key={t}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + plotH * t}
            y2={padding.top + plotH * t}
            stroke="currentColor"
            strokeOpacity="0.12"
          />
          <text
            x={padding.left - 8}
            y={padding.top + plotH * t + 4}
            textAnchor="end"
            fontSize="11"
            fill="currentColor"
            fillOpacity="0.55"
          >
            {Math.round(max * (1 - t))}
          </text>
        </g>
      ))}
      {chart.series.map((series, si) =>
        series.data.map((value, i) => {
          const barH = (value / max) * plotH
          const x = padding.left + i * groupW + groupW * 0.14 + si * barW
          return (
            <rect
              key={`${series.name}-${i}`}
              x={x}
              y={padding.top + plotH - barH}
              width={barW - 2}
              height={barH}
              rx="3"
              fill={SERIES_COLORS[si % SERIES_COLORS.length]}
            >
              <title>{`${series.name}: ${value}`}</title>
            </rect>
          )
        }),
      )}
      {chart.labels.map((label, i) => (
        <text
          key={label}
          x={padding.left + i * groupW + groupW / 2}
          y={height - padding.bottom + 18}
          textAnchor="middle"
          fontSize="12"
          fill="currentColor"
          fillOpacity="0.7"
        >
          {label}
        </text>
      ))}
    </svg>
  )
}

export function LineChart({ chart }: { chart: ChartSpec }) {
  const width = 640
  const height = 360
  const padding = { top: 20, right: 20, bottom: 40, left: 48 }
  const plotW = width - padding.left - padding.right
  const plotH = height - padding.top - padding.bottom
  const count = chart.labels.length
  const max = niceMax(Math.max(...chart.series.flatMap(s => s.data), 0))
  const stepX = count > 1 ? plotW / (count - 1) : 0

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      {[0, 0.25, 0.5, 0.75, 1].map(t => (
        <g key={t}>
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + plotH * t}
            y2={padding.top + plotH * t}
            stroke="currentColor"
            strokeOpacity="0.12"
          />
          <text
            x={padding.left - 8}
            y={padding.top + plotH * t + 4}
            textAnchor="end"
            fontSize="11"
            fill="currentColor"
            fillOpacity="0.55"
          >
            {Math.round(max * (1 - t))}
          </text>
        </g>
      ))}
      {chart.series.map((series, si) => {
        const points = series.data.map((value, i) => [
          padding.left + i * stepX,
          padding.top + plotH - (value / max) * plotH,
        ])
        const path = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
        const color = SERIES_COLORS[si % SERIES_COLORS.length]
        return (
          <g key={series.name}>
            <path d={path} fill="none" stroke={color} strokeWidth="2.5" />
            {points.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="4" fill={color}>
                <title>{`${series.name}: ${series.data[i]}`}</title>
              </circle>
            ))}
          </g>
        )
      })}
      {chart.labels.map((label, i) => (
        <text
          key={label}
          x={padding.left + i * stepX}
          y={height - padding.bottom + 18}
          textAnchor="middle"
          fontSize="12"
          fill="currentColor"
          fillOpacity="0.7"
        >
          {label}
        </text>
      ))}
    </svg>
  )
}

export function PieChart({ chart }: { chart: ChartSpec }) {
  const series = chart.series[0]
  if (!series) return null
  const total = series.data.reduce((sum, v) => sum + v, 0) || 1
  const radius = 130
  const cx = 180
  const cy = 180

  let angle = -Math.PI / 2
  const arcs = series.data.map((value, i) => {
    const sweep = (value / total) * Math.PI * 2
    const x1 = cx + radius * Math.cos(angle)
    const y1 = cy + radius * Math.sin(angle)
    angle += sweep
    const x2 = cx + radius * Math.cos(angle)
    const y2 = cy + radius * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    const path =
      sweep >= Math.PI * 2 - 0.001
        ? `M ${cx - radius} ${cy} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`
    return { path, color: SERIES_COLORS[i % SERIES_COLORS.length], label: chart.labels[i], value }
  })

  return (
    <div className="flex h-full w-full items-center justify-center gap-10">
      <svg viewBox="0 0 360 360" className="h-[320px] w-[320px]">
        {arcs.map(arc => (
          <path key={arc.label} d={arc.path} fill={arc.color} stroke="var(--bg)" strokeWidth="2">
            <title>{`${arc.label}: ${arc.value}`}</title>
          </path>
        ))}
      </svg>
      <ul className="flex flex-col gap-3">
        {arcs.map(arc => (
          <li key={arc.label} className="flex items-center gap-3 text-lg">
            <span
              className="h-3 w-3 shrink-0 rounded-[4px]"
              style={{ backgroundColor: arc.color }}
            />
            <span className="text-sfg">{arc.label}</span>
            <span className="font-medium tabular-nums">{arc.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Chart({ chart }: { chart: ChartSpec }) {
  switch (chart.kind) {
    case 'bar':
      return <BarChart chart={chart} />
    case 'line':
      return <LineChart chart={chart} />
    case 'pie':
      return <PieChart chart={chart} />
  }
}
