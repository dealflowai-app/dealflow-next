import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Terms of Service · Dealflow AI',
}

const sections = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using Dealflow AI ("Platform," "Service"), you ("User," "you") agree to be bound by these Terms of Service ("Terms") and our Privacy Policy, which is incorporated herein by reference. If you do not agree to these Terms, do not use the Platform.

These Terms apply to all users including real estate wholesalers, cash buyers, investors, and any other individuals or entities accessing the Platform. If you are using the Platform on behalf of a company or organization, you represent that you have the authority to bind that entity to these Terms.`,
  },
  {
    title: '2. Description of Service',
    body: `Dealflow AI provides an AI-powered real estate wholesale marketplace that includes:

•Automated cash buyer discovery using public property records and licensed data sources
•AI voice agent calling and qualification of real estate buyers on behalf of wholesalers
•Intelligent deal-to-buyer matching based on investment criteria and purchase history
•Deal distribution, offer management, and negotiation tools
•Automated assignment contract generation with state-specific legal templates
•Electronic signature collection and transaction management

The Platform is currently in beta. Features, pricing, and availability may change at any time.`,
  },
  {
    title: '3. Eligibility',
    body: `You must be at least 18 years of age to use Dealflow AI. By using the Platform, you represent and warrant that you are at least 18 years old, have the legal capacity to enter into a binding agreement, and are not prohibited from using the Platform under any applicable law.

Dealflow AI is intended for use by real estate professionals operating in compliance with applicable state and federal laws. We reserve the right to deny access to any user at our sole discretion.`,
  },
  {
    title: '4. Account Registration and Security',
    body: `To access certain features, you must create an account. You agree to provide accurate, current, and complete information during registration and to update your information as needed to keep it accurate.

You are solely responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You agree to notify us immediately at hello@dealflow.ai if you suspect unauthorized access to your account.

We reserve the right to suspend or terminate accounts that violate these Terms, provide false information, or engage in fraudulent or harmful activity.`,
  },
  {
    title: '5. Wholesaler Terms',
    body: `If you use Dealflow AI as a real estate wholesaler, the following additional terms apply:

Deal submissions: You represent and warrant that any property deal you submit to the Platform is a legitimate transaction in which you hold or have a contractual right to assign an interest. Submitting fraudulent, expired, or misrepresented deals is a material violation of these Terms.

AI calling authorization: By enabling AI outreach for a deal, you authorize Dealflow AI to initiate automated calls and text messages to buyers in your account on your behalf. You represent that you have obtained or will obtain all required consents and that your use of our calling features complies with the Telephone Consumer Protection Act (TCPA), state telemarketing laws, and any applicable Do Not Call regulations. You assume full responsibility for TCPA compliance for calls initiated through your account.

Buyer data: Buyer profiles and contact information surfaced through our platform are licensed for use within Dealflow AI only. You may not export, copy, or use buyer data outside the Platform for any purpose.

Deal quality: You agree not to submit deals that are overpriced, double-contracted, daisy-chained without disclosure, or otherwise misrepresented. We reserve the right to flag or remove deals that fail quality standards.

Assignment fees: Dealflow AI does not set or guarantee assignment fees. All fees are negotiated directly between wholesalers and buyers. We are not a party to any real estate transaction.`,
  },
  {
    title: '6. Buyer and Investor Terms',
    body: `If you use Dealflow AI as a cash buyer or real estate investor, the following additional terms apply:

Consent to contact: By registering as a buyer or providing your contact information through the Platform, you expressly consent to receive AI-initiated and pre-recorded calls and text messages from Dealflow AI and wholesalers using our platform regarding real estate investment opportunities. This consent is not a condition of any purchase or service.

Opt-out: You may opt out of communications at any time as described in our Privacy Policy. Opt-out requests are honored within 24 hours.

Due diligence: All deal information on the Platform, including AI-generated analysis, ARV estimates, profit projections, and match scores, is provided for informational purposes only. You are solely responsible for performing your own due diligence before making any investment decision. Dealflow AI does not provide investment advice.

