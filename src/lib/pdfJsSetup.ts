import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

let pdfJsModule: typeof import('pdfjs-dist') | null = null

export async function getPdfJs() {
  if (!pdfJsModule) {
    pdfJsModule = await import('pdfjs-dist')
    pdfJsModule.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  }
  return pdfJsModule
}
