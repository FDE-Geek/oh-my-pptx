import { AudioMixer, combineStreams } from './mixer'

export interface Recorder {
  start: () => Promise<void>
  stop: () => Promise<Blob>
  isSupported: boolean
  /** 录制期可用的混音器（混入旁白音频等）；未启动时为 null。 */
  mixer: AudioMixer | null
}

const VIDEO_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4',
]

function pickMime(): string | undefined {
  return VIDEO_MIME_CANDIDATES.find(mime =>
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime),
  )
}

/**
 * 录屏 + 混音：屏幕视频轨与 AudioMixer 输出的音频轨合成后交给 MediaRecorder。
 * 屏幕自带系统音频存在时也混入 mixer（如捕获标签页音频）。
 */
export function createRecorder(): Recorder {
  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getDisplayMedia &&
    typeof MediaRecorder !== 'undefined'

  let recorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  let stream: MediaStream | null = null
  const mixer = new AudioMixer()

  const start = async () => {
    if (!supported) throw new Error('此浏览器不支持屏幕录制（需要 getDisplayMedia）')
    const screen = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true,
    })
    // 屏幕音频轨（用户勾选共享音频时）混入 mixer，与旁白轨道合并
    for (const track of screen.getAudioTracks()) {
      mixer.mixStreamTrack(track)
    }
    stream = combineStreams(screen, mixer)
    stream.getVideoTracks()[0].addEventListener('ended', () => {
      recorder?.state === 'recording' && recorder.stop()
    })
    const mime = pickMime()
    recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
    chunks = []
    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    recorder.start(250)
  }

  const stop = () =>
    new Promise<Blob>(resolve => {
      const finish = () => {
        stream?.getTracks().forEach(track => track.stop())
        mixer.dispose()
        const blob = new Blob(chunks, { type: recorder?.mimeType ?? 'video/webm' })
        recorder = null
        stream = null
        resolve(blob)
      }
      if (!recorder || recorder.state === 'inactive') {
        finish()
        return
      }
      recorder.onstop = finish
      recorder.stop()
    })

  return { start, stop, isSupported: supported, mixer }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
