/**
 * AudioMixer：把本地音频源（TTS 之外的音频文件/合成音）混入 MediaStream。
 * 用途：录制成片时把旁白音频轨道送进录制流（系统 TTS 无法被
 * getDisplayMedia 捕获时，可改用音频文件轨道走此混入）。
 *
 * 原理：AudioContext → MediaStreamDestination 产出一条本地音频轨道，
 * 与屏幕视频轨合成新的 MediaStream 交给 MediaRecorder。
 */
export class AudioMixer {
  private context: AudioContext | null = null
  private destination: MediaStreamAudioDestinationNode | null = null
  private bufferSources = new Set<AudioBufferSourceNode>()
  private elementSources = new Set<MediaElementAudioSourceNode>()

  /** 惰性创建；成功返回混合轨道所在的 MediaStream。 */
  ensure(): MediaStream | null {
    try {
      this.context ??= new AudioContext()
      this.destination ??= this.context.createMediaStreamDestination()
      return this.destination.stream
    } catch {
      return null
    }
  }

  /** 混入一个音频文件（blob URL / 普通 URL）；返回停止函数。 */
  async mixUrl(url: string, opts?: { loop?: boolean; volume?: number }): Promise<() => void> {
    const stream = this.ensure()
    if (!stream || !this.context || !this.destination) return () => {}
    const response = await fetch(url)
    const raw = await response.arrayBuffer()
    const buffer = await this.context.decodeAudioData(raw)
    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.loop = opts?.loop === true
    const gain = this.context.createGain()
    gain.gain.value = opts?.volume ?? 1
    source.connect(gain).connect(this.destination)
    source.start()
    this.bufferSources.add(source)
    return () => {
      try {
        source.stop()
      } catch {
        /* already stopped */
      }
      this.bufferSources.delete(source)
    }
  }

  /** 混入一个 <audio> 元素（如外部 TTS 播放器）；返回断开函数。 */
  mixElement(element: HTMLAudioElement, volume = 1): () => void {
    const stream = this.ensure()
    if (!stream || !this.context || !this.destination) return () => {}
    const source = this.context.createMediaElementSource(element)
    const gain = this.context.createGain()
    gain.gain.value = volume
    source.connect(gain).connect(this.destination)
    this.elementSources.add(source)
    return () => {
      source.disconnect()
      this.elementSources.delete(source)
    }
  }

  /** 混入另一条 MediaStream 的音频轨（如捕获的系统音频）。 */
  mixStreamTrack(track: MediaStreamTrack, volume = 1): boolean {
    const stream = this.ensure()
    if (!stream || !this.context || !this.destination) return false
    const external = new MediaStream([track])
    const source = this.context.createMediaStreamSource(external)
    const gain = this.context.createGain()
    gain.gain.value = volume
    source.connect(gain).connect(this.destination)
    return true
  }

  get mixedStream(): MediaStream | null {
    return this.destination?.stream ?? null
  }

  dispose() {
    for (const source of this.bufferSources) {
      try {
        source.stop()
      } catch {
        /* ignore */
      }
    }
    this.bufferSources.clear()
    for (const source of this.elementSources) source.disconnect()
    this.elementSources.clear()
    this.destination?.disconnect()
    this.destination = null
    void this.context?.close().catch(() => {})
    this.context = null
  }
}

/**
 * 组合录制流：屏幕视频轨 + （可选）屏幕音频轨 + 混音轨 → 单一 MediaStream。
 * 混音轨存在时优先用混音（包含全部已混入源）；否则用屏幕自带音频。
 */
export function combineStreams(
  screen: MediaStream,
  mixer: AudioMixer | null,
): MediaStream {
  const combined = new MediaStream()
  for (const track of screen.getVideoTracks()) combined.addTrack(track)
  const mixed = mixer?.mixedStream
  if (mixed && mixed.getAudioTracks().length > 0) {
    for (const track of mixed.getAudioTracks()) combined.addTrack(track)
  } else {
    for (const track of screen.getAudioTracks()) combined.addTrack(track)
  }
  return combined
}
