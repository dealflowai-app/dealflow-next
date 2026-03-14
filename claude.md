DEALFLOW AI - Project Context for Claude Code

Dealflow AI is a SaaS platform built exclusively for real estate wholesalers. It replaces the 4-5 fragmented tools wholesalers currently use (PropStream, dialers, CRMs, contract platforms) with one integrated system. Buyers/investors do not sign up or use the platform. Wholesalers use the platform to discover and manage cash buyer leads.

CORE ARCHITECTURE:
The app has 9 main tabs plus a settings utility:

1. Dashboard - Analytics, KPIs, activity feed, revenue graphs, campaign stats, quick actions
2. Community - Forum/feed, groups, announcements, news drops, private inbox/DMs between wholesalers
3. Marketplace - Wholesalers post deal listings, share verified cash buyers, post buy box criteria. Reputation system.
4. Discovery - Property/owner search by city or zip. Filters by property type (SFR, multi-family, commercial, vacant land) and owner type (cash buyers, absentee, high equity). Split-screen: interactive map on left, scrollable property list on right. Click a property for full detail card (owner name, portfolio, mortgage, equity, liens, contact info). Free tier: 100 searches/mo with blurred contacts. Paid tiers unlock full data.
5. Buyer CRM - Buyer contact management with auto-import from Discovery. Profiles, call logs, chat logs, tags, segments, buyer scoring, pipeline view.
6. AI Outreach - Campaign engine linked to CRM. AI voice calling, SMS, email. Records and transcribes all calls. Analytics dashboard, A/B testing, DNC management.
7. Property Analyzer - Enter an address, get comps, ARV estimate, flip/rental profit analysis, and a deal score (0-100). Export as PDF or push to Marketplace.
8. Contracts - State-specific assignment contract templates, auto-fill from deal data, e-signatures, audit trail.
9. DealFlow GPT - AI chatbot with full account context. Can see CRM, deals, campaigns, and market data. Helps with deal decisions, buyer recommendations, strategy coaching.
   Settings - Portfolio, billing, subscription, preferences. Accessed from profile menu, not main nav.

DATA FLOW BETWEEN TABS:
Discovery -> CRM (one-click import), CRM -> AI Outreach (select segments for campaigns), AI Outreach -> CRM (call results write back), Property Analyzer -> Marketplace (list analyzed deals), Property Analyzer -> CRM (match deal to buyers), Marketplace -> Contracts (accepted deal moves to signing), All tabs -> Dashboard (analytics rollup), All tabs -> DealFlow GPT (chatbot has full context).

TECH STACK:

- Frontend: Next.js + React + Tailwind CSS
- Backend: Node.js API
- Database: PostgreSQL (relational/transactions) + MongoDB (unstructured buyer profiles)
- Auth: Auth0
- AI Voice: Bland AI or Vapi + ElevenLabs
- SMS: Twilio
- Email: SendGrid
- Property Data: ATTOM Data API
- Contact Enrichment: Melissa Data
- Comps/ARV: PropStream API
- Maps: Mapbox
- E-Signatures: DocuSign API
- Contract Assembly: Anvil.app
- AI Chatbot: Anthropic Claude API with RAG
- Real-time: Socket.io
- Search: Elasticsearch
- Cloud: AWS
- Payments: Stripe

PRICING TIERS:
Starter ($149/mo): 1 market, 500 searches, 300 AI calls, 300 CRM contacts, 5 deals
Pro ($299/mo): 3 markets, 2500 searches, 1500 AI calls, 3000 contacts, 20 deals
Enterprise ($499+/mo): Unlimited everything, white-label, custom contracts
Free tier: 100 blurred searches, community access, 3 property analyses
Per-deal transaction fee: $200-250 per closed deal

BUILD PHASES:
Phase 1 (Months 1-4): Dashboard, Discovery, Buyer CRM, AI Outreach, Property Analyzer, Settings
Phase 2 (Months 4-8): Community, Marketplace, Contracts, enhanced CRM + Outreach + Dashboard
Phase 3 (Months 8-14): DealFlow GPT, smart matching, reputation system, team features, white-label
Phase 4 (Months 14-24): ML matching, market intelligence, mobile app, API
