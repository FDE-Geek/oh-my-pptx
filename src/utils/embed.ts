/**
 * 嵌入模式参数（iframe 场景）：?embed=1&start=N&autoplay=1&loop=1
 * embed 隐藏全部 UI（右键菜单/翻页钮/进度条/页码），只留画面；
 * autoplay 到末页自动回到 start 页循环或停止；loop=1 循环。
 */
export interface EmbedOptions {
  embed: boolean
  start: number
  autoplay: boolean
  loop: boolean
}

export function readEmbedParams(): EmbedOptions {
  const params = new URLSearchParams(window.location.search)
  return {
    embed: params.has('embed'),
    start: Math.max(1, Number(params.get('start') ?? 1) || 1),
    autoplay: params.has('autoplay'),
    loop: params.has('loop'),
  }
}
