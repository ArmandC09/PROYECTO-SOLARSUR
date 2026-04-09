export function resizeFileToDataURL(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Error reading file'))
    reader.onload = () => {
      // if the uploaded file is an SVG, return the original dataURL (preserve vector and transparency)
      if (file && file.type && file.type.toLowerCase().includes('svg')) {
        resolve(reader.result)
        return
      }

      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
          const ctx = canvas.getContext('2d', { alpha: true })
          // clear to ensure transparent background
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          // Always export PNG to preserve transparency (logo backgrounds)
          const mime = 'image/png'
          const dataUrl = canvas.toDataURL(mime)
        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error('Error decoding image'))
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
