import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) {
    return NextResponse.json({ error }, { status })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File must be under 5MB' }, { status: 400 })
  }

  const supabase = await createClient()

  // Generate a unique filename
  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${profile.id}/${Date.now()}.${ext}`

  // Upload to Supabase Storage
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    logger.error('Avatar upload error', { error: uploadError instanceof Error ? uploadError.message : String(uploadError) })
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    )
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName)

  const avatarUrl = urlData.publicUrl

  // Update profile in database
  await prisma.profile.update({
    where: { id: profile.id },
    data: { avatarUrl },
  })

  return NextResponse.json({ avatarUrl })
}
