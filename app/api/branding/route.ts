import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  const { profile } = await getAuthProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  return NextResponse.json({
    brandName: profile.brandName,
    brandLogoUrl: profile.brandLogoUrl,
    brandPrimaryColor: profile.brandPrimaryColor,
    brandAccentColor: profile.brandAccentColor,
    customDomain: profile.customDomain,
  })
}

export async function PATCH(req: NextRequest) {
  const { profile } = await getAuthProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check enterprise tier
  if (profile.tier !== 'enterprise') {
    return NextResponse.json({ error: 'White-label branding requires Enterprise plan' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { brandName, brandLogoUrl, brandPrimaryColor, brandAccentColor, customDomain } = body

    // Validate hex colors
    const hexRegex = /^#[0-9a-fA-F]{6}$/
    if (brandPrimaryColor && !hexRegex.test(brandPrimaryColor)) {
      return NextResponse.json({ error: 'Invalid primary color format (use #RRGGBB)' }, { status: 400 })
    }
    if (brandAccentColor && !hexRegex.test(brandAccentColor)) {
      return NextResponse.json({ error: 'Invalid accent color format (use #RRGGBB)' }, { status: 400 })
    }

    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: {
        ...(brandName !== undefined && { brandName: brandName || null }),
        ...(brandLogoUrl !== undefined && { brandLogoUrl: brandLogoUrl || null }),
        ...(brandPrimaryColor !== undefined && { brandPrimaryColor: brandPrimaryColor || null }),
        ...(brandAccentColor !== undefined && { brandAccentColor: brandAccentColor || null }),
        ...(customDomain !== undefined && { customDomain: customDomain || null }),
      },
    })

    return NextResponse.json({
      brandName: updated.brandName,
      brandLogoUrl: updated.brandLogoUrl,
      brandPrimaryColor: updated.brandPrimaryColor,
      brandAccentColor: updated.brandAccentColor,
      customDomain: updated.customDomain,
    })
  } catch (err) {
    logger.error('PATCH /api/branding error', { route: '/api/branding', error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to update branding' }, { status: 500 })
  }
}
