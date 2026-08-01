export type ParsedLeaseFields = {
  tenant_name?: string
  lease_start?: string
  lease_end?: string
  status?: 'active' | 'expired'
}

import { getPdfJs } from './pdfJsSetup'
import { extractEmbeddedJpegs, ocrImageSource } from './leaseOcr'

const MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
}

/** Pages most likely to contain tenant name and lease dates (1-based). */
const OCR_PAGE_PRIORITY = [1, 4, 5, 2, 3, 6, 7, 8, 9, 10]

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function toIsoDate(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${y}-${pad2(m)}-${pad2(d)}`
}

function parseNumericDate(a: string, b: string, c: string): string | null {
  const n1 = Number(a)
  const n2 = Number(b)
  const n3 = Number(c)
  if (n3 >= 1000) {
    if (n1 > 12) return toIsoDate(n3, n2, n1)
    if (n2 > 12) return toIsoDate(n3, n1, n2)
    return toIsoDate(n3, n2, n1)
  }
  if (n1 >= 1000) return toIsoDate(n1, n2, n3)
  return null
}

function parseTextDate(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, ' ')
  const numeric = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (numeric) {
    let y = Number(numeric[3])
    if (y < 100) y += 2000
    return parseNumericDate(numeric[1], numeric[2], String(y))
  }
  const iso = t.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/)
  if (iso) return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const ddMonYyyy = t.match(/^(\d{1,2})[-\s/]([A-Za-z]{3,9})[-\s/](\d{4})$/i)
  if (ddMonYyyy) {
    const m = MONTHS[ddMonYyyy[2].toLowerCase()]
    if (m) return toIsoDate(Number(ddMonYyyy[3]), m, Number(ddMonYyyy[1]))
  }

  const words = t.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/i)
  if (words) {
    const m = MONTHS[words[2].toLowerCase()]
    if (m) return toIsoDate(Number(words[3]), m, Number(words[1]))
  }
  return null
}

function extractDates(text: string): string[] {
  const found = new Set<string>()
  const patterns = [
    /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/g,
    /\b(\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2})\b/g,
    /\b(\d{1,2}[-\s][A-Za-z]{3,9}[-\s]\d{4})\b/g,
    /\b(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\s+\d{4})\b/gi,
  ]
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const iso = parseTextDate(match[1])
      if (iso) found.add(iso)
    }
  }
  return [...found].sort()
}

function titleCaseName(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .map((part) => {
      if (part.length <= 2 && part.endsWith('.')) return part
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join(' ')
}

function cleanName(raw: string): string {
  const cleaned = raw
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[^A-Za-z\s.']/g, '')
    .trim()
    .slice(0, 80)
  if (/^[A-Z\s.']+$/.test(cleaned) && cleaned.length > 4) return titleCaseName(cleaned)
  return cleaned
}

function isLikelyPersonName(name: string): boolean {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length < 2 || parts.length > 5) return false
  if (name.length < 5 || name.length > 60) return false
  return parts.every((p) => /^[A-Za-z'.]{2,}$/.test(p))
}

function extractTenantName(text: string): string | undefined {
  const patterns = [
    /Second\s+Party\s*[:\-]?\s*([A-Z][A-Z\s.']{2,60})/,
    /(?:Purchased\s+by|Stamp\s+Duty\s+Paid\s+By)\s*[:\-]?\s*([A-Z][A-Z\s.']{2,60})/,
    /(?:Lessee|LESSEE|Licensee|Tenant|Occupant)(?:\s+name)?\s*[:\-]\s*(?:Sh\.?\s*)?([A-Za-z][A-Za-z\s.']{2,70})/i,
    /(?:name of (?:the )?(?:tenant|lessee|licensee|occupant))\s*[:\-]\s*([A-Za-z][A-Za-z\s.']{2,70})/i,
    /Sh\.?\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/,
    /(?:ANURAG|Anurag)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/i,
  ]
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (m?.[1]) {
      const name = cleanName(m[1])
      if (isLikelyPersonName(name)) return name
    }
  }
  return undefined
}

function extractDateRange(text: string): { start?: string; end?: string } {
  const rangePatterns = [
    /(?:from|commencing|commencement|start(?:ing)?|valid from|lease period)[^\d]{0,50}(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}[-\s][A-Za-z]{3,9}[-\s]\d{4}).{0,60}?(?:to|until|upto|up to|till|ending|expiry|expires?)[^\d]{0,30}(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}[-\s][A-Za-z]{3,9}[-\s]\d{4})/is,
    /(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\s*[–\-—]\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/gi,
    /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})\s*[–\-—to]+\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4})/gi,
  ]

  for (const pattern of rangePatterns) {
    const matches = [...text.matchAll(pattern)]
    for (const match of matches) {
      const start = parseTextDate(match[1])
      const end = parseTextDate(match[2])
      if (start && end && start <= end) return { start, end }
    }
  }

  const commencement = text.match(
    /(?:commencement|commencing|start date|lease start)[^\d]{0,40}(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}[-\s][A-Za-z]{3,9}[-\s]\d{4})/i
  )
  const expiry = text.match(
    /(?:expiry|expires|expiration|end date|lease end|valid till|valid until)[^\d]{0,40}(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]{3,9}\s+\d{4}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}[-\s][A-Za-z]{3,9}[-\s]\d{4})/i
  )
  const start = commencement?.[1] ? parseTextDate(commencement[1]) : undefined
  const end = expiry?.[1] ? parseTextDate(expiry[1]) : undefined
  if (start && end) return { start, end }

  return {}
}

export function resolveLeaseStatus(lease_end?: string): 'active' | 'expired' {
  if (!lease_end) return 'active'
  const end = new Date(`${lease_end}T23:59:59`)
  if (Number.isNaN(end.getTime())) return 'active'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return end >= today ? 'active' : 'expired'
}

export function parseLeaseFromText(text: string): ParsedLeaseFields {
  const normalized = text.replace(/\u00a0/g, ' ')
  const range = extractDateRange(normalized)
  const dates = extractDates(normalized)
  const tenant_name = extractTenantName(normalized)

  let lease_start = range.start
  let lease_end = range.end

  if (!lease_start && dates.length >= 1) lease_start = dates[0]
  if (!lease_end && dates.length >= 2) lease_end = dates[dates.length - 1]

  if (lease_start && lease_end && lease_start > lease_end) {
    ;[lease_start, lease_end] = [lease_end, lease_start]
  }

  const status = lease_end ? resolveLeaseStatus(lease_end) : undefined

  return {
    tenant_name,
    lease_start,
    lease_end,
    status,
  }
}

export function parseLeaseFromFileName(fileName: string): ParsedLeaseFields {
  const base = fileName.replace(/\.[^.]+$/i, '').replace(/[_-]+/g, ' ').trim()
  const cleaned = base.replace(/^lease\s*/i, '').replace(/^\d+\s*/, '').trim()
  if (cleaned.length >= 5) {
    const name = titleCaseName(cleaned)
    if (isLikelyPersonName(name)) return { tenant_name: name }
  }
  return {}
}

export function mergeParsedLeaseFields(
  current: ParsedLeaseFields,
  parsed: ParsedLeaseFields
): ParsedLeaseFields {
  const lease_end = parsed.lease_end || current.lease_end
  return {
    tenant_name: parsed.tenant_name || current.tenant_name,
    lease_start: parsed.lease_start || current.lease_start,
    lease_end,
    status: parsed.status || (lease_end ? resolveLeaseStatus(lease_end) : current.status),
  }
}

function isUsableParse(result: ParsedLeaseFields): boolean {
  return Boolean(result.tenant_name && result.lease_start && result.lease_end)
}

async function ocrPageImages(
  images: Blob[],
  pageOrder: number[],
  totalPages: number,
  onProgress: ((msg: string) => void) | undefined,
  initialBest: ParsedLeaseFields
): Promise<{ text: string; best: ParsedLeaseFields }> {
  let combined = ''
  let best = initialBest

  for (const pageIndex of pageOrder) {
    if (pageIndex >= images.length) continue
    onProgress?.(`Reading page ${pageIndex + 1} of ${totalPages}…`)
    try {
      const pageText = await ocrImageSource(images[pageIndex])
      if (pageText.trim()) {
        combined += `\n${pageText}`
        best = mergeParsedLeaseFields(best, parseLeaseFromText(pageText))
        if (isUsableParse(best)) break
      }
    } catch (err) {
      console.warn(`OCR failed for page ${pageIndex + 1}`, err)
    }
  }

  return { text: combined, best }
}

async function extractPdfTextLayer(doc: import('pdfjs-dist').PDFDocumentProxy): Promise<string> {
  const parts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    parts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
  }
  return parts.join('\n')
}

async function ocrPdfPageRender(
  doc: import('pdfjs-dist').PDFDocumentProxy,
  pageNum: number
): Promise<string> {
  const page = await doc.getPage(pageNum)
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  await page.render({ canvasContext: ctx, viewport, canvas }).promise

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9))
  if (!blob) return ''
  return ocrImageSource(blob)
}

async function extractPdfText(file: File, onProgress?: (msg: string) => void): Promise<string> {
  const buffer = await file.arrayBuffer()
  const embeddedImages = extractEmbeddedJpegs(buffer)
  let combined = ''
  let best: ParsedLeaseFields = {}

  if (embeddedImages.length > 0) {
    onProgress?.('Scanned PDF detected — reading pages…')
    const pageOrder = OCR_PAGE_PRIORITY.map((p) => p - 1).filter((i) => i >= 0 && i < embeddedImages.length)
    const extra = embeddedImages.map((_, i) => i).filter((i) => !pageOrder.includes(i)).slice(0, 4)
    const result = await ocrPageImages(
      embeddedImages,
      [...pageOrder, ...extra],
      embeddedImages.length,
      onProgress,
      best
    )
    combined = result.text
    best = result.best
    if (isUsableParse(best)) return combined
  }

  try {
    const pdfjs = await getPdfJs()
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise
    const textLayer = await extractPdfTextLayer(doc)
    combined += `\n${textLayer}`
    best = mergeParsedLeaseFields(best, parseLeaseFromText(textLayer))

    if (textLayer.replace(/\s/g, '').length >= 80) return combined
    if (isUsableParse(best)) return combined

    onProgress?.('Reading PDF pages…')
    const pages = OCR_PAGE_PRIORITY.filter((p) => p <= doc.numPages)
    for (const pageNum of pages) {
      onProgress?.(`Reading page ${pageNum} of ${doc.numPages}…`)
      try {
        const pageText = await ocrPdfPageRender(doc, pageNum)
        if (pageText.trim()) {
          combined += `\n${pageText}`
          best = mergeParsedLeaseFields(best, parseLeaseFromText(pageText))
          if (isUsableParse(best)) break
        }
      } catch (err) {
        console.warn(`PDF render OCR failed for page ${pageNum}`, err)
      }
    }
  } catch (err) {
    console.warn('PDF.js extraction failed', err)
  }

  return combined
}

async function extractImageText(file: File): Promise<string> {
  return ocrImageSource(file)
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value || ''
}

export async function extractTextFromLeaseFile(
  file: File,
  onProgress?: (msg: string) => void
): Promise<string> {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractPdfText(file, onProgress)
  }
  if (type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(name)) {
    return extractImageText(file)
  }
  if (
    type.includes('wordprocessingml') ||
    type === 'application/msword' ||
    name.endsWith('.docx') ||
    name.endsWith('.doc')
  ) {
    if (name.endsWith('.doc') && type === 'application/msword') {
      throw new Error('Old .doc files cannot be read automatically. Please upload PDF, DOCX, or a photo.')
    }
    return extractDocxText(file)
  }
  throw new Error('Unsupported file type. Upload PDF, DOCX, JPG, PNG, or WEBP.')
}

export async function parseLeaseFromFile(
  file: File,
  onProgress?: (msg: string) => void
): Promise<ParsedLeaseFields> {
  let parsed = parseLeaseFromFileName(file.name)

  try {
    const text = await extractTextFromLeaseFile(file, onProgress)
    parsed = mergeParsedLeaseFields(parsed, parseLeaseFromText(text))
  } catch (err) {
    console.warn('Lease text extraction failed:', err)
  }

  if (parsed.lease_end && !parsed.status) {
    parsed.status = resolveLeaseStatus(parsed.lease_end)
  }
  return parsed
}

export const LEASE_FILE_ACCEPT =
  '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp'
