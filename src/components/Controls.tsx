import { ChevronLeft, ChevronRight, Maximize } from 'lucide-react'
import { toggleFullscreen } from '../hooks/useDeck'

export function Controls({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  const buttonClass =
    'rounded-full bg-[var(--chrome-card)] p-phi-sm text-[var(--chrome-sfg)] transition-colors duration-200 hover:text-[var(--chrome-accent)]'

  return (
    <div className="absolute right-lg bottom-lg flex items-center gap-phi-sm">
      <button onClick={onPrev} aria-label="previous slide" className={buttonClass}>
        <ChevronLeft size={18} />
      </button>
      <button onClick={onNext} aria-label="next slide" className={buttonClass}>
        <ChevronRight size={18} />
      </button>
      <button onClick={toggleFullscreen} aria-label="fullscreen" className={buttonClass}>
        <Maximize size={16} />
      </button>
    </div>
  )
}
