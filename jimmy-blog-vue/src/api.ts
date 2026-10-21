// API 层：同源的 Worker 直接读 D1 / R2，返回 JSON，失败抛错

// 会话内数据记忆：每个地址第一次拉到的结果存起来，
// 再访问时立即用缓存渲染（不用等网络），同时后台悄悄刷新一次给下次用
const memo = new Map<string, any>()

export function api(path: string): Promise<any> {
  const hit = memo.get(path)
  if (hit) {
    fetch(path, { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((fresh) => {
        if (fresh) memo.set(path, fresh)
      })
      .catch(() => {})
    return Promise.resolve(hit)
  }
  return fetch(path, { headers: { Accept: 'application/json' } })
    .then((r) => {
      if (!r.ok) throw new Error('HTTP ' + r.status)
      return r.json()
    })
    .then((data) => {
      memo.set(path, data)
      return data
    })
}
