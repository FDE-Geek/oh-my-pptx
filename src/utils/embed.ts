/**
 * 嵌入模式参数（iframe 场景）：?embed=1&start=N&autoplay=1&loop=1
 * embed 隐藏全部 UI（右键菜单/翻页钮/进度条/页码），只留画面；
 * autoplay 到末页自动回到 start 页循环或停止；loop=1 循环。
 *
 * frame 模式（HyperFrames composition 逐页 iframe）：
 * ?embed=1&start=N&frame=1 —— 锁定单页（禁键盘/自动逻辑），供逐帧 seek 渲染。
 */
export interface EmbedOptions {
  embed: boolean
  start: number
  autoplay: boolean
  loop: boolean
  /** 单页锁定模式：HyperFrames 逐页 iframe 用。 */
  frame: boolean
}

export function readEmbedParams(): EmbedOptions {
  const params = new URLSearchParams(window.location.search)
  return {
    embed: params.has('embed'),
    start: Math.max(1, Number(params.get('start') ?? 1) || 1),
    autoplay: params.has('autoplay'),
    loop: params.has('loop'),
    frame: params.has('frame'),
  }
}
