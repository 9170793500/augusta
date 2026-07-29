export type ParsedLeaseFields = {
  tenant_name?: string
  lease_start?: string
  lease_end?: string
}

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

  const words = t.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/i)
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
    /\b(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})\b/g,
  ]
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const iso = parseTextDate(match[1])
      if (iso) found.add(iso)
    }
  }
  return [...found].sort()
}

function cleanName(raw: string): string {
  return raw
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/[^A-Za-z\s.']/g, '')
    .trim()
    .slice(0, 80)
}

function extractTenantName(text: string): string | undefined {
  const patterns = [
    /(?:tenant|lessee|licensee|occupant)(?:\s+name)?\s*[:\-]\s*([A-Za-z][A-Za-z\s.']{2,70})/i,
    /(?:name of (?:the )?(?:tenant|lessee|licensee))\s*[:\-]\s*([A-Za-z][A-Za-z\s.']{2,70})/i,
    /(?:between|and)\s+([A-Z][A-Za-z\s.']{2,50})\s+(?:tenant|lessee)/i,
  ]
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (m?.[1]) {
      const name = cleanName(m[1])
      if (name.length >= 3) return name
    }
  }
  return undefined
}

function extractDateRange(text: string): { start?: string; end?: string } {
  const range = text.match(
    /(?:from|commencing|start(?:ing)?|valid from)\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}).{0,40}?(?:to|until|upto|up to|till|ending|expires?)\s*[:\-]?\s*([0-9]{1,2}[\/\-.][0-9]{1,2}[\/\-.][0-9]{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/is
  )
  if (range) {
    const start = parseTextDate(range[1])
    const end = parseTextDate(range[2])
    if (start && end) return { start, end }
  }
  return {}
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

  return {
    tenant_name,
    lease_start,
    lease_end,
  }
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

  const data = new Uint8Array(await file.arrayBuffer())
  const doc = await pdfjs.getDocument({ data }).promise
  const parts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    parts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
  }
  return parts.join('\n')
}

async function extractImageText(file: File): Promise<string> {
  const Tesseract = await import('tesseract.js')
  const { data } = await Tesseract.recognize(file, 'eng', { logger: () => {} })
  return data.text || ''
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value || ''
}

export async function extractTextFromLeaseFile(file: File): Promise<string> {
  const type = file.type.toLowerCase()
  const name = file.name.toLowerCase()

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractPdfText(file)
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

export const LEASE_FILE_ACCEPT =
  '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp'
