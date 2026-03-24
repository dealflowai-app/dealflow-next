import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { logger } from '@/lib/logger'

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()

    if (!code || typeof code !== 'string' || code.length !== 6) {
      return NextResponse.json({ error: 'Please enter a 6-digit code' }, { status: 400 })
    }

    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!profile.phoneOtp || !profile.phoneOtpExpires) {
      return NextResponse.json({ error: 'No verification code pending. Request a new one.' }, { status: 400 })
    }

    // Check expiry
    if (new Date() > new Date(profile.phoneOtpExpires)) {
      await prisma.profile.update({
        where: { userId: user.id },
        data: { phoneOtp: null, phoneOtpExpires: null },
      })
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 })
    }

    // Compare hashed OTP (constant-time comparison)
    const hashedInput = hashOTP(code)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(hashedInput, 'hex'),
      Buffer.from(profile.phoneOtp, 'hex'),
    )

    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })
    }

    // Mark phone as verified, clear OTP
    await prisma.profile.update({
      where: { userId: user.id },
      data: {
        phoneVerified: true,
        phoneOtp: null,
        phoneOtpExpires: null,
      },
    })

    // Also set in Supabase user_metadata so middleware can check without DB
    await supabase.auth.updateUser({
      data: { phone_verified: true, phone: profile.phone },
    })

    return NextResponse.json({ verified: true })
  } catch (err) {
    logger.error('Verify OTP error', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
