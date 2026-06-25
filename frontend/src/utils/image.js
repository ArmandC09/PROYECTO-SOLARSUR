export function resizeFileToDataURL(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Error reading file'))
    reader.onload = () => {
      // si el archivo cargado es un SVG, devuelve el dataURL original (conserva el vector y la transparencia)
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
          // clear para asegurar un fondo transparente
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          // Exporta siempre en PNG para preservar la transparencia (fondos de logotipos)
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
