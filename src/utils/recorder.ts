export interface Recorder {
  start: () => Promise<void>
  stop: () => Promise<Blob>
  isSupported: boolean
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

/** 混音：TTS 系统音频无法直接捕获，此实现捕获麦克风（可选）+ 屏幕 */
export function createRecorder(): Recorder {
  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getDisplayMedia &&
    typeof MediaRecorder !== 'undefined'

  let recorder: MediaRecorder | null = null
  let chunks: Blob[] = []
  let stream: MediaStream | null = null

  const start = async () => {
    if (!supported) throw new Error('此浏览器不支持屏幕录制（需要 getDisplayMedia）')
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: 30 },
      audio: true,
    })
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

  return { start, stop, isSupported: supported }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
