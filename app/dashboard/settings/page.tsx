import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div style={{ padding: '36px 40px', maxWidth: 600 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: '1.75rem',
          fontWeight: 800,
          color: 'var(--gray-900)',
          letterSpacing: '-0.03em',
          marginBottom: 6,
        }}>
          Settings
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)' }}>
          Manage your account and preferences.
        </p>
      </div>

      {/* Account card */}
      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--gray-100)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-400)' }}>
            Account
          </div>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'var(--blue-600)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 700,
              flexShrink: 0,
            }}>
              {user?.email?.[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--gray-900)' }}>{user?.email}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 2 }}>Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications card */}
      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--gray-100)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        marginBottom: 20,
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-400)' }}>
            Notifications
          </div>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {[
            { label: 'New buyer match', desc: 'When a buyer is matched to your deal' },
            { label: 'AI call completed', desc: 'When an AI call is made to a buyer' },
            { label: 'Deal status update', desc: 'When your deal moves through the pipeline' },
          ].map(n => (
            <div key={n.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--gray-800)' }}>{n.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: 2 }}>{n.desc}</div>
              </div>
              <div style={{
                width: 40,
                height: 22,
                background: 'var(--blue-600)',
                borderRadius: 11,
                cursor: 'pointer',
                position: 'relative',
                flexShrink: 0,
              }}>
                <div style={{
                  width: 18,
                  height: 18,
                  background: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: 'var(--white)',
        border: '1px solid var(--gray-100)',
        borderRadius: 14,
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--gray-100)', background: 'var(--gray-50)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gray-400)' }}>
            Support
          </div>
        </div>
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Help Center', href: '#' },
            { label: 'Contact Support', href: '/contact' },
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
          ].map(l => (
            <a key={l.label} href={l.href} style={{ fontSize: '0.875rem', color: 'var(--blue-600)', textDecoration: 'none', fontWeight: 500 }}>
              {l.label} →
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
