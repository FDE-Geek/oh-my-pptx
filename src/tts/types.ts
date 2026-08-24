/**
 * TTS Provider 抽象：系统 speechSynthesis / Edge TTS / 云端 API 可切换。
 *
 * 浏览器侧（放映）：
 *   - SystemTtsProvider：现有 speechSynthesis 实现（缺省，零依赖）
 *   - 预生成音频（narrationAudio）优先于任何 Provider——CLI 预生成路线的
 *     音频文件走 AudioMixer 混入录制流，不经此抽象
 *
 * Node 侧（CLI 预生成）：
 *   - EdgeTtsProvider：微软 neural 音色（免费公网 WebSocket，生成 MP3）
 *   - OpenAiCompatProvider：任意 OpenAI 兼容 /v1/audio/speech 端点
 */

export type TtsProviderId = 'system' | 'edge' | 'openai-compat'

export interface TtsSegment {
  text: string
  /** 输出文件名（相对输出目录，含扩展名）。 */
  file: string
}

export interface TtsRequest {
  segments: TtsSegment[]
  /** 音色（provider 各自的命名体系）。 */
  voice: string
  /** 语速（1 = 常速；provider 各自换算）。 */
  rate?: number
  /** 输出目录（Node 端）。 */
  outDir?: string
}

export interface TtsResult {
  /** 成功生成的文件列表（相对 outDir）。 */
  files: string[]
  /** 失败项与原因。 */
  errors: { file: string; reason: string }[]
}

export interface TtsProvider {
  id: TtsProviderId
  name: string
  /** 该 provider 可用（浏览器端探测 API / Node 端探测网络）。 */
  isAvailable(): Promise<boolean>
  /** Node CLI：批量合成音频文件。浏览器端返回错误。 */
  synthesize(request: TtsRequest): Promise<TtsResult>
  /** 浏览器端音色清单（静态注册）。 */
  voices?: { id: string; name: string; lang: string }[]
}

/* ── 系统内置（浏览器放映用，保持现有行为） ─────────────────── */

export class SystemTtsProvider implements TtsProvider {
  id = 'system' as const
  name = '系统 TTS（speechSynthesis）'

  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  async synthesize(): Promise<TtsResult> {
    return { files: [], errors: [{ file: '*', reason: '系统 TTS 不支持文件合成，用 Edge/云端 Provider 或浏览器内播放' }] }
  }
}

/* ── 注册表 ─────────────────────────────────────────────────── */

const registry = new Map<TtsProviderId, TtsProvider>()

export function registerTtsProvider(provider: TtsProvider) {
  registry.set(provider.id, provider)
}

export function getTtsProvider(id: TtsProviderId): TtsProvider | undefined {
  return registry.get(id)
}

export function listTtsProviders(): TtsProvider[] {
  return [...registry.values()]
}

registerTtsProvider(new SystemTtsProvider())
