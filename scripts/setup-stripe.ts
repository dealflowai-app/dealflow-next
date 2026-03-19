/**
 * One-time script to create Stripe products and prices.
 * Run with: npx tsx scripts/setup-stripe.ts
 */
import Stripe from 'stripe'
import * as fs from 'fs'
import * as path from 'path'

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  console.error('Missing STRIPE_SECRET_KEY. Make sure .env.local is loaded.')
  process.exit(1)
}

const stripe = new Stripe(secretKey, {
  apiVersion: '2026-02-25.clover',
  typescript: true,
})

async function main() {
  console.log('Creating Stripe products and prices...\n')

  // ── Starter Plan ──────────────────────────────────────
  const starterProduct = await stripe.products.create({
    name: 'DealFlow AI – Starter',
    description: 'For solo wholesalers getting started. 1 market, 500 CRM contacts, 30 deal analyses/mo, 50 free AI call minutes.',
    metadata: { tier: 'starter' },
  })
  const starterPrice = await stripe.prices.create({
    product: starterProduct.id,
    unit_amount: 14900, // $149.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'starter' },
  })
  console.log(`✓ Starter  product=${starterProduct.id}  price=${starterPrice.id}`)

  // ── Pro Plan ──────────────────────────────────────────
  const proProduct = await stripe.products.create({
    name: 'DealFlow AI – Pro',
    description: 'For active wholesalers scaling up. 3 markets, 3,000 CRM contacts, 150 deal analyses/mo, 150 free AI call minutes.',
    metadata: { tier: 'pro' },
  })
  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 29900, // $299.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'pro' },
  })
  console.log(`✓ Pro      product=${proProduct.id}  price=${proPrice.id}`)

  // ── Enterprise Plan ───────────────────────────────────
  const enterpriseProduct = await stripe.products.create({
    name: 'DealFlow AI – Enterprise',
    description: 'For large operations and teams. Unlimited markets, contacts, analyses. 500 free AI call minutes, white-label, API access.',
    metadata: { tier: 'enterprise' },
  })
  const enterprisePrice = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 49900, // $499.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'enterprise' },
  })
  console.log(`✓ Enterprise product=${enterpriseProduct.id}  price=${enterprisePrice.id}`)

  // ── Update .env.local ─────────────────────────────────
  const envPath = path.join(__dirname, '..', '.env.local')
  let envContent = fs.readFileSync(envPath, 'utf-8')

  const replacements: [RegExp, string][] = [
    [/^STRIPE_STARTER_PRICE_ID=.*$/m, `STRIPE_STARTER_PRICE_ID=${starterPrice.id}`],
    [/^STRIPE_PRO_PRICE_ID=.*$/m, `STRIPE_PRO_PRICE_ID=${proPrice.id}`],
    [/^STRIPE_ENTERPRISE_PRICE_ID=.*$/m, `STRIPE_ENTERPRISE_PRICE_ID=${enterprisePrice.id}`],
    [/^NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=.*$/m, `NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID=${starterPrice.id}`],
    [/^NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=.*$/m, `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=${proPrice.id}`],
  ]

  for (const [pattern, replacement] of replacements) {
    envContent = envContent.replace(pattern, replacement)
  }

  fs.writeFileSync(envPath, envContent, 'utf-8')
  console.log('\n✓ .env.local updated with all price IDs')
  console.log('\nDone! Your Stripe products and prices are live.')
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
