import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const BUCKET = 'listing-photos'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']

// Use service-role key if available; fall back to anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// ─── POST /api/marketplace/upload ───────────────────────────────────────────
// Upload one or more photos for a marketplace listing.
// Accepts multipart/form-data with file(s) under the "photos" field.
// Returns { urls: string[] }

export async function POST(req: NextRequest) {
  try {
    const { profile, error, status } = await getAuthProfile()
    if (!profile) return NextResponse.json({ error }, { status })

    const formData = await req.formData()
    const files = formData.getAll('photos') as File[]

    if (!files.length) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 photos per upload' }, { status: 400 })
    }

    // Validate each file
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, HEIC` },
          { status: 400 },
        )
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 5 MB limit` },
          { status: 400 },
        )
      }
    }

    // Try Supabase Storage
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      // Ensure bucket exists (idempotent)
      await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ALLOWED_TYPES,
      })

      const urls: string[] = []

      for (const file of files) {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${profile.id}/${randomUUID()}.${ext}`
        const buffer = Buffer.from(await file.arrayBuffer())

        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, buffer, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadErr) {
          console.error('Supabase upload error:', uploadErr)
          return NextResponse.json(
            { error: `Upload failed for ${file.name}: ${uploadErr.message}` },
            { status: 500 },
          )
        }

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
        urls.push(urlData.publicUrl)
      }

      return NextResponse.json({ urls })
    }

    // Fallback: convert to data URLs (demo only — not for production)
    const urls: string[] = []
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      urls.push(`data:${file.type};base64,${base64}`)
    }

    return NextResponse.json({ urls })
  } catch (err) {
    console.error('POST /api/marketplace/upload error:', err)
    return NextResponse.json(
      { error: 'Upload failed', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
