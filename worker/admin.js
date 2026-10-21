// 后台（原 jy-blog Worker 合并进来）: D1 (feed + articles), two R2 image hosts (FEED_IMG, ART_IMG), admin page.
import ADMIN from './admin.html';

const IMG_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

const cors = () => ({}); // 后台和博客同域，不需要跨域
const json = (req, data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(req) } });

const authed = (req, env) => req.headers.get('Authorization') === `Bearer ${env.ADMIN_TOKEN}`;

// image URL <-> bucket key: /f/<key> lives in FEED_IMG, /a/<key> in ART_IMG
const keysIn = (text, prefix) => [...String(text || '').matchAll(new RegExp(`/${prefix}/([\\w.-]+)`, 'g'))].map(m => m[1]);


async function upload(req, env, url, bucket, prefix, keyPrefix = '') {
  const file = (await req.formData()).get('file');
  if (!file || typeof file === 'string') return json(req, { error: 'no file' }, 400);
  let type = file.type;
  if (!IMG_TYPES.includes(type)) {
    // 手机有时不给类型或给 octet-stream：按文件头识别
    const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const hex = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    type = hex.startsWith('ffd8ff') ? 'image/jpeg' : hex.startsWith('89504e47') ? 'image/png'
      : hex.startsWith('47494638') ? 'image/gif' : (hex.startsWith('52494646') && hex.slice(16, 24) === '57454250') ? 'image/webp' : '';
    if (!type) return json(req, { error: '不支持的图片格式（' + (file.type || '未知') + '），请用 JPG/PNG/WebP' }, 400);
  }
  const ext = type.split('/')[1].replace('jpeg', 'jpg');
  const key = `${keyPrefix}${crypto.randomUUID()}.${ext}`;
  await bucket.put(key, file.stream(), { httpMetadata: { contentType: type } });
  return json(req, { url: `/${prefix}/${key}`, key });
}

