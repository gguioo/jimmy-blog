// Jimmy Blog Worker：静态页面走 ASSETS，/api 直接读 D1，图片直接从 R2 出
// 后台在 /admin（页面）和 /admin/api/*（接口），代码在 admin.js / admin.html
// D1 `jy-blog`（feed / articles），R2 `jy-blog-feed`（/f/）、`jy-blog-article`（/a/）

import { admin } from './admin.js'

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  })

// 库里的图片地址统一换成本站路径 /f/<key>，图片由本 Worker 从 R2 读出
const localImg = (u) => {
  const m = String(u).match(/\/([fa])\/([\w.-]+)$/)
  return m ? `/${m[1]}/${m[2]}` : u
}

async function serveImg(bucket, key) {
  const obj = await bucket.get(key)
  if (!obj) return new Response('not found', { status: 404 })
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url)
    const p = url.pathname
    if (p === '/admin' || p === '/admin/') return admin.fetch(new Request(new URL('/admin', url), req), env)
    if (p.startsWith('/admin/api/')) return admin.fetch(new Request(new URL(p.slice(6) + url.search, url), req), env)
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('method not allowed', { status: 405 })

    if (p.startsWith('/f/')) return serveImg(env.FEED_IMG, p.slice(3))
    if (p.startsWith('/a/')) return serveImg(env.ART_IMG, p.slice(3))

    const db = env.DB
    if (p === '/api/feed') {
      const { results } = await db.prepare('SELECT id,text,photos,created_at FROM feed ORDER BY id DESC').all()
      return json({
        entries: results.map((r) => ({
          id: r.id,
          text: r.text || '',
          photos: JSON.parse(r.photos || '[]').map(localImg),
          created_at: r.created_at,
        })),
      })
    }
    if (p === '/api/profile') {
      const r = await db.prepare("SELECT value FROM settings WHERE key='avatar'").first().catch(() => null)
      return json({ avatar: r?.value ? `/f/${r.value}` : null })
    }
    if (p === '/api/posts') {
      const { results } = await db.prepare('SELECT id,title,created_at FROM articles ORDER BY id DESC').all()
      return json({ posts: results.map((r) => ({ slug: String(r.id), title: r.title, created_at: r.created_at })) })
    }
    const id = p.match(/^\/api\/posts\/(\d+)$/)?.[1]
    if (id) {
      const a = await db.prepare('SELECT id,title,html,created_at FROM articles WHERE id=?').bind(id).first()
      if (!a) return json({ error: 'not found' }, 404)
      return json({ slug: String(a.id), title: a.title, html: a.html, created_at: a.created_at })
    }
    if (p.startsWith('/api/')) return json({ error: 'not found' }, 404)

    return env.ASSETS.fetch(req)
  },
}
