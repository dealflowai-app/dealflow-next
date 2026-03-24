import { loadStripe } from '@stripe/stripe-js'

export const getStripe = () => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) {
    console.error('[Stripe] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set')
    return Promise.resolve(null)
  }
  return loadStripe(key)
}
