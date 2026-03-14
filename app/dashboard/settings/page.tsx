import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const initial = user?.email?.[0].toUpperCase() ?? '?'

  return (
    <div style={{ padding: '36px 40px', maxWidth: 600 }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: "'Bricolage Grotesque', sans-serif",
          fontSize: '1.45rem',
          fontWeight: 500,
          color: '#111827',
          letterSpacing: '-0.025em',
          marginBottom: 6,
        }}>
          Settings
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
          Manage your account and preferences.
        </p>
      </div>

      {/* Account */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '13px 20px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9ca3af' }}>Account</div>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#f3f4f6',
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              fontWeight: 500,
              flexShrink: 0,
            }}>
              {initial}
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: '#111827' }}>{user?.email}</div>
              <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 2 }}>
                Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '13px 20px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9ca3af' }}>Notifications</div>
        </div>
        <div style={{ padding: '4px 0' }}>
          {[
            { label: 'New buyer match', desc: 'When a buyer is matched to your deal' },
            { label: 'AI call completed', desc: 'When an AI call is made to a buyer' },
            { label: 'Deal status update', desc: 'When your deal moves through the pipeline' },
          ].map((n, i, arr) => (
            <div key={n.label} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 20px',
              borderBottom: i < arr.length - 1 ? '1px solid #f9fafb' : 'none',
            }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#374151' }}>{n.label}</div>
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginTop: 2 }}>{n.desc}</div>
              </div>
              <div style={{
                width: 38,
                height: 21,
                background: '#111827',
                borderRadius: 11,
                cursor: 'pointer',
                position: 'relative',
                flexShrink: 0,
              }}>
                <div style={{
                  width: 17,
                  height: 17,
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

      {/* Support */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '13px 20px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9ca3af' }}>Support</div>
        </div>
        <div style={{ padding: '8px 0' }}>
          {[
            { label: 'Help Center', href: '#' },
            { label: 'Contact Support', href: '/contact' },
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
          ].map((l, i, arr) => (
            <a key={l.label} href={l.href} className="settings-link" style={{
              display: 'block',
              padding: '11px 20px',
              fontSize: '0.875rem',
              color: '#374151',
              textDecoration: 'none',
              borderBottom: i < arr.length - 1 ? '1px solid #f9fafb' : 'none',
            }}>
              {l.label}
            </a>
          ))}
          <style>{`.settings-link:hover { background: #f9fafb; }`}</style>
        </div>
      </div>
    </div>
  )
}
