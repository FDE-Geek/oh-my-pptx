export function ProgressBar({ current, total }: { current: number; total: number }) {
  const width = total > 0 ? ((current + 1) / total) * 100 : 0
  return (
    <div className="absolute inset-x-0 bottom-0 h-1 bg-card">
      <div
        className="h-full bg-accent transition-all duration-300 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
