import { createWorker, type Worker } from 'tesseract.js'

let workerPromise: Promise<Worker> | null = null

async function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker('eng', undefined, { logger: () => {} })
      return worker
    })()
  }
  return workerPromise
}

export async function ocrImageSource(source: Blob | File): Promise<string> {
  const worker = await getOcrWorker()
  const { data } = await worker.recognize(source)
  return data.text || ''
}

export async function terminateOcrWorker() {
  if (workerPromise) {
    const worker = await workerPromise
    await worker.terminate()
    workerPromise = null
  }
}

/** Pull embedded JPEG streams out of a scanned PDF (no PDF renderer needed). */
export function extractEmbeddedJpegs(buffer: ArrayBuffer, minSize = 50000): Blob[] {
  const bytes = new Uint8Array(buffer)
  const images: Blob[] = []

  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] !== 0xff || bytes[i + 1] !== 0xd8) continue

    let end = i + 2
    while (end < bytes.length - 1) {
      if (bytes[end] === 0xff && bytes[end + 1] === 0xd9) {
        end += 2
        break
      }
      end++
    }

    const slice = bytes.slice(i, end)
    if (slice.length >= minSize) {
      images.push(new Blob([slice], { type: 'image/jpeg' }))
    }
    i = end
  }

  return images
}
