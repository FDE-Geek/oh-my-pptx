import { Kicker } from './Heading'

/** 页眉面包屑：走 kicker token（与「章节 / 目录」同一套）。 */
export function SlideTag({ tag }: { tag?: string }) {
  if (!tag) return null
  return <Kicker>{tag}</Kicker>
}
