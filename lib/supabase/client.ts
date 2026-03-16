import { createBrowserClient } from '@supabase/ssr'

// Next.js only statically replaces direct process.env.NEXT_PUBLIC_* references,
// so these must be inline — not via a dynamic helper function.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
