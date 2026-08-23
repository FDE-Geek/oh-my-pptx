import { createContext, useContext } from 'react'
import { getDeckConfig } from '../deck'
import type { PPTConfig } from '../types'

/**
 * 渲染期 deck 上下文：缩略图/预览用编辑器 liveDoc，
 * 放映态回退 getDeckConfig()（preview > 数据块 > config.ts）。
 */
export const DeckContext = createContext<PPTConfig | null>(null)

export function useDeck(): PPTConfig {
  return useContext(DeckContext) ?? getDeckConfig()
}
