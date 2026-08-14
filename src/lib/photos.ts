/**
 * ذخیرهٔ عکس‌های سفر در IndexedDB.
 *
 * چرا IndexedDB و نه `localStorage`: عکس باید به‌صورت Blob ذخیره شود.
 * تبدیلش به base64 حجم را یک‌سوم بیشتر می‌کند و سهمیهٔ چندمگابایتی
 * `localStorage` را با دو عکس پر می‌کند.
 *
 * هر عکس پیش از ذخیره کوچک می‌شود؛ عکس ۱۲ مگاپیکسلی گوشی برای دفترچهٔ سفر
 * لازم نیست و فقط فضا می‌گیرد.
 */

const DB_NAME = 'leadertrip-photos'
const STORE = 'photos'
const MAX_EDGE = 1280
const QUALITY = 0.82

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** بزرگ‌ترین ضلع را به MAX_EDGE می‌رساند و به JPEG فشرده می‌کند */
async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', QUALITY)
  })
}

export async function savePhoto(id: string, file: File): Promise<boolean> {
  try {
    const blob = await downscale(file)
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(blob, id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    return true
  } catch {
    return false
  }
}

export async function loadPhotoUrl(id: string): Promise<string | null> {
  try {
    const db = await openDb()
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(id)
      req.onsuccess = () => resolve(req.result as Blob | undefined)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return blob ? URL.createObjectURL(blob) : null
  } catch {
    return null
  }
}

export async function deletePhoto(id: string): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
    db.close()
  } catch {
    /* اگر پاک نشد، فقط چند کیلوبایت فضا هدر می‌رود */
  }
}
