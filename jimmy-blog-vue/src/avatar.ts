// 头像：后台上传的头像（/api/profile）优先，没设置就用 public/img 里的默认图。
// 上次拿到的地址记在 localStorage，打开页面时先用它，避免闪一下旧头像。
import { ref } from 'vue'

const KEY = 'jb-avatar'
export const customAvatar = ref<string | null>(localStorage.getItem(KEY))

fetch('/api/profile')
  .then((r) => (r.ok ? r.json() : null))
  .then((d) => {
    if (!d) return
    customAvatar.value = d.avatar || null
    if (d.avatar) localStorage.setItem(KEY, d.avatar)
    else localStorage.removeItem(KEY)
  })
  .catch(() => {})

// 传入该位置的默认图，返回实际要显示的地址
export const avatarSrc = (fallback: string) => customAvatar.value || fallback
