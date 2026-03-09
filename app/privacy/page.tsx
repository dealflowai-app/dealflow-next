import type { Metadata } from 'next'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy · Dealflow AI',
}

const sections = [
  {
    title: '1. Who We Are',
    body: `Dealflow AI ("Dealflow AI," "we," "us," or "our") operates an AI-powered real estate wholesale marketplace that automates buyer discovery, outreach, deal matching, and contract generation. Our platform is accessible at dealflow.ai. For privacy-related inquiries, contact us at hello@dealflow.ai.`,
  },
  {
    title: '2. Information We Collect',
    body: `We collect information in the following ways:

Information you provide directly: When you join our waitlist, create an account, or contact us, we collect your name, email address, phone number, professional role (wholesaler, cash buyer, or both), and any other information you choose to provide.

Property and transaction data: If you are a wholesaler, you may upload property details, contract information, and deal-related documents. If you are a buyer, you may provide your investment criteria, purchase history, and preferences.

AI call data: When our AI voice agents contact you or call buyers on your behalf, those calls may be recorded and transcribed. Call recordings and transcripts are stored and used to update buyer profiles, improve matching accuracy, and for quality assurance. All calls are subject to applicable federal and state wiretapping and call recording laws.

Third-party data sources: We source property ownership records, transaction histories, and contact information from licensed third-party data providers including, but not limited to, ATTOM Data Solutions and Melissa Data. This data is used to identify and verify cash buyers in your target markets.

Automatically collected data: We collect standard log data including IP addresses, browser type, pages visited, referring URLs, and timestamps. We also use cookies and similar tracking technologies as described in Section 9.

Communications: If you contact us by email or other means, we retain those communications and any information contained in them.`,
  },
  {
    title: '3. How We Use Your Information',
    body: `We use the information we collect to:

•Operate, maintain, and improve the Dealflow AI platform
•Match real estate deals with qualified cash buyers based on stated investment criteria
•Conduct AI-powered outreach calls on behalf of wholesalers to identify and qualify buyers
•Generate and facilitate assignment contracts and related transaction documents
•Send you transactional communications, product updates, and early access notifications
•Verify the identity and purchase history of cash buyers in our network
•Improve the accuracy of our AI matching and qualification systems using call transcripts and outcomes
•Comply with legal obligations, including TCPA compliance and state-specific real estate regulations
•Detect and prevent fraud, abuse, and other harmful activity
•Respond to your requests and provide customer support`,
  },
  {
    title: '4. AI Voice Calls and TCPA Compliance',
    body: `Dealflow AI uses artificial intelligence voice agents to contact real estate investors and cash buyers on behalf of wholesalers using our platform. This section is important.

Consent: By registering as a cash buyer or providing your phone number to Dealflow AI or a wholesaler using our platform, you expressly consent to receive automated and pre-recorded calls and text messages from Dealflow AI and its users at the number you provide. This consent is not a condition of any purchase.

Opt-out: You may opt out of AI-initiated calls or texts at any time by replying STOP to any text message, stating "remove me" or "do not call" during any call, or emailing hello@dealflow.ai. Opt-out requests are processed within 24 hours and applied across the platform.

Call times: Automated calls are restricted to the hours of 8:00 AM to 9:00 PM in the recipient's local time zone, in compliance with the Telephone Consumer Protection Act (TCPA) and applicable state laws.

Call recording: Calls made through our platform may be recorded. Where required by law, we announce the recording at the start of the call. By continuing a call after such announcement, you consent to recording.

Do Not Call Registry: We honor the National Do Not Call Registry. Wholesalers using our platform agree not to use Dealflow AI to contact numbers on the DNC Registry without appropriate consent on file.`,
  },
  {
    title: '5. Information Sharing and Disclosure',
    body: `We do not sell your personal information. We may share your information in the following circumstances:

With other platform users: Wholesalers can see buyer profiles including investment criteria, preferred markets, and deal history. Buyers can see deal details submitted by wholesalers. Personally identifiable contact information is only shared when both parties have been matched and a deal interaction has been initiated.

With service providers: We share information with trusted vendors who help us operate the platform, including cloud infrastructure (Supabase), AI calling (Vapi.ai), communication services (Twilio), payment processing (Stripe), contract generation (Anvil), and data providers (ATTOM, Melissa Data). These providers are contractually bound to handle your data only as necessary to provide their services.

For legal reasons: We may disclose information if required by law, subpoena, court order, or government authority, or if we believe disclosure is necessary to protect the rights, property, or safety of Dealflow AI, our users, or others.

Business transfers: If Dealflow AI is acquired, merged, or sells substantially all of its assets, your information may be transferred as part of that transaction. We will notify you via email or a prominent notice on our platform before your information becomes subject to a different privacy policy.

With your consent: We may share information for any other purpose with your explicit consent.`,
  },
  {
    title: '6. Data Security',
    body: `We implement industry-standard technical and organizational security measures to protect your information, including encryption of data in transit (TLS) and at rest, access controls limiting data access to authorized personnel, regular security assessments, and monitoring for unauthorized access or anomalies.

Despite these measures, no system is completely secure. We cannot guarantee that your information will never be accessed, disclosed, altered, or destroyed. If we become aware of a security breach that affects your information, we will notify you in accordance with applicable law.`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your personal information for as long as your account is active or as needed to provide services. Specifically:

•Waitlist data is retained until you request deletion or we launch and migrate you to an active account
•Account data is retained for the duration of your account plus 3 years after closure
•Call recordings and transcripts are retained for up to 2 years for quality assurance and legal compliance
•Transaction and contract records may be retained for up to 7 years to comply with financial recordkeeping requirements
•You may request deletion of your data at any time (see Section 8), subject to our legal retention obligations`,
  },
  {
    title: '8. Your Rights and Choices',
    body: `Depending on your location, you may have the following rights regarding your personal information:

Access: Request a copy of the personal information we hold about you.
Correction: Request that we correct inaccurate or incomplete information.
Deletion: Request that we delete your personal information, subject to certain legal exceptions.
Portability: Request that we provide your data in a portable format.
Opt-out of marketing: Unsubscribe from marketing emails at any time using the link in any email we send.
Opt-out of AI calls: As described in Section 4.

California residents may have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information is collected, the right to opt out of sale (we do not sell personal information), and the right to non-discrimination for exercising your rights.

To exercise any of these rights, email hello@dealflow.ai. We will respond within 30 days.`,
  },
  {
    title: '9. Cookies and Tracking',
    body: `We use cookies and similar technologies to operate our platform, remember your preferences, analyze usage patterns, and improve performance. Specifically:

Essential cookies: Required for the platform to function. These cannot be disabled.
Analytics cookies: Help us understand how users interact with the platform (e.g., page views, session duration). We use privacy-respecting analytics tools.
Preference cookies: Remember your settings and choices across sessions.

You can control non-essential cookies through your browser settings. Note that disabling certain cookies may affect platform functionality. We do not use third-party advertising cookies.`,
  },
  {
    title: '10. Third-Party Data and Real Estate Records',
    body: `Dealflow AI sources property ownership and transaction data from licensed public records providers. This data is used solely to identify verified cash buyers and facilitate deal matching. We do not use this data for any purpose unrelated to the platform's core function.

If you are a real estate investor whose information appears in our buyer database based on public records, you may contact us at hello@dealflow.ai to review, update, or remove your information from our system.`,
  },
  {
    title: '11. Children\'s Privacy',
    body: `Dealflow AI is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If we learn that we have collected information from a minor, we will delete it promptly. If you believe a minor has provided us with personal information, please contact us at hello@dealflow.ai.`,
  },
  {
    title: '12. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. When we make material changes, we will notify you by email and by posting a notice on our platform at least 14 days before the changes take effect. Your continued use of Dealflow AI after the effective date of the updated policy constitutes your acceptance of the changes. We encourage you to review this policy periodically.`,
  },
  {
    title: '13. Contact',
    body: `For questions, concerns, or requests related to this Privacy Policy or your personal information, contact us at:

Dealflow AI
hello@dealflow.ai

We take privacy inquiries seriously and will respond within 5 business days.`,
  },
]

export default function PrivacyPage() {
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
            Privacy Policy
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
            Dealflow AI operates an AI-powered real estate platform that includes automated calling, data sourcing, and transaction facilitation. Because of this, we handle more sensitive data than a typical SaaS product. This policy explains exactly what we collect, why, and how it is protected.
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