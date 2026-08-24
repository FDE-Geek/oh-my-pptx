import type { CodeSlide } from '../../types'
import { highlight } from '../../utils/highlight'
import { SlideTag } from './SlideTag'
import { Heading } from './Heading'

export function Code({ slide }: { slide: CodeSlide }) {
  return (
    <div className="slide-enter mx-auto flex w-full max-w-4xl flex-col items-center gap-phi-2xl">
      <header className="flex flex-col items-center gap-phi-sm">
        <SlideTag tag={slide.tag} />
        <Heading level={3} className="text-center">{slide.title}</Heading>
      </header>
      <div className="w-full overflow-hidden rounded-xl bg-[#282c34] shadow-lg">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <span className="ml-2 text-sm text-white/50">
            {slide.filename ?? slide.language ?? 'code'}
          </span>
        </div>
        <pre className="overflow-x-auto p-5 text-left text-base leading-relaxed text-[#abb2bf]">
          <code>{highlight(slide.code)}</code>
        </pre>
      </div>
    </div>
  )
}
