'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type FormData = {
  address: string
  city: string
  state: string
  zip: string
  property_type: string
  beds: string
  baths: string
  sqft: string
  arv: string
  asking_price: string
  repair_estimate: string
  description: string
}

const initialForm: FormData = {
  address: '',
  city: '',
  state: '',
  zip: '',
  property_type: 'single_family',
  beds: '',
  baths: '',
  sqft: '',
  arv: '',
  asking_price: '',
  repair_estimate: '',
  description: '',
}

const propertyTypes = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'multi_family', label: 'Multi-Family' },
  { value: 'condo', label: 'Condo / Townhouse' },
  { value: 'land', label: 'Land / Lot' },
  { value: 'commercial', label: 'Commercial' },
]

const states = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
  'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
  'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', color: '#6b7280', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#9ca3af', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #e5e7eb',
  borderRadius: 7,
  padding: '9px 12px',
  fontSize: '0.875rem',
  color: 'var(--navy-heading, #0B1224)',
  background: '#ffffff',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

export default function NewDealPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function formatMoney(value: string) {
    const digits = value.replace(/\D/g, '')
    if (!digits) return ''
    return Number(digits).toLocaleString()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const payload = {
        user_id: user.id,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        property_type: form.property_type,
        beds: form.beds ? parseInt(form.beds) : null,
        baths: form.baths ? parseFloat(form.baths) : null,
        sqft: form.sqft ? parseInt(form.sqft.replace(/,/g, '')) : null,
        arv: form.arv ? parseInt(form.arv.replace(/,/g, '')) : null,
        asking_price: form.asking_price ? parseInt(form.asking_price.replace(/,/g, '')) : null,
        repair_estimate: form.repair_estimate ? parseInt(form.repair_estimate.replace(/,/g, '')) : null,
        description: form.description || null,
        status: 'active',
      }

      const { error: dbError } = await supabase.from('deals').insert(payload)
      if (dbError) throw new Error(dbError.message)

      router.push('/deals')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '36px 40px', maxWidth: 800 }}>
      {/* Back */}
      <Link href="/deals" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#9ca3af', textDecoration: 'none', marginBottom: 24 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Deals
      </Link>

      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: '1.45rem', fontWeight: 500, color: 'var(--navy-heading, #0B1224)', letterSpacing: '-0.025em', marginBottom: 6 }}>
          Submit a Deal
        </h1>
        <p style={{ fontSize: '0.85rem', color: '#9ca3af' }}>
          Once submitted, AI will begin finding and calling matched cash buyers.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Property location */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '22px 24px' }}>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 18 }}>
            Property Location
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Street Address" required>
              <input
                type="text"
                required
                value={form.address}
                onChange={e => set('address', e.target.value)}
                placeholder="123 Maple St"
                style={inputStyle}
                className="deal-input"
              />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }} className="deal-location-grid">
              <Field label="City" required>
                <input
                  type="text"
                  required
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  placeholder="Atlanta"
                  style={inputStyle}
                  className="deal-input"
                />
              </Field>
              <Field label="State" required>
                <select
                  required
                  value={form.state}
                  onChange={e => set('state', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                  className="deal-input"
                >
                  <option value="">State</option>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="ZIP" required>
                <input
                  type="text"
                  required
                  value={form.zip}
                  onChange={e => set('zip', e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="30301"
                  style={inputStyle}
                  className="deal-input"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Property details */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '22px 24px' }}>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 18 }}>
            Property Details
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Property Type" required>
              <select
                required
                value={form.property_type}
                onChange={e => set('property_type', e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}
                className="deal-input"
              >
                {propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }} className="deal-details-grid">
              <Field label="Bedrooms">
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={form.beds}
                  onChange={e => set('beds', e.target.value)}
                  placeholder="3"
                  style={inputStyle}
                  className="deal-input"
                />
              </Field>
              <Field label="Bathrooms">
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={form.baths}
                  onChange={e => set('baths', e.target.value)}
                  placeholder="2"
                  style={inputStyle}
                  className="deal-input"
                />
              </Field>
              <Field label="Square Feet">
                <input
                  type="text"
                  value={form.sqft}
                  onChange={e => set('sqft', e.target.value.replace(/\D/g, ''))}
                  placeholder="1,400"
                  style={inputStyle}
                  className="deal-input"
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Financials */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '22px 24px' }}>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 18 }}>
            Financials
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }} className="deal-financials-grid">
            <Field label="Asking Price" required>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.875rem' }}>$</span>
                <input
                  type="text"
                  required
                  value={form.asking_price}
                  onChange={e => set('asking_price', formatMoney(e.target.value))}
                  placeholder="95,000"
                  style={{ ...inputStyle, paddingLeft: 24 }}
                  className="deal-input"
                />
              </div>
            </Field>
            <Field label="ARV (After Repair Value)">
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.875rem' }}>$</span>
                <input
                  type="text"
                  value={form.arv}
                  onChange={e => set('arv', formatMoney(e.target.value))}
                  placeholder="180,000"
                  style={{ ...inputStyle, paddingLeft: 24 }}
                  className="deal-input"
                />
              </div>
            </Field>
            <Field label="Estimated Repairs">
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: '0.875rem' }}>$</span>
                <input
                  type="text"
                  value={form.repair_estimate}
                  onChange={e => set('repair_estimate', formatMoney(e.target.value))}
                  placeholder="40,000"
                  style={{ ...inputStyle, paddingLeft: 24 }}
                  className="deal-input"
                />
              </div>
            </Field>
          </div>
        </div>

        {/* Notes */}
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '22px 24px' }}>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.07em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 18 }}>
            Additional Notes
          </div>
          <Field label="Description / Notes">
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe the property condition, motivation, access details, or anything else buyers should know..."
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              className="deal-input"
            />
          </Field>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, padding: '11px 16px', fontSize: '0.84rem', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Link
            href="/deals"
            style={{
              padding: '10px 18px',
              borderRadius: 7,
              fontSize: '0.84rem',
              color: '#6b7280',
              textDecoration: 'none',
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#374151' : '#111827',
              color: 'white',
              border: 'none',
              borderRadius: 7,
              padding: '10px 22px',
              fontFamily: 'inherit',
              fontWeight: 500,
              fontSize: '0.875rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'background 0.15s',
            }}
          >
            {loading ? (
              <>
                <span className="deal-spinner" />
                Submitting
              </>
            ) : 'Submit Deal'}
          </button>
        </div>
      </form>

      <style>{`
        .deal-input:focus {
          border-color: #9ca3af !important;
          box-shadow: 0 0 0 3px rgba(0,0,0,0.04);
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .deal-spinner {
          width: 13px; height: 13px;
          border: 1.5px solid rgba(255,255,255,0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @media (max-width: 640px) {
          .deal-location-grid, .deal-details-grid, .deal-financials-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
