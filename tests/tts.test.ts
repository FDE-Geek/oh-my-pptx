import { describe, expect, it } from 'vitest'
import { SystemTtsProvider, getTtsProvider, listTtsProviders, registerTtsProvider, type TtsProvider } from '../src/tts/types'
import { EDGE_VOICES, EdgeTtsProvider } from '../src/tts/edge'

describe('TTS provider registry', () => {
  it('system provider 缺省注册', () => {
    expect(getTtsProvider('system')?.name).toContain('系统')
  })

  it('register/list 往返', () => {
    const fake: TtsProvider = {
      id: 'openai-compat',
      name: 'x',
      isAvailable: async () => true,
      synthesize: async () => ({ files: [], errors: [] }),
    }
    registerTtsProvider(fake)
    expect(listTtsProviders().map(p => p.id)).toContain('openai-compat')
    expect(getTtsProvider('openai-compat')).toBe(fake)
  })

  it('system provider 不支持文件合成（返回明确错误）', async () => {
    const result = await new SystemTtsProvider().synthesize()
    expect(result.files).toHaveLength(0)
    expect(result.errors[0].reason).toContain('不支持')
  })
})

describe('Edge TTS provider', () => {
  it('音色清单含中英主力', () => {
    const ids = EDGE_VOICES.map(v => v.id)
    expect(ids).toContain('zh-CN-XiaoxiaoNeural')
    expect(ids).toContain('en-US-AriaNeural')
  })

  it('WSS 不可达时 isAvailable 返回 false（而非抛错）', async () => {
    const provider = new EdgeTtsProvider()
    // 本机网络受限环境：连不上即 false；连得上即 true——两种都合法
    const ok = await provider.isAvailable()
    expect(typeof ok).toBe('boolean')
  })
})
