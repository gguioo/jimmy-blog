// 工具函数：时间格式化

export function relTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const m = Math.floor((Date.now() - d.getTime()) / 60000)
  if (m < 1) return '刚刚'
  if (m < 60) return m + '分钟'
  const h = Math.floor(m / 60)
  if (h < 24) return h + '小时'
  const day = Math.floor(h / 24)
  if (day < 30) return day + '天'
  return fmtDate(iso).slice(0, 10).replace(/-/g, '/')
}

// 本地时间 YYYY-MM-DD HH:mm
export function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
