import { NextRequest, NextResponse } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) {
    return NextResponse.json({ error }, { status })
  }

  const settings = (profile.settings as Record<string, any>) || {}

  return NextResponse.json({
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    email: profile.email || '',
    phone: profile.phone || '',
    company: profile.company || '',
    avatarUrl: profile.avatarUrl || null,
    timezone: settings.timezone || 'America/New_York',
    markets: settings.markets || [],
    companyType: settings.companyType || '',
    yearsInBusiness: settings.yearsInBusiness || '',
    dealsPerMonth: settings.dealsPerMonth || '',
    website: settings.website || '',
  })
}

export async function PATCH(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) {
    return NextResponse.json({ error }, { status })
  }

  const body = await req.json()

  // Separate top-level profile columns from settings JSON fields
  const profileFields: Record<string, any> = {}
  const settingsFields: Record<string, any> = {}

  if (body.firstName !== undefined) profileFields.firstName = body.firstName
  if (body.lastName !== undefined) profileFields.lastName = body.lastName
  if (body.phone !== undefined) profileFields.phone = body.phone
  if (body.company !== undefined) profileFields.company = body.company

  // These go into the settings JSON
  if (body.timezone !== undefined) settingsFields.timezone = body.timezone
  if (body.markets !== undefined) settingsFields.markets = body.markets
  if (body.companyType !== undefined) settingsFields.companyType = body.companyType
  if (body.yearsInBusiness !== undefined) settingsFields.yearsInBusiness = body.yearsInBusiness
  if (body.dealsPerMonth !== undefined) settingsFields.dealsPerMonth = body.dealsPerMonth
  if (body.website !== undefined) settingsFields.website = body.website

  // Merge settings with existing settings
  if (Object.keys(settingsFields).length > 0) {
    const existingSettings = (profile.settings as Record<string, any>) || {}
    profileFields.settings = { ...existingSettings, ...settingsFields }
  }

  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data: profileFields,
  })

  const updatedSettings = (updated.settings as Record<string, any>) || {}

  return NextResponse.json({
    firstName: updated.firstName || '',
    lastName: updated.lastName || '',
    email: updated.email || '',
    phone: updated.phone || '',
    company: updated.company || '',
    avatarUrl: updated.avatarUrl || null,
    timezone: updatedSettings.timezone || 'America/New_York',
    markets: updatedSettings.markets || [],
    companyType: updatedSettings.companyType || '',
    yearsInBusiness: updatedSettings.yearsInBusiness || '',
    dealsPerMonth: updatedSettings.dealsPerMonth || '',
    website: updatedSettings.website || '',
  })
}
