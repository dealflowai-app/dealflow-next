'use client'

import { useEffect, useState } from 'react'
import { Send, Check, X, Users, Mail, ArrowLeft, Loader2 } from 'lucide-react'

const fontFamily =
  "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

interface UserRow {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  tier: string
  createdAt: string
}

interface SendResult {
  email: string
  success: boolean
  error?: string
}

export default function AdminEmailPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [manualEmails, setManualEmails] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [fromName, setFromName] = useState('Josh from DealFlow AI')
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<{ sent: number; failed: number; details: SendResult[] } | null>(null)

  useEffect(() => {
    fetch('/api/admin/email')
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const toggleUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)))
    }
  }

  const parsedManualEmails = manualEmails
    .split(/[,;\n]+/)
    .map((e) => e.trim())
    .filter((e) => e.includes('@'))

  const totalRecipients = selectedIds.size + parsedManualEmails.length

  const handleSend = async () => {
    if (!totalRecipients || !subject.trim() || !message.trim()) return
    setSending(true)
    setResults(null)
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientIds: Array.from(selectedIds),
          manualEmails: parsedManualEmails,
          subject,
          message,
          fromName: fromName.trim() || undefined,
        }),
      })
      const data = await res.json()
      setResults({ sent: data.sent, failed: data.failed, details: data.results || [] })
    } catch {
      setResults({ sent: 0, failed: totalRecipients, details: [] })
    } finally {
      setSending(false)
    }
  }

  const displayName = (u: UserRow) => {
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ')
    return name || u.email
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900, fontFamily }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <Mail style={{ width: 22, height: 22, color: '#2563EB' }} />
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: '#0B1224',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Send Email
          </h1>
        </div>
        <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: '4px 0 0 34px' }}>
          Send a personal email to your users or anyone. Use {'{{firstName}}'} to personalize.
        </p>
      </div>

      {/* Recipients */}
      <div style={{ marginBottom: 24 }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#374151',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <Users style={{ width: 14, height: 14, display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
          Recipients
        </label>

        {loading ? (
          <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
            Loading users...
          </div>
        ) : (
          <>
            <button
              onClick={selectAll}
              style={{
                fontSize: '0.75rem',
                color: '#2563EB',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0 0 8px',
                fontFamily,
                fontWeight: 500,
              }}
            >
              {selectedIds.size === users.length ? 'Deselect all' : `Select all (${users.length})`}
            </button>

            <div
              style={{
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                maxHeight: 200,
                overflowY: 'auto',
                background: '#fff',
              }}
            >
              {users.map((u, i) => (
                <label
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    cursor: 'pointer',
                    borderBottom: i < users.length - 1 ? '1px solid #F3F4F6' : 'none',
                    background: selectedIds.has(u.id) ? '#EFF6FF' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(u.id)}
                    onChange={() => toggleUser(u.id)}
                    style={{ accentColor: '#2563EB', width: 16, height: 16 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1F2937' }}>
                      {displayName(u)}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#9CA3AF', marginLeft: 8 }}>
                      {u.email}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: u.tier === 'free' ? '#6B7280' : '#2563EB',
                      background: u.tier === 'free' ? '#F3F4F6' : '#DBEAFE',
                      borderRadius: 20,
                      padding: '2px 8px',
                    }}
                  >
                    {u.tier}
                  </span>
                </label>
              ))}
              {users.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                  No users found
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Manual emails */}
      <div style={{ marginBottom: 24 }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#374151',
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          <Mail style={{ width: 14, height: 14, display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
          Additional emails
        </label>
        <textarea
          value={manualEmails}
          onChange={(e) => setManualEmails(e.target.value)}
          rows={2}
          placeholder="email@example.com, another@example.com"
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: '0.88rem',
            fontFamily,
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            background: '#fff',
            outline: 'none',
            resize: 'vertical',
            lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
        />
        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '4px 0 0' }}>
          Send to anyone -- separate with commas, semicolons, or new lines
          {parsedManualEmails.length > 0 && (
            <span style={{ color: '#2563EB', marginLeft: 6 }}>
              ({parsedManualEmails.length} email{parsedManualEmails.length !== 1 ? 's' : ''})
            </span>
          )}
        </p>
      </div>

      {/* From Name */}
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#374151',
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          From Name
        </label>
        <input
          type="text"
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          placeholder="Josh from DealFlow AI"
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: '0.88rem',
            fontFamily,
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            background: '#fff',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '4px 0 0' }}>
          Replies go to dealflow.aiteam@gmail.com
        </p>
      </div>

      {/* Subject */}
      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#374151',
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Quick question"
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: '0.88rem',
            fontFamily,
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            background: '#fff',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Message */}
      <div style={{ marginBottom: 28 }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#374151',
            marginBottom: 6,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={8}
          placeholder={`Hey {{firstName}},\n\nI'm Josh, the founder of DealFlow AI. I saw you signed up recently and wanted to reach out personally.\n\nTwo quick questions:\n1. How'd you find us?\n2. What markets are you wholesaling in?\n\nHappy to help you get set up or jump on a quick call if that's easier.\n\nJosh\nFounder, DealFlow AI\ndealflowai.app`}
          style={{
            width: '100%',
            padding: '12px 14px',
            fontSize: '0.88rem',
            fontFamily,
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            background: '#fff',
            outline: 'none',
            resize: 'vertical',
            lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
        />
        <p style={{ fontSize: '0.72rem', color: '#9CA3AF', margin: '4px 0 0' }}>
          {'{{firstName}}'} will be replaced with each user's first name (or "there" if not set)
        </p>
      </div>

      {/* Send Button */}
      <button
        onClick={handleSend}
        disabled={sending || !totalRecipients || !subject.trim() || !message.trim()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '11px 28px',
          fontSize: '0.88rem',
          fontWeight: 600,
          fontFamily,
          color: '#fff',
          background:
            sending || !totalRecipients || !subject.trim() || !message.trim()
              ? '#93C5FD'
              : '#2563EB',
          border: 'none',
          borderRadius: 8,
          cursor:
            sending || !totalRecipients || !subject.trim() || !message.trim()
              ? 'not-allowed'
              : 'pointer',
          transition: 'background 0.15s',
        }}
      >
        {sending ? (
          <>
            <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
            Sending...
          </>
        ) : (
          <>
            <Send style={{ width: 16, height: 16 }} />
            Send to {totalRecipients} recipient{totalRecipients !== 1 ? 's' : ''}
          </>
        )}
      </button>

      {/* Results */}
      {results && (
        <div
          style={{
            marginTop: 20,
            padding: '16px 20px',
            borderRadius: 10,
            background: results.failed === 0 ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${results.failed === 0 ? '#BBF7D0' : '#FECACA'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            {results.failed === 0 ? (
              <Check style={{ width: 18, height: 18, color: '#16A34A' }} />
            ) : (
              <X style={{ width: 18, height: 18, color: '#DC2626' }} />
            )}
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1F2937' }}>
              {results.sent} sent{results.failed > 0 ? `, ${results.failed} failed` : ''}
            </span>
          </div>
          {results.details.map((r, i) => (
            <div
              key={i}
              style={{
                fontSize: '0.8rem',
                color: r.success ? '#16A34A' : '#DC2626',
                padding: '2px 0',
              }}
            >
              {r.success ? '\u2713' : '\u2717'} {r.email}
              {r.error && <span style={{ color: '#9CA3AF', marginLeft: 6 }}>({r.error})</span>}
            </div>
          ))}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg) } }` }} />
    </div>
  )
}
