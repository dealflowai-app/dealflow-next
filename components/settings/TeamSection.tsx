'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, X, Trash2, Loader2, Crown, Users } from 'lucide-react'
import { ROLES, ROLE_BADGE_STYLES, type TeamRole } from '@/lib/permissions'

const satoshi = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

interface TeamMemberData {
  id: string
  role: string
  joinedAt: string
  profile: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
  }
}

interface TeamData {
  id: string
  name: string
  ownerId: string
  owner: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
  }
  members: TeamMemberData[]
}

export default function TeamSection() {
  const [team, setTeam] = useState<TeamData | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('ADMIN')
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('MEMBER')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [teamName, setTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const isAdmin = currentUserRole === 'ADMIN'

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch('/api/team')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTeam(data.team)
      setCurrentUserRole(data.currentUserRole)
      setIsOwner(data.isOwner)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTeam() }, [fetchTeam])

  const createTeam = async () => {
    if (!teamName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName.trim() }),
      })
      if (res.ok) {
        setTeamName('')
        await fetchTeam()
      }
    } catch {
      // silent
    } finally {
      setCreating(false)
    }
  }

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteError('')
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        setInviteError(data.error || 'Failed to invite')
        return
      }
      setInviteEmail('')
      setInviteRole('MEMBER')
      setShowInviteForm(false)
      await fetchTeam()
    } catch {
      setInviteError('Something went wrong')
    } finally {
      setInviting(false)
    }
  }

  const updateRole = async (memberId: string, newRole: string) => {
    setActionLoading(memberId)
    try {
      await fetch(`/api/team/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      await fetchTeam()
    } catch {
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  const removeMember = async (memberId: string) => {
    if (!confirm('Remove this team member?')) return
    setActionLoading(memberId)
    try {
      await fetch(`/api/team/members/${memberId}`, { method: 'DELETE' })
      await fetchTeam()
    } catch {
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  const getDisplayName = (p: { firstName: string | null; lastName: string | null; email: string }) => {
    if (p.firstName || p.lastName) return [p.firstName, p.lastName].filter(Boolean).join(' ')
    return p.email
  }

  const getInitials = (p: { firstName: string | null; lastName: string | null; email: string }) => {
    if (p.firstName && p.lastName) return `${p.firstName[0]}${p.lastName[0]}`
    if (p.firstName) return p.firstName[0]
    return p.email[0].toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // No team yet — show create form
  if (!team) {
    return (
      <div>
        <h2 style={{ fontFamily: satoshi, fontWeight: 600, fontSize: '18px', letterSpacing: '-0.02em' }} className="text-[#0B1224] mb-1">Team</h2>
        <p style={{ fontFamily: satoshi, fontWeight: 400, fontSize: '14px' }} className="text-[rgba(5,14,36,0.5)] mb-6">Create a team to collaborate with others.</p>

        <div style={{ border: '1px solid rgba(5,14,36,0.06)', borderRadius: '10px', padding: '32px' }} className="bg-white text-center">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Users className="w-7 h-7 text-[#2563EB]" />
          </div>
          <h3 style={{ fontFamily: satoshi, fontWeight: 600, fontSize: '16px' }} className="text-[#0B1224] mb-2">No team yet</h3>
          <p style={{ fontFamily: satoshi, fontWeight: 400, fontSize: '14px' }} className="text-[rgba(5,14,36,0.5)] mb-6 max-w-sm mx-auto">
            Create a team to invite colleagues and manage roles and permissions.
          </p>
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <input
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="Team name (e.g. RiverPoint Capital)"
              onKeyDown={e => e.key === 'Enter' && createTeam()}
              style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', fontFamily: satoshi }}
              className="flex-1 text-[#0B1224] focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
            />
            <button
              onClick={createTeam}
              disabled={creating || !teamName.trim()}
              style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', fontFamily: satoshi }}
              className="bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Team'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Team exists — show members
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 style={{ fontFamily: satoshi, fontWeight: 600, fontSize: '18px', letterSpacing: '-0.02em' }} className="text-[#0B1224]">{team.name}</h2>
          <p style={{ fontFamily: satoshi, fontWeight: 400, fontSize: '13px' }} className="text-[rgba(5,14,36,0.5)] mt-0.5">
            {team.members.length} member{team.members.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', fontFamily: satoshi }}
            className="flex items-center gap-2 bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Invite Member
          </button>
        )}
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <div style={{ backgroundColor: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', borderRadius: '10px', padding: '20px 24px' }} className="mb-6">
          <h4 style={{ fontFamily: satoshi, fontWeight: 600, fontSize: '15px' }} className="text-[#0B1224] mb-3">Invite a new team member</h4>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label style={{ fontFamily: satoshi, fontWeight: 400, fontSize: '14px' }} className="block mb-1 text-[rgba(5,14,36,0.65)]">Email Address</label>
              <input
                value={inviteEmail}
                onChange={e => { setInviteEmail(e.target.value); setInviteError('') }}
                placeholder="colleague@company.com"
                style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', fontFamily: satoshi }}
                className="w-full text-[#0B1224] focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
              />
            </div>
            <div className="w-40">
              <label style={{ fontFamily: satoshi, fontWeight: 400, fontSize: '14px' }} className="block mb-1 text-[rgba(5,14,36,0.65)]">Role</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                style={{ backgroundColor: '#ffffff', border: '1px solid rgba(5,14,36,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '14px', fontFamily: satoshi }}
                className="w-full text-[#0B1224] focus:outline-none focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.08)]"
              >
                {ROLES.map(r => (
                  <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                ))}
              </select>
            </div>
            <button
              onClick={inviteMember}
              disabled={inviting || !inviteEmail.trim()}
              style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: 600, fontSize: '14px', fontFamily: satoshi }}
              className="bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors whitespace-nowrap disabled:opacity-50"
            >
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}
            </button>
            <button onClick={() => { setShowInviteForm(false); setInviteError('') }} className="px-3 py-2 text-[#2563EB] hover:text-[#1D4ED8]">
              <X className="w-4 h-4" />
            </button>
          </div>
          {inviteError && (
            <p style={{ fontFamily: satoshi, fontSize: '13px' }} className="text-red-500 mt-2">{inviteError}</p>
          )}
        </div>
      )}

      {/* Team table */}
      <div style={{ border: '1px solid rgba(5,14,36,0.06)', borderRadius: '10px' }} className="bg-white overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left">
              {['Name', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                <th key={h} style={{ fontFamily: satoshi, fontWeight: 400, fontSize: '12px' }} className="px-6 py-3 text-[rgba(5,14,36,0.4)]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {team.members.map(m => {
              const memberIsOwner = m.profile.id === team.ownerId
              const style = ROLE_BADGE_STYLES[m.role as TeamRole] ?? ROLE_BADGE_STYLES.MEMBER
              const isLoading = actionLoading === m.id

              return (
                <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#0B1224] flex items-center justify-center flex-shrink-0">
                        <span style={{ fontFamily: satoshi, fontWeight: 600, fontSize: '10px' }} className="text-white">
                          {getInitials(m.profile)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: satoshi, fontWeight: 600, fontSize: '14px' }} className="text-[#0B1224]">
                          {getDisplayName(m.profile)}
                        </span>
                        {memberIsOwner && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700">
                            <Crown className="w-3 h-3" />
                            Owner
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span style={{ fontFamily: satoshi, fontSize: '14px' }} className="text-gray-600">{m.profile.email}</span>
                  </td>
                  <td className="px-6 py-3">
                    {isAdmin && !memberIsOwner ? (
                      <select
                        value={m.role}
                        onChange={e => updateRole(m.id, e.target.value)}
                        disabled={isLoading}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border-0 cursor-pointer ${style.bg} ${style.text} focus:outline-none disabled:opacity-50`}
                        style={{ fontFamily: satoshi }}
                      >
                        {ROLES.map(r => (
                          <option key={r} value={r}>{r.charAt(0) + r.slice(1).toLowerCase()}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${style.bg} ${style.text}`} style={{ fontFamily: satoshi }}>
                        {m.role.charAt(0) + m.role.slice(1).toLowerCase()}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    <span style={{ fontFamily: satoshi, fontSize: '13px' }} className="text-gray-500">
                      {new Date(m.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {isAdmin && !memberIsOwner && (
                      <button
                        onClick={() => removeMember(m.id)}
                        disabled={isLoading}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Remove member"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p style={{ fontFamily: satoshi, fontWeight: 400, fontSize: '12px', borderRadius: '10px' }} className="bg-gray-100 text-[rgba(5,14,36,0.4)] px-4 py-2.5">
        Manage who has access to your DealFlow AI workspace and what they can do.
      </p>
    </div>
  )
}
