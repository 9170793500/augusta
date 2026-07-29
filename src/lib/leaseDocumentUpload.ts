import { supabase } from './supabase'

const BUCKET = 'lease-documents'

function safeSegment(value: string) {
  return value.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 40) || 'flat'
}

export async function uploadLeaseDocument(file: File, apartmentNo: string): Promise<string> {
  const apt = apartmentNo.trim().toUpperCase()
  if (!apt) throw new Error('Apartment number is required before uploading a lease document.')

  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'bin'
  const path = `${safeSegment(apt)}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
