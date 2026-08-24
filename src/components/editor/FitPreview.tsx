import { useEffect, useRef, useState } from 'react'
import type { Slide } from '../../types'
import { SlideRenderer } from '../SlideRenderer'

/** 预览按容器自适应；点阵底 + 舞台投影沿用 bento/slides 画布气质。 */
export function FitPreview({
  slide,
  onPresent,
}: {
  slide: Slide
  onPresent?: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.4)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const fit = () => {
      const { clientWidth, clientHeight } = el
      setScale(Math.min((clientWidth - 48) / 960, (clientHeight - 48) / 540, 1))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <section ref={box} className="ed-canvas-wrap flex items-center justify-center">
      <div className="ed-stage" style={{ width: 960 * scale, height: 540 * scale }}>
        <div className="origin-top-left" style={{ width: 960, height: 540, transform: `scale(${scale})` }}>
          <div className="flex h-[540px] w-[960px] items-center px-phi-3xl">
            <SlideRenderer slide={slide} transition="none" />
          </div>
        </div>
      </div>
      {onPresent && (
        <button type="button" className="ed-btn ed-btn-primary ed-present-pill" onClick={onPresent} title="回到放映（Esc）">
          放映
        </button>
      )}
      <div className="ed-zoombar" title="预览按画布自适应">{Math.round(scale * 100)}%</div>
    </section>
  )
}
