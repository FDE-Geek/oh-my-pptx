export function ProgressBar({ current, total }: { current: number; total: number }) {
  const width = total > 0 ? ((current + 1) / total) * 100 : 0
  return (
    <div
      className="absolute inset-x-0 bottom-0 h-1 bg-[var(--chrome-outline)]/40"
      role="progressbar"
      aria-label="放映进度"
      aria-valuemin={1}
      aria-valuenow={current + 1}
      aria-valuemax={Math.max(total, 1)}
    >
      <div
        className="h-full bg-accent transition-all duration-300 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