Free access: Buyer access to the Platform's deal feed and marketplace is currently free. We reserve the right to introduce buyer-side pricing with reasonable advance notice.`,
  },
  {
    title: '7. AI-Generated Content and Limitations',
    body: `Dealflow AI uses artificial intelligence to generate deal analysis, buyer match scores, ARV estimates, contract drafts, and call transcripts. You acknowledge and agree that:

•AI-generated content may contain errors, omissions, or inaccuracies
•AI match scores and deal analysis are algorithmic estimates, not professional appraisals or legal advice
•AI-generated contract templates are starting points and do not constitute legal advice; you should have contracts reviewed by a licensed attorney in your state
•Call transcripts generated by AI may not be 100% accurate
•You should not rely solely on AI-generated content for investment, legal, or financial decisions

Dealflow AI is not a licensed real estate broker, attorney, financial advisor, or appraiser. Nothing on the Platform constitutes professional advice of any kind.`,
  },
  {
    title: '8. Payments and Billing',
    body: `Subscription fees: Wholesaler subscriptions are billed monthly or annually as selected at signup. All fees are in US dollars and are non-refundable except as required by law or as stated in our refund policy.

Transaction fees: Dealflow AI charges a transaction fee for deals closed through the Platform's Transaction Center. This fee is charged to the wholesaler upon contract execution and is payable via the payment method on file.

Founding member pricing: Users who join during the beta period and are designated as founding members will have their subscription pricing locked at the rate in effect at the time of their first paid subscription, for as long as their subscription remains active and in good standing.

Payment processing: Payments are processed by Stripe. By providing payment information, you authorize Dealflow AI to charge your payment method for all applicable fees. You agree to Stripe's terms of service.

Failed payments: If a payment fails, we will retry the charge up to three times over 7 days. If payment remains unsuccessful, your account may be suspended until the balance is resolved.`,
  },
  {
    title: '9. Prohibited Conduct',
    body: `You agree not to use Dealflow AI to:

•Violate any federal, state, or local law or regulation, including the TCPA, Fair Housing Act, or real estate licensing laws
•Submit fraudulent, fabricated, or misrepresented property deals
•Contact buyers outside of the Platform using data obtained through Dealflow AI
•Harass, threaten, or intimidate any buyer, seller, or other user
•Scrape, crawl, or programmatically access the Platform without authorization
•Reverse engineer, decompile, or attempt to extract source code from the Platform
•Introduce viruses, malware, or other harmful code
•Circumvent any access controls, rate limits, or security features
•Create multiple accounts to circumvent a suspension or ban
•Use the Platform for any purpose other than legitimate real estate wholesale transactions`,
  },
  {
    title: '10. Intellectual Property',
    body: `Dealflow AI and all associated content, features, software, trademarks, logos, and technology are the exclusive property of Dealflow AI and are protected by US and international intellectual property laws.

We grant you a limited, non-exclusive, non-transferable, revocable license to access and use the Platform for its intended purpose in accordance with these Terms. This license does not include the right to sublicense, resell, reproduce, or create derivative works from any part of the Platform.

You retain ownership of the content you upload to the Platform, including deal information and documents. By uploading content, you grant Dealflow AI a non-exclusive, royalty-free license to use, process, and display that content solely as necessary to provide the Service.`,
  },
  {
    title: '11. Third-Party Services',
    body: `Dealflow AI integrates with third-party services including Supabase, Vapi.ai, Twilio, Stripe, ATTOM Data Solutions, Melissa Data, Anvil, and others. Your use of these services through our Platform may be subject to those providers' own terms and privacy policies.

We are not responsible for the availability, accuracy, or conduct of any third-party service. We do not endorse any third-party service and make no warranties about them.`,
  },
  {
    title: '12. Disclaimer of Warranties',
    body: `TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, DEALFLOW AI IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, ACCURACY, OR UNINTERRUPTED ACCESS.

We do not warrant that the Platform will be error-free, that defects will be corrected, that the Platform is free of viruses or harmful components, or that any real estate data or AI-generated content is accurate, complete, or current.`,
  },
  {
    title: '13. Limitation of Liability',
    body: `TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, DEALFLOW AI, ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DEALS, LOST DATA, OR BUSINESS INTERRUPTION, ARISING FROM YOUR USE OF OR INABILITY TO USE THE PLATFORM.

IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM YOUR USE OF THE PLATFORM EXCEED THE GREATER OF (A) THE TOTAL FEES YOU PAID TO DEALFLOW AI IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) $100.

Some jurisdictions do not allow the exclusion or limitation of incidental or consequential damages, so the above limitations may not apply to you.`,
  },
  {
    title: '14. Indemnification',
    body: `You agree to defend, indemnify, and hold harmless Dealflow AI and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorney fees) arising from:

•Your use of the Platform
•Your violation of these Terms
•Your violation of any applicable law, including the TCPA or Fair Housing Act
•Any deal you submit or transaction you conduct through the Platform
•Your infringement of any third-party rights
•Any claim that your content or conduct caused harm to a third party`,
  },
  {
    title: '15. Termination',
    body: `We reserve the right to suspend or terminate your access to Dealflow AI at any time, with or without notice, for any reason including violation of these Terms, harmful conduct, or extended inactivity.

You may cancel your account at any time by contacting hello@dealflow.ai or through your account settings. Upon termination, your right to use the Platform ceases immediately. Provisions that by their nature should survive termination will survive, including Sections 10, 12, 13, and 14.`,
  },
  {
    title: '16. Governing Law and Disputes',
    body: `These Terms are governed by the laws of the State of Delaware without regard to conflict of law principles. Any dispute arising from or relating to these Terms or your use of the Platform shall first be addressed through good-faith negotiation. If the dispute cannot be resolved informally, it shall be submitted to binding arbitration under the rules of the American Arbitration Association, conducted in English.

You waive any right to participate in a class action lawsuit or class-wide arbitration against Dealflow AI.`,
  },
  {
    title: '17. Changes to These Terms',
    body: `We reserve the right to modify these Terms at any time. For material changes, we will provide at least 14 days' notice by email or by posting a prominent notice on the Platform. Your continued use of the Platform after the effective date of updated Terms constitutes acceptance of the new Terms.

If you do not agree to the updated Terms, you must stop using the Platform and cancel your account before the effective date.`,
  },
  {
    title: '18. Miscellaneous',
    body: `Entire agreement: These Terms and our Privacy Policy constitute the entire agreement between you and Dealflow AI regarding the Platform and supersede any prior agreements.

Severability: If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.

Waiver: Our failure to enforce any right or provision of these Terms does not constitute a waiver of that right or provision.

Assignment: You may not assign your rights under these Terms without our prior written consent. We may assign our rights without restriction.`,
  },
  {
    title: '19. Contact',
    body: `For questions about these Terms of Service, please contact us at:

Dealflow AI
hello@dealflow.ai

We will respond to legal inquiries within 5 business days.`,
  },
]

