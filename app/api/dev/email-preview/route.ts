/**
 * DEV ONLY — Email Template Preview
 *
 * GET /api/dev/email-preview?template=welcome
 *
 * Returns rendered HTML for any email template with sample data.
 * Only available in development mode.
 */

import { NextRequest, NextResponse } from 'next/server'
import { formatWelcomeEmail } from '@/lib/emails/system'
import { formatDealMatchEmail, formatInquiryEmail, formatOfferEmail, formatCampaignReportEmail } from '@/lib/emails/system'
import { formatDealBlastEmail } from '@/lib/emails/deal-blast'
import {
  formatContractSentEmail,
  formatContractViewedEmail,
  formatContractSignedEmail,
  formatContractExecutedEmail,
  formatContractVoidedEmail,
} from '@/lib/emails/contract-notifications'

const SAMPLE_DATA = {
  welcome: () => formatWelcomeEmail({ firstName: 'Marcus' }),

  'deal-blast': () => ({
    subject: 'New Deal: 742 Evergreen Terrace',
    html: formatDealBlastEmail(
      {
        address: '742 Evergreen Terrace',
        city: 'Springfield',
        state: 'IL',
        zip: '62704',
        propertyType: 'SFR',
        beds: 4,
        baths: 2,
        sqft: 2200,
        yearBuilt: 1985,
        condition: 'fair',
        askingPrice: 185000,
        arv: 310000,
        repairCost: 45000,
        assignFee: 15000,
        flipProfit: 65000,
        rentalCashFlow: 450,
        closeByDate: 'April 15, 2026',
        wholesalerName: 'Marcus Thompson',
        wholesalerCompany: 'Thompson Wholesale Group',
        wholesalerEmail: 'marcus@thompsonwholesale.com',
        wholesalerPhone: '(555) 123-4567',
      },
      { firstName: 'David', lastName: 'Chen', entityName: null },
      87,
    ),
  }),

  'deal-match': () => formatDealMatchEmail({
    buyerName: 'David Chen',
    propertyAddress: '1500 Oak Avenue',
    city: 'Dallas',
    state: 'TX',
    zip: '75201',
    propertyType: 'SFR',
    askingPrice: 220000,
    arv: 340000,
    matchScore: 92,
    dealId: 'sample-deal-id',
    wholesalerName: 'Marcus Thompson',
    wholesalerEmail: 'marcus@example.com',
  }),

  inquiry: () => formatInquiryEmail({
    wholesalerName: 'Marcus Thompson',
    buyerName: 'Sarah Williams',
    buyerEmail: 'sarah@investorgroup.com',
    buyerPhone: '(555) 987-6543',
    propertyAddress: '320 Maple Drive',
    city: 'Houston',
    state: 'TX',
    listingPrice: 175000,
    message: 'Very interested in this property. Is the seller motivated? What\'s the timeline?',
    listingId: 'sample-listing-id',
  }),

  offer: () => formatOfferEmail({
    wholesalerName: 'Marcus Thompson',
    buyerName: 'David Chen',
    buyerEmail: 'david@chenproperties.com',
    propertyAddress: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'IL',
    askingPrice: 185000,
    offerAmount: 195000,
    arv: 310000,
    message: 'Ready to close quickly. Can do cash, no contingencies.',
    dealId: 'sample-deal-id',
  }),

  'campaign-report': () => formatCampaignReportEmail({
    wholesalerName: 'Marcus Thompson',
    campaignName: 'Dallas Cash Buyers Q1',
    totalContacted: 250,
    connected: 87,
    interested: 23,
    callbackRequested: 12,
    optedOut: 8,
    channel: 'AI Voice',
    duration: '2h 34m',
  }),

  'contract-sent': () => formatContractSentEmail({
    propertyAddress: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    buyerName: 'David Chen',
    buyerEmail: 'david@chenproperties.com',
    contractPrice: '$185,000',
    assignmentFee: '$15,000',
    earnestMoney: '$5,000',
    closingDate: 'April 15, 2026',
    titleCompany: 'First American Title',
    contractType: 'Assignment of Contract',
    wholesalerName: 'Marcus Thompson',
    wholesalerCompany: 'Thompson Wholesale Group',
    wholesalerEmail: 'marcus@thompsonwholesale.com',
    wholesalerPhone: '(555) 123-4567',
  }),

  'contract-viewed': () => formatContractViewedEmail({
    propertyAddress: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    buyerName: 'David Chen',
    contractType: 'Assignment of Contract',
    wholesalerName: 'Marcus Thompson',
    wholesalerEmail: 'marcus@thompsonwholesale.com',
    sentAt: '2026-03-14T10:30:00Z',
    viewedAt: '2026-03-15T14:22:00Z',
  }),

  'contract-signed': () => formatContractSignedEmail({
    propertyAddress: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    buyerName: 'David Chen',
    contractPrice: '$185,000',
    contractType: 'Assignment of Contract',
    wholesalerName: 'Marcus Thompson',
    wholesalerEmail: 'marcus@thompsonwholesale.com',
    signedAt: '2026-03-15T16:45:00Z',
  }),

  'contract-executed': () => formatContractExecutedEmail(
    {
      propertyAddress: '742 Evergreen Terrace',
      city: 'Springfield',
      state: 'IL',
      zip: '62704',
      buyerName: 'David Chen',
      contractPrice: '$185,000',
      assignmentFee: '$15,000',
      closingDate: 'April 15, 2026',
      titleCompany: 'First American Title',
      contractType: 'Assignment of Contract',
      wholesalerName: 'Marcus Thompson',
      wholesalerCompany: 'Thompson Wholesale Group',
      wholesalerEmail: 'marcus@thompsonwholesale.com',
    },
    'wholesaler',
  ),

  'contract-voided': () => formatContractVoidedEmail({
    propertyAddress: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'IL',
    zip: '62704',
    buyerName: 'David Chen',
    contractType: 'Assignment of Contract',
    wholesalerName: 'Marcus Thompson',
    wholesalerCompany: 'Thompson Wholesale Group',
    wholesalerEmail: 'marcus@thompsonwholesale.com',
    wholesalerPhone: '(555) 123-4567',
    voidReason: 'Buyer failed to provide proof of funds within the agreed 48-hour window.',
  }),
} as const

type TemplateName = keyof typeof SAMPLE_DATA

export async function GET(req: NextRequest) {
  // Dev-only guard
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }

  const template = req.nextUrl.searchParams.get('template') as TemplateName | null

  // No template specified — show index page
  if (!template) {
    const templates = Object.keys(SAMPLE_DATA)
    const links = templates
      .map((t) => `<li style="margin:4px 0;"><a href="?template=${t}" style="color:#2563EB;font-size:15px;">${t}</a></li>`)
      .join('\n')

    return new NextResponse(
      `<!DOCTYPE html><html><head><title>Email Previews</title></head>
<body style="font-family:system-ui;max-width:600px;margin:40px auto;padding:0 16px;">
<h1 style="font-size:24px;color:#0B1224;">Email Template Previews</h1>
<p style="color:#6B7280;">Click a template to preview:</p>
<ul style="list-style:none;padding:0;">${links}</ul>
</body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  const builder = SAMPLE_DATA[template]
  if (!builder) {
    return NextResponse.json(
      { error: `Unknown template: ${template}`, available: Object.keys(SAMPLE_DATA) },
      { status: 400 },
    )
  }

  const result = builder()
  const html = 'html' in result ? result.html : ''

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
