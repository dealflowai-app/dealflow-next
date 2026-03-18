// ─── Email Drip Service ─────────────────────────────────────────────────────
// SendGrid email integration for outreach campaigns with drip sequences.
// Reuses the existing email provider from lib/deal-outreach.ts.

import { logger } from '@/lib/logger'
import { getEmailSender } from '@/lib/deal-outreach'
import {
  wrapInEmailTemplate,
  emailButton,
  emailHeading,
  emailText,
  emailDivider,
  emailInfoRow,
  emailSpacer,
  emailBanner,
  brand,
} from '@/lib/emails'
import { prisma } from '@/lib/prisma'
import { mergeTemplate } from './sms-service'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EmailDripStep {
  dayOffset: number                // days after campaign start (0 = immediately)
  subject: string                  // with {{merge_fields}}
  bodyHtml: string                 // HTML with {{merge_fields}}
}

export interface EmailDripSequence {
  id: string
  name: string
  steps: EmailDripStep[]
  category: 'deal_alert' | 'qualification' | 'nurture' | 'reactivation'
}

export interface EmailSendResult {
  success: boolean
  messageId: string | null
  error?: string
}

// ─── Unsubscribe Link ───────────────────────────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dealflowai.app'

function unsubscribeFooter(email: string): string {
  const encoded = encodeURIComponent(email)
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
<tr><td align="center" style="padding:16px 0;border-top:1px solid ${brand.gray200};">
  <span style="font-family:${brand.font};font-size:11px;color:${brand.gray400};">
    You're receiving this because you're in our investor network.
    <a href="${APP_URL}/api/outreach/unsubscribe?email=${encoded}" style="color:${brand.gray400};text-decoration:underline;">Unsubscribe</a>
  </span>
</td></tr>
</table>`
}

// ─── Email Body Generators ──────────────────────────────────────────────────

function dealAlertBody(): string {
  return `${emailHeading('New Off-Market Deal Alert')}
${emailText('Hi {{buyerName}},')}
${emailText('{{agentName}} from {{companyName}} here. We just locked up a property that matches your buy box and wanted to give you first look before we send it to the full list.')}
${emailBanner('{{propertyType}} — {{dealAddress}}', 'info')}
${emailInfoRow('Asking Price', '{{askingPrice}}')}
${emailInfoRow('ARV', '{{arv}}')}
${emailInfoRow('Market', '{{market}}')}
${emailSpacer(8)}
${emailText('If the numbers work for you, reply to this email or give us a call. We can move fast on this one.')}
${emailButton('Reply — I\'m Interested', 'mailto:{{replyEmail}}?subject=Interested in {{dealAddress}}')}
${emailSpacer(8)}
${emailText('Talk soon,', { size: '13px' })}
${emailText('{{agentName}}, {{companyName}}', { size: '13px', color: brand.gray500 })}`
}

function qualificationStep1(): string {
  return `${emailHeading('Off-Market Deals in {{market}}')}
${emailText('Hi {{buyerName}},')}
${emailText('I\'m {{agentName}} from {{companyName}}. We source off-market investment properties in the {{market}} area and connect them with active cash buyers.')}
${emailText('I wanted to reach out because you\'ve purchased investment properties in this market, and we regularly come across deals that may fit your criteria.')}
${emailDivider()}
${emailText('<strong>Here\'s what we do:</strong>', { size: '15px', color: brand.navy })}
${emailText('• Source off-market properties below market value<br>• Match deals to buyers based on actual buy box criteria<br>• Send you only properties that fit — no spam, no fluff')}
${emailText('If you\'re still actively buying, reply with your current criteria and I\'ll make sure you\'re on the priority list.')}
${emailButton('Reply With My Criteria', 'mailto:{{replyEmail}}?subject=Buy Box Criteria - {{buyerName}}')}`
}

function qualificationStep2(): string {
  return `${emailHeading('What\'s Moving in {{market}}')}
${emailText('Hi {{buyerName}},')}
${emailText('{{agentName}} here from {{companyName}}. Wanted to share a quick market update for {{market}}:')}
${emailBanner('Investor activity is up — we\'re seeing strong demand for off-market SFR and multi-family properties in this area.', 'info')}
${emailText('We\'ve matched several buyers with deals in the last few weeks. If you\'re looking for specific property types or price ranges, I\'d love to hear what your ideal deal looks like.')}
${emailText('Just hit reply — it takes 30 seconds and ensures you get the right deals first.')}
${emailButton('Share My Buy Box', 'mailto:{{replyEmail}}?subject=My Buy Box - {{buyerName}}')}`
}

function qualificationStep3(): string {
  return `${emailHeading('Last Check — Still Buying in {{market}}?')}
${emailText('Hi {{buyerName}},')}
${emailText('This is my last reach-out for now. I wanted to make sure you haven\'t missed our previous messages about off-market deals in {{market}}.')}
${emailText('If you\'re still actively buying investment properties, reply with a quick YES and I\'ll keep you on our priority buyer list. If the timing isn\'t right, no worries at all — you can always reach out when you\'re ready.')}
${emailButton('Yes, I\'m Still Buying', 'mailto:{{replyEmail}}?subject=Yes - Still Buying')}`
}

function nurtureStep1(): string {
  return `${emailHeading('Welcome to {{companyName}}')}
${emailText('Hi {{buyerName}},')}
${emailText('Thanks for connecting with us. I\'m {{agentName}} from {{companyName}}, and I\'ll be your point of contact for off-market investment opportunities in {{market}}.')}
${emailText('Here\'s what you can expect from us:')}
${emailText('• <strong>Deal alerts</strong> matched to your criteria<br>• <strong>Market insights</strong> for your target areas<br>• <strong>Quick response</strong> — when you\'re interested, we move fast')}
${emailText('We\'ll only send you properties that match what you\'re looking for. No spam, no irrelevant listings.')}
${emailText('Talk soon,', { size: '13px' })}
${emailText('{{agentName}}, {{companyName}}', { size: '13px', color: brand.gray500 })}`
}

function nurtureStep2(): string {
  return `${emailHeading('Market Insights: {{market}}')}
${emailText('Hi {{buyerName}},')}
${emailText('Quick market update from {{companyName}} — here\'s what we\'re seeing in {{market}} right now:')}
${emailBanner('Inventory is tight, but off-market deal flow remains strong for connected buyers.', 'info')}
${emailText('The investors doing well in this market right now are the ones who:')}
${emailText('• Have clear buy box criteria defined<br>• Can move quickly when the right deal appears<br>• Work with multiple deal sources (us included)')}
${emailText('If your criteria have changed, just reply and let me know — I\'ll update your profile right away.')}`
}

function nurtureStep3(): string {
  return `${emailHeading('Featured Deal in {{market}}')}
${emailText('Hi {{buyerName}},')}
${emailText('Wanted to share an example of the kind of deals we source in {{market}}. This gives you a feel for the opportunities we bring to our buyer network:')}
${emailBanner('Recent deal: Off-market SFR, 20%+ below ARV, closed in 14 days with a cash buyer from our list.', 'success')}
${emailText('We regularly find properties like this. If your buy box includes {{market}}, you should be seeing these deals.')}
${emailButton('Send Me Deals Like This', 'mailto:{{replyEmail}}?subject=Send Me Deals')}`
}

function nurtureStep4(): string {
  return `${emailHeading('Why Investors Work With Us')}
${emailText('Hi {{buyerName}},')}
${emailText('{{agentName}} from {{companyName}} here. I wanted to share why our buyer network keeps growing:')}
${emailText('• <strong>Off-market access</strong> — properties you won\'t find on the MLS<br>• <strong>Verified deals</strong> — every property comes with comps and analysis<br>• <strong>Speed</strong> — from deal alert to closing, we keep it moving<br>• <strong>No fees to buyers</strong> — our assignment fee is built into the deal price')}
${emailText('If you\'ve been on the fence about working with us, now\'s a great time. Deal flow in {{market}} is picking up and we need more serious buyers on the list.')}`
}

function nurtureStep5(): string {
  return `${emailHeading('Ready to See Deals That Match?')}
${emailText('Hi {{buyerName}},')}
${emailText('This is my final check-in for now. I\'ve been sharing what we do at {{companyName}} and how we work with cash buyers in {{market}}.')}
${emailText('If you\'re actively looking for investment properties, reply with your criteria and I\'ll make sure you see our best deals first.')}
${emailText('If the timing isn\'t right, that\'s totally fine. You can always reach out when you\'re ready.')}
${emailButton('Send My Criteria', 'mailto:{{replyEmail}}?subject=My Criteria - {{buyerName}}')}
${emailSpacer(8)}
${emailText('Wishing you great deals ahead,', { size: '13px' })}
${emailText('{{agentName}}, {{companyName}}', { size: '13px', color: brand.gray500 })}`
}

function reactivationStep1(): string {
  return `${emailHeading('We Miss You — {{market}} Update')}
${emailText('Hi {{buyerName}},')}
${emailText('It\'s been a while since we last connected. {{agentName}} from {{companyName}} here.')}
${emailText('A lot has changed in the {{market}} investment market since we last spoke. We\'ve been sourcing some great off-market deals, and I wanted to make sure you\'re still getting opportunities that match your criteria.')}
${emailText('Are you still buying? If so, reply with any updates to your buy box and I\'ll get you back on the priority list.')}
${emailButton('Yes — I\'m Still Buying', 'mailto:{{replyEmail}}?subject=Still Buying - {{buyerName}}')}`
}

function reactivationStep2(): string {
  return `${emailHeading('Last Chance — 3 Deals in {{market}}')}
${emailText('Hi {{buyerName}},')}
${emailText('Final check-in from {{companyName}}. We have 3 off-market properties in {{market}} right now that could match your profile.')}
${emailText('If you\'re still in the game, reply YES and I\'ll send over the details immediately. If you\'re no longer buying, no worries — just let me know and I\'ll update your profile.')}
${emailButton('Send Me The Deals', 'mailto:{{replyEmail}}?subject=Send Deals - {{buyerName}}')}`
}

// ─── Pre-built Drip Sequences ───────────────────────────────────────────────

export const EMAIL_DRIP_SEQUENCES: EmailDripSequence[] = [
  {
    id: 'deal_alert',
    name: 'Deal Alert',
    category: 'deal_alert',
    steps: [
      { dayOffset: 0, subject: 'New Off-Market Deal in {{market}} — {{dealAddress}}', bodyHtml: dealAlertBody() },
    ],
  },
  {
    id: 'qualification',
    name: 'Buyer Qualification (3-step)',
    category: 'qualification',
    steps: [
      { dayOffset: 0, subject: 'Off-Market Deals in {{market}} — Are You Buying?', bodyHtml: qualificationStep1() },
      { dayOffset: 2, subject: 'Market Update: {{market}} Investment Activity', bodyHtml: qualificationStep2() },
      { dayOffset: 5, subject: 'Quick Question — Still Looking in {{market}}?', bodyHtml: qualificationStep3() },
    ],
  },
  {
    id: 'nurture',
    name: 'Buyer Nurture (5-step)',
    category: 'nurture',
    steps: [
      { dayOffset: 0, subject: 'Welcome to {{companyName}} — Your Off-Market Deal Source', bodyHtml: nurtureStep1() },
      { dayOffset: 3, subject: 'Market Insights: What\'s Moving in {{market}}', bodyHtml: nurtureStep2() },
      { dayOffset: 7, subject: 'Featured Deal: Off-Market Opportunity in {{market}}', bodyHtml: nurtureStep3() },
      { dayOffset: 10, subject: 'Why Cash Buyers Work With {{companyName}}', bodyHtml: nurtureStep4() },
      { dayOffset: 14, subject: 'Ready to See Deals That Match Your Criteria?', bodyHtml: nurtureStep5() },
    ],
  },
  {
    id: 'reactivation',
    name: 'Buyer Reactivation (2-step)',
    category: 'reactivation',
    steps: [
      { dayOffset: 0, subject: 'We Miss You — New Deals in {{market}}', bodyHtml: reactivationStep1() },
      { dayOffset: 3, subject: 'Last Chance: 3 Off-Market Properties in {{market}}', bodyHtml: reactivationStep2() },
    ],
  },
]

// ─── Email Drip Service ─────────────────────────────────────────────────────

export class EmailDripService {
  private sendEmail: ReturnType<typeof getEmailSender>

  constructor() {
    this.sendEmail = getEmailSender()
  }

  /** Send a single email, wrapped in the branded template with unsubscribe footer */
  async send(to: string, subject: string, bodyHtml: string, mergeData?: Record<string, string>): Promise<EmailSendResult> {
    try {
      const mergedSubject = mergeData ? mergeTemplate(subject, mergeData) : subject
      let mergedBody = mergeData ? mergeTemplate(bodyHtml, mergeData) : bodyHtml

      // Add CAN-SPAM unsubscribe footer
      mergedBody += unsubscribeFooter(to)

      const html = wrapInEmailTemplate(mergedBody, {
        previewText: mergedSubject,
        showFooterCTA: false,
      })

      const result = await this.sendEmail(to, mergedSubject, html)

      if (!result.success) {
        return { success: false, messageId: null, error: result.error }
      }

      return { success: true, messageId: result.messageId || null }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      logger.error('Email send failed', { route: 'email-service', to, error: errMsg })
      return { success: false, messageId: null, error: errMsg }
    }
  }

  /** Send bulk emails with rate limiting */
  async sendBulk(
    emails: Array<{ to: string; subject: string; bodyHtml: string; mergeData?: Record<string, string> }>,
    batchSize = 50,
  ): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = []

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)

      const batchResults = await Promise.allSettled(
        batch.map(e => this.send(e.to, e.subject, e.bodyHtml, e.mergeData)),
      )

      for (const r of batchResults) {
        if (r.status === 'fulfilled') {
          results.push(r.value)
        } else {
          results.push({
            success: false,
            messageId: null,
            error: r.reason?.message || 'Send failed',
          })
        }
      }

      // 2-second delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    return results
  }

  /** Determine which drip step a buyer should receive next for a campaign */
  async getNextDripStep(
    campaignId: string,
    buyerId: string,
    sequenceId: string,
  ): Promise<{ step: EmailDripStep; stepIndex: number } | null> {
    const sequence = EMAIL_DRIP_SEQUENCES.find(s => s.id === sequenceId)
    if (!sequence) return null

    // Find how many email steps this buyer has already received
    const completedSteps = await prisma.campaignCall.count({
      where: {
        campaignId,
        buyerId,
        channel: 'email',
        messageSent: true,
      },
    })

    if (completedSteps >= sequence.steps.length) return null // All steps sent

    const nextStep = sequence.steps[completedSteps]

    // Check if enough time has passed since campaign start or last email
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { startedAt: true },
    })

    if (!campaign?.startedAt) return null

    const targetDate = new Date(campaign.startedAt)
    targetDate.setDate(targetDate.getDate() + nextStep.dayOffset)

    if (new Date() < targetDate) return null // Too early for this step

    return { step: nextStep, stepIndex: completedSteps }
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _emailService: EmailDripService | null = null

export function getEmailDripService(): EmailDripService {
  if (!_emailService) {
    _emailService = new EmailDripService()
  }
  return _emailService
}