export default function TermsPage() {
  return (
    <>
      <Nav isAbout />
      <main style={{ paddingTop: 62 }}>
        <div
          style={{
            maxWidth: 760,
            margin: '0 auto',
            padding: '72px 40px 56px',
          }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--blue-600)',
              marginBottom: 16,
            }}
          >
            Legal
          </p>
          <h1
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontSize: 'clamp(2rem, 4vw, 2.8rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--gray-900)',
              marginBottom: 16,
              lineHeight: 1.1,
            }}
          >
            Terms of Service
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)', lineHeight: 1.6 }}>
            Effective date: January 1, 2025 · Last updated: March 2025
          </p>
        </div>

        <div
          style={{
            maxWidth: 760,
            margin: '0 auto',
            padding: '0 40px 100px',
            display: 'flex',
            flexDirection: 'column',
            gap: 48,
          }}
        >
          <p style={{ fontSize: '1rem', color: 'var(--gray-600)', lineHeight: 1.8, borderLeft: '3px solid var(--blue-200)', paddingLeft: 18 }}>
            These Terms govern your use of Dealflow AI, an AI-powered real estate wholesale platform. Because our platform involves automated calling, third-party data, and legally binding contract generation, please read these Terms carefully before using the Service.
          </p>

          {sections.map((s) => (
            <div key={s.title} style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 36 }}>
              <h2
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  color: 'var(--gray-900)',
                  marginBottom: 12,
                  letterSpacing: '-0.02em',
                }}
              >
                {s.title}
              </h2>
              <p
                style={{
                  fontSize: '0.93rem',
                  color: 'var(--gray-600)',
                  lineHeight: 1.85,
                  whiteSpace: 'pre-line',
                }}
              >
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}