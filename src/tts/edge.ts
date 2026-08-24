/**
 * Edge TTS Provider（Node 端）：微软 Edge 浏览器"大声朗读"同源的 neural 语音。
 * 免费公网 WebSocket（wss://speech.platform.bing.com…），输出 MP3。
 *
 * 协议要点（社区逆向，与 msedge-speaktts 等实现一致）：
 *   1. wss 连接 + Sec-MS-GEC token（可缺省，服务端宽容）
 *   2. 发 config 消息（output-format=audio-24khz-48kbitrate-mono-mp3）
 *   3. 发 ssml 消息；按 turn.start / response / turn.end 分片收二进制音频
 *
 * 依赖：Node 22 原生 WebSocket（globalThis.WebSocket）。
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { TtsProvider, TtsRequest, TtsResult } from './types'

const WSS_URL =
  'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4'


/** 常用音色（完整列表可运行 voices() 拉取）。 */
export const EDGE_VOICES = [
  { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓（女·温暖）', lang: 'zh-CN' },
  { id: 'zh-CN-YunxiNeural', name: '云希（男·阳光）', lang: 'zh-CN' },
  { id: 'zh-CN-YunjianNeural', name: '云健（男·浑厚）', lang: 'zh-CN' },
  { id: 'zh-CN-XiaoyiNeural', name: '晓伊（女·活泼）', lang: 'zh-CN' },
  { id: 'zh-TW-HsiaoChenNeural', name: '曉臻（女·台普）', lang: 'zh-TW' },
  { id: 'en-US-AriaNeural', name: 'Aria（女·美音）', lang: 'en-US' },
  { id: 'en-US-GuyNeural', name: 'Guy（男·美音）', lang: 'en-US' },
  { id: 'en-US-JennyNeural', name: 'Jenny（女·亲切）', lang: 'en-US' },
] as const

function dateToString(): string {
  return new Date().toUTCString().replace('GMT', 'GMT+0000 (Coordinated Universal Time)')
}

function ssml(text: string, voice: string, rate: number): string {
  const ratePercent = `${Math.round((rate - 1) * 100)+100}%` // rate 1 → +0%
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='zh-CN'>` +
    `<voice name='${voice}'><prosody rate='${ratePercent}'>${escapeXml(text)}</prosody></voice>` +
    `</speak>`
  )
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

interface SynthesizeOne {
  text: string
  voice: string
  rate: number
}

/** 单段合成：返回 MP3 二进制。 */
async function synthesizeOne({ text, voice, rate }: SynthesizeOne): Promise<Buffer> {
  const WebSocketImpl = (globalThis as unknown as { WebSocket?: typeof WebSocket }).WebSocket
  if (!WebSocketImpl) throw new Error('Node 22+ 原生 WebSocket 不可用')

  return new Promise<Buffer>((resolvePromise, reject) => {
    const ws = new WebSocketImpl(`${WSS_URL}&ConnectionId=${crypto.randomUUID().replace(/-/g, '')}`)
    const chunks: Buffer[] = []
    let settled = false

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        try { ws.close() } catch { /* ignore */ }
        reject(new Error('Edge TTS 超时（15s）——检查网络是否能访问 speech.platform.bing.com'))
      }
    }, 15000)

    ws.binaryType = 'arraybuffer'

    ws.onopen = () => {
      ws.send(
        `X-Timestamp:${dateToString()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
                  outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
                },
              },
            },
          }),
      )
      const payload = `X-RequestId:${crypto.randomUUID().replace(/-/g, '')}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${dateToString()}Z\r\nPath:ssml\r\n\r\n${ssml(text, voice, rate)}`
      ws.send(payload)
    }

    ws.onmessage = (event: MessageEvent) => {
      const data = event.data
      if (typeof data === 'string') {
        if (data.includes('Path:turn.end')) {
          settled = true
          clearTimeout(timeout)
          try { ws.close() } catch { /* ignore */ }
          resolvePromise(Buffer.concat(chunks))
        }
        return
      }
      // 二进制帧：头两字节为大端长度，其后才是音频
      const buf = Buffer.from(data as ArrayBuffer)
      const headerLen = buf.readUInt16BE(0)
      chunks.push(buf.subarray(2 + headerLen))
    }

    ws.onerror = () => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        reject(new Error('Edge TTS WebSocket 连接失败'))
      }
    }

    ws.onclose = () => {
      if (!settled) {
        settled = true
        clearTimeout(timeout)
        reject(new Error('Edge TTS 连接提前关闭'))
      }
    }
  })
}

export class EdgeTtsProvider implements TtsProvider {
  id = 'edge' as const
  name = 'Edge TTS（微软 neural，免费）'
  voices = [...EDGE_VOICES]

  async isAvailable(): Promise<boolean> {
    try {
      await synthesizeOne({ text: '测', voice: 'zh-CN-XiaoxiaoNeural', rate: 1 })
      return true
    } catch {
      return false
    }
  }

  async synthesize(request: TtsRequest): Promise<TtsResult> {
    const outDir = resolve(request.outDir ?? 'assets/narration')
    mkdirSync(outDir, { recursive: true })
    const files: string[] = []
    const errors: { file: string; reason: string }[] = []

    for (const segment of request.segments) {
      try {
        const audio = await synthesizeOne({
          text: segment.text,
          voice: request.voice,
          rate: request.rate ?? 1,
        })
        if (audio.length < 1024) {
          errors.push({ file: segment.file, reason: '返回音频过短（可能被限流）' })
          continue
        }
        writeFileSync(resolve(outDir, segment.file), audio)
        files.push(segment.file)
      } catch (e) {
        errors.push({ file: segment.file, reason: e instanceof Error ? e.message : String(e) })
      }
    }

    return { files, errors }
  }
}
