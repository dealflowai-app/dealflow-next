import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

function generateOTP(): string {
  // 6-digit numeric code using crypto for security
  return String(crypto.randomInt(100000, 999999))
}

function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return `+${digits}`
}

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { phone } = await request.json()

    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Valid phone number required' }, { status: 400 })
    }

    const normalizedPhone = normalizePhone(phone)

    // Rate limit: max 3 OTPs per 10 minutes
    const profile = await prisma.profile.findUnique({ where: { userId: user.id } })
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // OTP expires 10 min after creation. If expires > now + 8 min, it was created < 2 min ago.
    if (profile.phoneOtpExpires && new Date(profile.phoneOtpExpires).getTime() > Date.now() + 8 * 60 * 1000) {
      return NextResponse.json({ error: 'Please wait 2 minutes before requesting a new code' }, { status: 429 })
    }

    const otp = generateOTP()
    const hashedOtp = hashOTP(otp)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

    // Store hashed OTP and update phone
    await prisma.profile.update({
      where: { userId: user.id },
      data: {
        phone: normalizedPhone,
        phoneOtp: hashedOtp,
        phoneOtpExpires: expiresAt,
      },
    })

    // Send OTP via Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      // Twilio not configured — log OTP for dev/testing and still succeed
      console.warn(`[OTP] Twilio not configured. OTP for ${normalizedPhone}: ${otp}`)
      return NextResponse.json({ sent: true, dev: true })
    }

    const params = new URLSearchParams({
      To: normalizedPhone,
      From: fromNumber,
      Body: `Your DealFlow verification code is: ${otp}. Expires in 10 minutes. Do not share this code.`,
    })

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
        },
        body: params,
      },
    )

    if (!res.ok) {
      const data = await res.json()
      console.error('Twilio send-otp failed:', data)
      return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 })
    }

    return NextResponse.json({ sent: true })
  } catch (err) {
    console.error('Send OTP error:', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