async function serveImg(bucket, key) {
  const obj = await bucket.get(key);
  if (!obj) return new Response('not found', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export const admin = {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;
    const m = req.method;
    if (m === 'OPTIONS') return new Response(null, { headers: cors(req) });

    if (p === '/' || p === '/admin') return new Response(ADMIN, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    if (m === 'GET' && p.startsWith('/f/')) return serveImg(env.FEED_IMG, p.slice(3));
    if (m === 'GET' && p.startsWith('/a/')) return serveImg(env.ART_IMG, p.slice(3));

    const db = env.DB;
    try {
      // ---------- public reads ----------
      if (m === 'GET' && p === '/api/feed') {
        const { results } = await db.prepare('SELECT id,text,photos,created_at FROM feed ORDER BY created_at DESC').all();
        return json(req, results.map(r => ({ ...r, photos: JSON.parse(r.photos) })));
      }
      if (m === 'GET' && p === '/api/articles') {
        const { results } = await db.prepare('SELECT id,title,created_at FROM articles ORDER BY created_at DESC').all();
        return json(req, results);
      }
      // 头像：settings 表里 avatar = FEED_IMG 中的文件名
      if (m === 'GET' && p === '/api/profile') {
        const r = await db.prepare("SELECT value FROM settings WHERE key='avatar'").first();
        return json(req, { avatar: r?.value ? `/f/${r.value}` : null });
      }
      let id = p.match(/^\/api\/articles\/(\d+)$/)?.[1];
      if (m === 'GET' && id) {
        const a = await db.prepare('SELECT * FROM articles WHERE id=?').bind(id).first();
        return a ? json(req, a) : json(req, { error: 'not found' }, 404);
      }

      // ---------- admin ----------
      if (!p.startsWith('/api/')) return new Response('not found', { status: 404 });
      if (!authed(req, env)) return json(req, { error: 'unauthorized' }, 401);

      if (m === 'GET' && p === '/api/check') return json(req, { ok: true });
      if (m === 'POST' && p === '/api/upload/feed') return upload(req, env, url, env.FEED_IMG, 'f');

      // 换头像：传图到 FEED_IMG，记进 settings，删掉旧头像文件
      if (m === 'POST' && p === '/api/avatar') {
        const res = await upload(req, env, url, env.FEED_IMG, 'f', 'avatar-');
        if (!res.ok) return res;
        const d = await res.json();
        const old = await db.prepare("SELECT value FROM settings WHERE key='avatar'").first();
        await db.prepare("INSERT INTO settings (key,value) VALUES ('avatar',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(d.key).run();
        if (old?.value && old.value !== d.key) await env.FEED_IMG.delete(old.value);
        return json(req, { avatar: d.url });
      }

      // 清理死图：R2 里没被任何碎片/长文引用、且上传超过 1 小时的图片
      if (m === 'POST' && p === '/api/cleanup') {
        const feed = (await db.prepare('SELECT photos FROM feed').all()).results;
        const arts = (await db.prepare('SELECT cover,html FROM articles').all()).results;
        const usedF = new Set(feed.flatMap(r => keysIn(r.photos, 'f')));
        const av = await db.prepare("SELECT value FROM settings WHERE key='avatar'").first();
        if (av?.value) usedF.add(av.value); // 头像不算死图
        const usedA = new Set(arts.flatMap(r => keysIn(r.cover + ' ' + r.html, 'a')));
        const cutoff = Date.now() - 3600e3;
        const sweep = async (bucket, used) => {
          let cursor, dead = [];
          do {
            const l = await bucket.list({ cursor, limit: 1000 });
            for (const o of l.objects) if (!used.has(o.key) && o.uploaded.getTime() < cutoff) dead.push(o.key);
            cursor = l.truncated ? l.cursor : undefined;
          } while (cursor);
          for (let i = 0; i < dead.length; i += 1000) await bucket.delete(dead.slice(i, i + 1000));
          return dead.length;
        };
        return json(req, { ok: true, feed: await sweep(env.FEED_IMG, usedF), article: await sweep(env.ART_IMG, usedA) });
      }

      if (m === 'POST' && p === '/api/feed') {
        const { text = '', photos = [] } = await req.json();
        if (!text.trim() && !photos.length) return json(req, { error: 'empty' }, 400);
        const r = await db.prepare('INSERT INTO feed (text,photos,created_at) VALUES (?,?,?) RETURNING id')
          .bind(text.trim(), JSON.stringify(photos), new Date().toISOString()).first();
        return json(req, r, 201);
      }
      id = p.match(/^\/api\/feed\/(\d+)$/)?.[1];
      if (m === 'DELETE' && id) {
        const r = await db.prepare('DELETE FROM feed WHERE id=? RETURNING photos').bind(id).first();
        if (!r) return json(req, { error: 'not found' }, 404);
        const keys = keysIn(r.photos, 'f');
        if (keys.length) await env.FEED_IMG.delete(keys);
        return json(req, { ok: true, removedImages: keys.length });
      }

      if (m === 'POST' && p === '/api/articles') {
        const { title = '', html = '' } = await req.json();
        if (!title.trim() || !html.trim()) return json(req, { error: 'title and html required' }, 400);
        const r = await db.prepare('INSERT INTO articles (title,cover,html,excerpt,minutes,created_at) VALUES (?,?,?,?,?,?) RETURNING id')
          .bind(title.trim(), '', html, '', 0, new Date().toISOString()).first();
        return json(req, r, 201);
      }
      id = p.match(/^\/api\/articles\/(\d+)$/)?.[1];
      if (m === 'DELETE' && id) {
        const r = await db.prepare('DELETE FROM articles WHERE id=? RETURNING cover,html').bind(id).first();
        if (!r) return json(req, { error: 'not found' }, 404);
        const keys = [...new Set(keysIn(r.cover + ' ' + r.html, 'a'))];
        if (keys.length) await env.ART_IMG.delete(keys);
        return json(req, { ok: true, removedImages: keys.length });
      }
      return json(req, { error: 'not found' }, 404);
    } catch (e) {
      return json(req, { error: String(e.message || e) }, 500);
    }
  },
};
