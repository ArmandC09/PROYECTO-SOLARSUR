// Minimal IndexedDB helper for storing small assets (dataURLs)
export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('solarsur-db', 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets')
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function setAsset(key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('assets', 'readwrite')
    const store = tx.objectStore('assets')
    const req = store.put(value, key)
    req.onsuccess = () => { resolve(true); db.close() }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

export async function getAsset(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('assets', 'readonly')
    const store = tx.objectStore('assets')
    const req = store.get(key)
    req.onsuccess = () => { resolve(req.result); db.close() }
    req.onerror = () => { reject(req.error); db.close() }
  })
}

export async function deleteAsset(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('assets', 'readwrite')
    const store = tx.objectStore('assets')
    const req = store.delete(key)
    req.onsuccess = () => { resolve(true); db.close() }
    req.onerror = () => { reject(req.error); db.close() }
  })
}
