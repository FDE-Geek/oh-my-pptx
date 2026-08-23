import type { NarrationConfig, Slide } from '../types'

export function defaultNarration(slide: Slide): string {
  const parts: string[] = []
  if (slide.type !== 'quote') parts.push(slide.title)
  switch (slide.type) {
    case 'cover':
    case 'section':
    case 'end':
      if (slide.subtitle) parts.push(slide.subtitle)
      break
    case 'content':
      parts.push(...(slide.bullets ?? []))
      break
    case 'two-column':
      for (const column of [slide.left, slide.right]) {
        if (column.title) parts.push(column.title)
        parts.push(...(column.bullets ?? []))
      }
      break
    case 'quote':
      parts.push(slide.quote)
      if (slide.author) parts.push(slide.author)
      break
    case 'table':
      parts.push(...(slide.rows.flat()))
      break
  }
  return parts.join('。')
}

export function slideNarration(slide: Slide): string {
  return slide.narration ?? defaultNarration(slide)
}

export interface Narrator {
  speak: (text: string) => Promise<void>
  stop: () => void
  voices: SpeechSynthesisVoice[]
}

export function createNarrator(config: NarrationConfig): Narrator {
  const synth = window.speechSynthesis
  const voices = synth ? synth.getVoices().filter(v => v.lang.startsWith(config.lang)) : []

  const pickVoice = (): SpeechSynthesisVoice | undefined => {
    if (config.voiceName) {
      const found = voices.find(v => v.name === config.voiceName)
      if (found) return found
    }
    return voices[0]
  }

  return {
    voices,
    speak: text =>
      new Promise(resolve => {
        if (!synth || !text) {
          resolve()
          return
        }
        synth.cancel()
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = config.lang
        utterance.rate = config.rate
        const voice = pickVoice()
        if (voice) utterance.voice = voice
        utterance.onend = () => resolve()
        utterance.onerror = () => resolve()
        synth.speak(utterance)
      }),
    stop: () => synth?.cancel(),
  }
}
