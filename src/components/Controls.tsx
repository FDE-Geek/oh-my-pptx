import { ChevronLeft, ChevronRight, Maximize } from 'lucide-react'
import { toggleFullscreen } from '../hooks/useDeck'

export function Controls({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  const buttonClass =
    'rounded-full bg-[var(--chrome-card)] p-phi-sm text-[var(--chrome-sfg)] transition-colors duration-200 hover:text-[var(--chrome-accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--chrome-accent)]'

  return (
    <div className="absolute right-lg bottom-lg flex items-center gap-phi-sm">
      <button type="button" onClick={onPrev} aria-label="上一页" className={buttonClass}>
        <ChevronLeft size={18} />
      </button>
      <button type="button" onClick={onNext} aria-label="下一页" className={buttonClass}>
        <ChevronRight size={18} />
      </button>
      <button type="button" onClick={toggleFullscreen} aria-label="全屏" className={buttonClass}>
        <Maximize size={16} />
      </button>
    </div>
  )
}
