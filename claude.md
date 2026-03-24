DEALFLOW AI - Project Context for Claude Code

Dealflow AI is a SaaS platform built exclusively for real estate wholesalers. It replaces the 4-5 fragmented tools wholesalers currently use (PropStream, dialers, CRMs, contract platforms) with one integrated system. Buyers/investors do not sign up or use the platform. Wholesalers use the platform to discover and manage cash buyer leads.

CORE ARCHITECTURE:
The app has 9 main tabs plus a settings utility:

1. Dashboard - Analytics, KPIs, activity feed, revenue graphs, campaign stats, quick actions
2. Feed - Forum/feed, groups, announcements, news drops, private inbox/DMs between wholesalers
3. Marketplace - Wholesalers post deal listings, share verified cash buyers, post buy box criteria. Reputation system.
4. Find Buyers - Property/owner search by city or zip. Filters by property type (SFR, multi-family, commercial, vacant land) and owner type (cash buyers, absentee, high equity). Split-screen: interactive map on left, scrollable property list on right. Click a property for full detail card (owner name, portfolio, mortgage, equity, liens, contact info). Free tier: 100 searches/mo with blurred contacts. Paid tiers unlock full data.
5. Buyer List - Buyer contact management with auto-import from Find Buyers. Profiles, call logs, chat logs, tags, segments, buyer scoring, pipeline view.
6. Outreach - Campaign engine linked to Buyer List. AI voice calling, SMS, email. Records and transcribes all calls. Analytics dashboard, A/B testing, DNC management.
7. Analyze Deal - Enter an address, get comps, ARV estimate, flip/rental profit analysis, and a deal score (0-100). Export as PDF or push to Marketplace.
8. Contracts - State-specific assignment contract templates, auto-fill from deal data, e-signatures, audit trail.
9. Ask AI - AI chatbot with full account context. Can see Buyer List, deals, campaigns, and market data. Helps with deal decisions, buyer recommendations, strategy coaching.
   Settings - Portfolio, billing, subscription, preferences. Accessed from profile menu, not main nav.

DATA FLOW BETWEEN TABS:
Find Buyers -> Buyer List (one-click import), Buyer List -> Outreach (select segments for campaigns), Outreach -> Buyer List (call results write back), Analyze Deal -> Marketplace (list analyzed deals), Analyze Deal -> Buyer List (match deal to buyers), Marketplace -> Contracts (accepted deal moves to signing), All tabs -> Dashboard (analytics rollup), All tabs -> Ask AI (chatbot has full context).

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
- E-Signatures: PandaDoc API
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
Phase 1 (Months 1-4): Dashboard, Find Buyers, Buyer List, Outreach, Analyze Deal, Settings
Phase 2 (Months 4-8): Feed, Marketplace, Contracts, enhanced Buyer List + Outreach + Dashboard
Phase 3 (Months 8-14): Ask AI, smart matching, reputation system, team features, white-label
Phase 4 (Months 14-24): ML matching, market intelligence, mobile app, API
