import { DECK_CHANNEL, type DeckMessage } from '../types'

const SYNC_KEY = 'oh-my-ppt:sync'

export interface DeckChannel {
  post: (message: DeckMessage) => void
  subscribe: (listener: (message: DeckMessage) => void) => () => void
  close: () => void
}

/**
 * 跨窗口同步：BroadcastChannel 为主，localStorage storage 事件兜底
 * （file:// 协议下 BroadcastChannel 可能隔离，storage 事件仍可跨同文档窗口工作）
 */
export function createDeckChannel(): DeckChannel {
  const listeners = new Set<(message: DeckMessage) => void>()

  let broadcast: BroadcastChannel | null = null
  try {
    broadcast = new BroadcastChannel(DECK_CHANNEL)
    broadcast.onmessage = (event: MessageEvent<DeckMessage>) => {
      if (event.data?.kind === 'goto') {
        listeners.forEach(listener => listener(event.data))
      }
    }
  } catch {
    broadcast = null
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== SYNC_KEY || !event.newValue) return
    try {
      const message = JSON.parse(event.newValue) as DeckMessage
      if (message?.kind === 'goto') {
        listeners.forEach(listener => listener(message))
      }
    } catch {
      /* ignore */
    }
  }
  window.addEventListener('storage', onStorage)

  return {
    post: message => {
      broadcast?.postMessage(message)
      try {
        localStorage.setItem(SYNC_KEY, JSON.stringify(message))
      } catch {
        /* file:// 或隐私模式下可能失败，BroadcastChannel 已尽力 */
      }
    },
    subscribe: listener => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    close: () => {
      broadcast?.close()
      window.removeEventListener('storage', onStorage)
      listeners.clear()
    },
  }
}
