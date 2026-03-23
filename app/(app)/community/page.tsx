'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/components/toast'
import {
  Heart,
  MessageCircle,
  Send,
  Users,
  Rss,
  Check,
  Search,
  MessageSquare,
  Loader2,
  Trash2,
  MoreHorizontal,
  Plus,
  X,
  ArrowLeft,
} from 'lucide-react'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
type Author = { id: string; firstName: string | null; lastName: string | null; avatarUrl: string | null }
type FeedPost = {
  id: string
  content: string
  imageUrl: string | null
  createdAt: string
  author: Author
  likeCount: number
  commentCount: number
  liked: boolean
  isOwn: boolean
}
type Comment = {
  id: string
  content: string
  createdAt: string
  author: Author
  isOwn: boolean
}

/* ═══════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════ */
const pageTabs = [
  { key: 'feed', label: 'Feed', icon: Rss },
  { key: 'groups', label: 'Groups', icon: Users },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
] as const
type Tab = (typeof pageTabs)[number]['key']

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function getInitials(author: Author): string {
  if (author.firstName && author.lastName) return `${author.firstName[0]}${author.lastName[0]}`.toUpperCase()
  if (author.firstName) return author.firstName.slice(0, 2).toUpperCase()
  return '??'
}

function getDisplayName(author: Author): string {
  if (author.firstName) return `${author.firstName} ${author.lastName ?? ''}`.trim()
  return 'Anonymous'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  const hr = Math.floor(diff / 3600000)
  const day = Math.floor(diff / 86400000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min}m ago`
  if (hr < 24) return `${hr}h ago`
  if (day === 1) return 'Yesterday'
  if (day < 7) return `${day}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function Avatar({ initials, size = 32 }: { initials: string; size?: number }) {
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: '#0B1224' }}
    >
      <span style={{ fontSize: size * 0.38, fontWeight: 600, color: '#FFFFFF', fontFamily: FONT }}>{initials}</span>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   FEED SECTION (real API)
   ═══════════════════════════════════════════════ */
function FeedSection() {
  const toast = useToast()
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [newPostText, setNewPostText] = useState('')
  const [expandedComments, setExpandedComments] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fetch posts on mount
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/feed/posts?limit=30')
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!cancelled) setPosts(data.posts ?? [])
      } catch {
        // silent - empty feed is fine
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close menu on click outside
  useEffect(() => {
    if (!menuOpen) return
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [menuOpen])

  // Create post
  async function handlePost() {
    const text = newPostText.trim()
    if (!text || posting) return
    setPosting(true)
    try {
      const res = await fetch('/api/feed/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? 'Failed'); }
      const data = await res.json()
      setPosts(prev => [data.post, ...prev])
      setNewPostText('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create post')
    } finally {
      setPosting(false)
    }
  }

  // Toggle like
  async function toggleLike(postId: string) {
    // Optimistic update
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 }
        : p,
    ))
    try {
      const res = await fetch(`/api/feed/posts/${postId}/like`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, liked: data.liked, likeCount: data.likeCount } : p,
      ))
    } catch {
      // Revert on error
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, liked: !p.liked, likeCount: p.liked ? p.likeCount - 1 : p.likeCount + 1 }
          : p,
      ))
    }
  }

  // Delete post
  async function deletePost(postId: string) {
    setMenuOpen(null)
    try {
      const res = await fetch(`/api/feed/posts/${postId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setPosts(prev => prev.filter(p => p.id !== postId))
      toast('Post deleted')
    } catch {
      toast('Failed to delete post')
    }
  }

  return (
    <div className="max-w-[680px]">
      {/* Create post */}
      <div className="bg-white px-5 py-4 mb-4" style={{ border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10 }}>
        <div className="flex items-start gap-3">
          <div className="pt-1">
            <Avatar initials="You" size={32} />
          </div>
          <div className="flex-1">
            <textarea
              value={newPostText}
              onChange={e => setNewPostText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost() }}
              placeholder="Share something with the community..."
              rows={2}
              className="w-full outline-none transition-colors resize-none"
              style={{
                backgroundColor: '#F9FAFB',
                border: '1px solid rgba(5,14,36,0.06)',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 400,
                color: '#0B1224',
                fontFamily: FONT,
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[0.68rem]" style={{ color: newPostText.length > 1800 ? '#EF4444' : 'rgba(5,14,36,0.25)' }}>
                {newPostText.length > 0 && `${newPostText.length}/2000`}
              </span>
              <button
                onClick={handlePost}
                disabled={!newPostText.trim() || posting || newPostText.length > 2000}
                className="text-white border-0 cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 600, fontFamily: FONT }}
              >
                {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white" style={{ border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10, padding: '16px 20px' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: 'rgba(5,14,36,0.06)' }} />
                <div className="flex-1">
                  <div className="h-3 w-24 rounded animate-pulse mb-1.5" style={{ background: 'rgba(5,14,36,0.06)' }} />
                  <div className="h-2 w-16 rounded animate-pulse" style={{ background: 'rgba(5,14,36,0.04)' }} />
                </div>
              </div>
              <div className="h-3 w-full rounded animate-pulse mb-2" style={{ background: 'rgba(5,14,36,0.05)' }} />
              <div className="h-3 w-3/4 rounded animate-pulse" style={{ background: 'rgba(5,14,36,0.04)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white" style={{ border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10 }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(37,99,235,0.08)' }}>
            <Rss className="w-7 h-7 text-[#2563EB]" />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#0B1224', fontFamily: FONT }} className="mb-1">No posts yet</p>
          <p style={{ fontSize: 14, fontWeight: 400, color: 'rgba(5,14,36,0.5)', fontFamily: FONT }} className="mb-6">Be the first to share something with the wholesaler community.</p>
          <button
            onClick={() => {
              const textarea = document.querySelector('textarea[placeholder*="Share something"]') as HTMLTextAreaElement | null
              if (textarea) { textarea.focus(); textarea.scrollIntoView({ behavior: 'smooth', block: 'center' }) }
            }}
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' }}
            className="flex items-center gap-1.5 hover:opacity-90 text-white border-0 rounded-[8px] px-5 py-2.5 text-sm font-medium cursor-pointer transition-all shadow-sm"
          >
            <MessageSquare className="w-4 h-4" /> Start a discussion
          </button>
        </div>
      )}

      {/* Posts */}
      <div className="space-y-3">
        {posts.map(post => (
          <div key={post.id}>
            <div
              className="bg-white transition-all"
              style={{ border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10, padding: '16px 20px' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(5,14,36,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar initials={getInitials(post.author)} size={32} />
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0B1224', fontFamily: FONT }}>{getDisplayName(post.author)}</div>
                  <div style={{ fontSize: 12, fontWeight: 400, color: 'rgba(5,14,36,0.4)', fontFamily: FONT }}>{timeAgo(post.createdAt)}</div>
                </div>
                {post.isOwn && (
                  <div className="relative" ref={menuOpen === post.id ? menuRef : undefined}>
                    <button
                      onClick={() => setMenuOpen(menuOpen === post.id ? null : post.id)}
                      className="flex items-center justify-center w-7 h-7 rounded-[8px] border-0 bg-transparent cursor-pointer transition-colors hover:bg-[rgba(5,14,36,0.04)]"
                      style={{ color: 'rgba(5,14,36,0.3)' }}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    {menuOpen === post.id && (
                      <div
                        className="absolute top-full right-0 mt-1 w-[140px] bg-white rounded-[8px] py-1 z-20"
                        style={{ boxShadow: '0 8px 24px rgba(5,14,36,0.12), 0 0 0 1px rgba(5,14,36,0.06)' }}
                      >
                        <button
                          onClick={() => deletePost(post.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[0.78rem] text-red-500 hover:bg-red-50 border-0 bg-transparent cursor-pointer transition-colors text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete post
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <p className="leading-relaxed mb-3.5 whitespace-pre-wrap" style={{ fontSize: 14, fontWeight: 400, color: 'rgba(5,14,36,0.65)', fontFamily: FONT }}>{post.content}</p>

              {/* Actions */}
              <div className="flex items-center gap-5 pt-2" style={{ borderTop: '1px solid rgba(5,14,36,0.06)' }}>
                <button
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1.5 cursor-pointer bg-transparent border-0 transition-colors ${post.liked ? 'text-rose-500' : 'hover:text-rose-500'}`}
                  style={{ fontSize: 12, fontWeight: 400, color: post.liked ? undefined : 'rgba(5,14,36,0.4)', fontFamily: FONT }}
                >
                  <Heart className="w-4 h-4" fill={post.liked ? 'currentColor' : 'none'} />
                  {post.likeCount}
                </button>
                <button
                  onClick={() => setExpandedComments(expandedComments === post.id ? null : post.id)}
                  className="flex items-center gap-1.5 cursor-pointer bg-transparent border-0 transition-colors hover:text-[#2563EB]"
                  style={{ fontSize: 12, fontWeight: 400, color: expandedComments === post.id ? '#2563EB' : 'rgba(5,14,36,0.4)', fontFamily: FONT }}
                >
                  <MessageCircle className="w-4 h-4" />
                  {post.commentCount}
                </button>
              </div>
            </div>

            {/* Comments panel */}
            {expandedComments === post.id && (
              <CommentsPanel
                postId={post.id}
                onCommentAdded={() => setPosts(prev => prev.map(p => p.id === post.id ? { ...p, commentCount: p.commentCount + 1 } : p))}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   COMMENTS PANEL
   ═══════════════════════════════════════════════ */
function CommentsPanel({ postId, onCommentAdded }: { postId: string; onCommentAdded: () => void }) {
  const toast = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/feed/posts/${postId}/comments`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        if (!cancelled) setComments(data.comments ?? [])
      } catch {
        if (!cancelled) toast('Failed to load comments')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [postId, toast])

  useEffect(() => {
    if (!loading) inputRef.current?.focus()
  }, [loading])

  async function submit() {
    const content = text.trim()
    if (!content || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/feed/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setComments(prev => [...prev, data.comment])
      setText('')
      onCommentAdded()
    } catch {
      toast('Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="bg-white ml-6 mt-0"
      style={{ border: '1px solid rgba(5,14,36,0.06)', borderTop: 'none', borderRadius: '0 0 12px 12px', padding: '12px 20px 16px' }}
    >
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          {comments.length === 0 && (
            <p className="text-center py-3" style={{ fontSize: 12, color: 'rgba(5,14,36,0.35)', fontFamily: FONT }}>No comments yet</p>
          )}
          <div className="space-y-3 mb-3">
            {comments.map(c => (
              <div key={c.id} className="flex gap-2.5">
                <Avatar initials={getInitials(c.author)} size={24} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0B1224', fontFamily: FONT }}>{getDisplayName(c.author)}</span>
                    <span style={{ fontSize: 11, color: 'rgba(5,14,36,0.35)', fontFamily: FONT }}>{timeAgo(c.createdAt)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(5,14,36,0.6)', fontFamily: FONT, margin: 0, lineHeight: 1.5 }}>{c.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Comment input */}
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="Write a comment..."
              className="flex-1 outline-none"
              style={{
                backgroundColor: '#F9FAFB',
                border: '1px solid rgba(5,14,36,0.06)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 13,
                fontWeight: 400,
                color: '#0B1224',
                fontFamily: FONT,
              }}
            />
            <button
              onClick={submit}
              disabled={!text.trim() || submitting}
              className="flex items-center justify-center w-8 h-8 rounded-[8px] border-0 cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#2563EB' }}
            >
              {submitting ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" /> : <Send className="w-3.5 h-3.5 text-white" />}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   GROUPS SECTION (real API)
   ═══════════════════════════════════════════════ */
type Group = { id: string; name: string; description: string; memberCount: number; joined: boolean; isOwn: boolean }

function GroupsSection() {
  const toast = useToast()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Fetch groups
  const fetchGroups = useCallback(async (q?: string) => {
    try {
      const url = q ? `/api/feed/groups?q=${encodeURIComponent(q)}` : '/api/feed/groups'
      const res = await fetch(url)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setGroups(data.groups ?? [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchGroups() }, [fetchGroups])

  // Debounced search
  function handleSearch(value: string) {
    setSearch(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchGroups(value.trim() || undefined), 300)
  }

  // Toggle join/leave
  async function toggleJoin(groupId: string) {
    setTogglingId(groupId)
    // Optimistic
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, joined: !g.joined, memberCount: g.joined ? g.memberCount - 1 : g.memberCount + 1 } : g
    ))
    try {
      const res = await fetch(`/api/feed/groups/${groupId}/join`, { method: 'POST' })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, joined: data.joined, memberCount: data.memberCount } : g
      ))
    } catch {
      // Revert
      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, joined: !g.joined, memberCount: g.joined ? g.memberCount - 1 : g.memberCount + 1 } : g
      ))
      toast('Failed to update membership')
    } finally {
      setTogglingId(null)
    }
  }

  // Create group
  async function handleCreate() {
    if (!newName.trim() || !newDesc.trim() || creating) return
    setCreating(true)
    try {
      const res = await fetch('/api/feed/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? 'Failed') }
      const data = await res.json()
      setGroups(prev => [data.group, ...prev])
      setNewName('')
      setNewDesc('')
      setShowCreate(false)
      toast('Group created')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create group')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      {/* Search + Create */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-[400px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'rgba(5,14,36,0.4)' }} />
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full outline-none transition-colors"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid rgba(5,14,36,0.06)', borderRadius: 8, paddingLeft: 40, paddingRight: 16, paddingTop: 10, paddingBottom: 10, fontSize: 14, fontFamily: FONT, color: 'rgba(5,14,36,0.65)' }}
          />
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-[8px] text-[0.84rem] font-[600] cursor-pointer transition-colors border-0"
          style={{ backgroundColor: '#2563EB', color: '#FFFFFF', fontFamily: FONT }}
        >
          Create Group
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white mb-5 p-5" style={{ border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10 }}>
          <div className="mb-3">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Group name"
              className="w-full outline-none"
              style={{ border: '1px solid rgba(5,14,36,0.06)', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontFamily: FONT, color: '#0B1224' }}
            />
          </div>
          <div className="mb-3">
            <textarea
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="What is this group about?"
              rows={2}
              className="w-full outline-none resize-none"
              style={{ border: '1px solid rgba(5,14,36,0.06)', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontFamily: FONT, color: '#0B1224' }}
            />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => { setShowCreate(false); setNewName(''); setNewDesc('') }} className="px-4 py-2 rounded-[8px] text-[0.84rem] cursor-pointer border-0 bg-transparent" style={{ color: 'rgba(5,14,36,0.5)', fontFamily: FONT }}>
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || !newDesc.trim() || creating}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[8px] text-[0.84rem] font-[600] cursor-pointer transition-colors border-0 disabled:opacity-40"
              style={{ backgroundColor: '#2563EB', color: '#FFFFFF', fontFamily: FONT }}
            >
              {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Create
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 gap-4 community-groups">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white" style={{ border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10, padding: 20 }}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg animate-pulse" style={{ background: 'rgba(5,14,36,0.06)' }} />
                <div className="flex-1">
                  <div className="h-3 w-28 rounded animate-pulse mb-1.5" style={{ background: 'rgba(5,14,36,0.06)' }} />
                  <div className="h-2 w-20 rounded animate-pulse" style={{ background: 'rgba(5,14,36,0.04)' }} />
                </div>
              </div>
              <div className="h-2.5 w-full rounded animate-pulse mb-1.5" style={{ background: 'rgba(5,14,36,0.04)' }} />
              <div className="h-2.5 w-2/3 rounded animate-pulse" style={{ background: 'rgba(5,14,36,0.04)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 bg-white" style={{ border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10 }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(37,99,235,0.08)' }}>
            <Users className="w-7 h-7 text-[#2563EB]" />
          </div>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#0B1224', fontFamily: FONT }} className="mb-1">
            {search ? 'No groups found' : 'No groups yet'}
          </p>
          <p style={{ fontSize: 14, fontWeight: 400, color: 'rgba(5,14,36,0.5)', fontFamily: FONT }} className="mb-6">
            {search ? 'Try a different search term.' : 'Create the first group and invite other wholesalers.'}
          </p>
        </div>
      )}

      {/* Grid */}
      {!loading && groups.length > 0 && (
        <div className="grid grid-cols-2 gap-4 community-groups">
          {groups.map(g => (
            <div
              key={g.id}
              className="bg-white flex flex-col transition-all"
              style={{ border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10, padding: '20px' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(5,14,36,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(37,99,235,0.08)' }}>
                  <Users style={{ width: 18, height: 18, color: '#2563EB' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0B1224', fontFamily: FONT, marginBottom: 2 }}>{g.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 400, color: 'rgba(5,14,36,0.4)', fontFamily: FONT }}>{g.memberCount.toLocaleString()} {g.memberCount === 1 ? 'member' : 'members'}</div>
                </div>
              </div>
              <p className="leading-relaxed mb-4 flex-1" style={{ fontSize: 14, fontWeight: 400, color: 'rgba(5,14,36,0.65)', fontFamily: FONT }}>{g.description}</p>
              <button
                onClick={() => toggleJoin(g.id)}
                disabled={togglingId === g.id}
                className="w-full cursor-pointer transition-all disabled:opacity-60"
                style={{
                  padding: '8px 0', borderRadius: 8, fontSize: 14, fontWeight: 600, fontFamily: FONT,
                  backgroundColor: g.joined ? '#FFFFFF' : '#2563EB',
                  border: g.joined ? '1px solid rgba(5,14,36,0.06)' : '1px solid #2563EB',
                  color: g.joined ? 'rgba(5,14,36,0.65)' : '#FFFFFF',
                }}
              >
                {g.joined ? (
                  <span className="flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" /> Joined</span>
                ) : 'Join Group'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MESSAGES SECTION (Direct Messages)
   ═══════════════════════════════════════════════ */
/* ─── DM types ─── */
type DMUser = { id: string; firstName: string | null; lastName: string | null; avatarUrl: string | null; company?: string | null }
type ConvoSummary = { id: string; otherUser: DMUser | null; lastMessage: { content: string; createdAt: string; senderId: string } | null; unread: boolean; updatedAt: string }
type DMMessage = { id: string; content: string; senderId: string; sender: DMUser; createdAt: string; isOwn: boolean }

function MessagesSection() {
  const toast = useToast()

  // Conversation list state
  const [convos, setConvos] = useState<ConvoSummary[]>([])
  const [loadingConvos, setLoadingConvos] = useState(true)
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null)

  // Messages state
  const [messages, setMessages] = useState<DMMessage[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [msgText, setMsgText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  // New conversation modal
  const [showNewConvo, setShowNewConvo] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [searchResults, setSearchResults] = useState<DMUser[]>([])
  const [searching, setSearching] = useState(false)
  const searchDebounce = useRef<NodeJS.Timeout>()

  // ── Load conversations ──
  const fetchConvos = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/conversations')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setConvos(data.conversations ?? [])
    } catch {
      // silent
    } finally {
      setLoadingConvos(false)
    }
  }, [])

  useEffect(() => { fetchConvos() }, [fetchConvos])

  // ── Load messages for active conversation ──
  const fetchMessages = useCallback(async (convoId: string) => {
    setLoadingMsgs(true)
    try {
      const res = await fetch(`/api/messages/conversations/${convoId}?limit=100`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setMessages(data.messages ?? [])
      // Mark as read in local state
      setConvos(prev => prev.map(c => c.id === convoId ? { ...c, unread: false } : c))
    } catch {
      toast('Failed to load messages')
    } finally {
      setLoadingMsgs(false)
    }
  }, [toast])

  useEffect(() => {
    if (activeConvoId) fetchMessages(activeConvoId)
  }, [activeConvoId, fetchMessages])

  // ── Poll for new messages every 10s ──
  useEffect(() => {
    if (!activeConvoId) return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages/conversations/${activeConvoId}?limit=100`)
        if (!res.ok) return
        const data = await res.json()
        setMessages(data.messages ?? [])
      } catch {
        // silent
      }
      // Also refresh convo list for unread indicators
      try {
        const res = await fetch('/api/messages/conversations')
        if (!res.ok) return
        const data = await res.json()
        setConvos(data.conversations ?? [])
      } catch {
        // silent
      }
    }, 10000)
    return () => clearInterval(interval)
  }, [activeConvoId])

  // ── Auto-scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ──
  async function handleSend() {
    const text = msgText.trim()
    if (!text || sending || !activeConvoId) return
    setSending(true)
    try {
      const res = await fetch(`/api/messages/conversations/${activeConvoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? 'Failed') }
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      setMsgText('')
      // Update conversation list
      setConvos(prev => prev.map(c =>
        c.id === activeConvoId
          ? { ...c, lastMessage: { content: text, createdAt: data.message.createdAt, senderId: data.message.senderId }, updatedAt: data.message.createdAt }
          : c,
      ))
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  // ── User search for new conversation ──
  function handleUserSearch(q: string) {
    setUserSearch(q)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    if (q.trim().length < 2) { setSearchResults([]); return }
    searchDebounce.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/messages/users?q=${encodeURIComponent(q.trim())}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        setSearchResults(data.users ?? [])
      } catch {
        // silent
      } finally {
        setSearching(false)
      }
    }, 300)
  }

  // ── Start conversation with a user ──
  async function startConversation(targetUser: DMUser) {
    setShowNewConvo(false)
    setUserSearch('')
    setSearchResults([])
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: targetUser.id }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? 'Failed') }
      const data = await res.json()
      const convo = data.conversation as ConvoSummary
      // Add to list if not present
      setConvos(prev => {
        const exists = prev.find(c => c.id === convo.id)
        if (exists) return prev
        return [convo, ...prev]
      })
      setActiveConvoId(convo.id)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to start conversation')
    }
  }

  // ── Helpers ──
  const activeConvo = convos.find(c => c.id === activeConvoId)
  const activeOther = activeConvo?.otherUser
  const unreadCount = convos.filter(c => c.unread).length

  function getUserInitials(u: DMUser | null | undefined): string {
    if (!u) return '??'
    if (u.firstName && u.lastName) return `${u.firstName[0]}${u.lastName[0]}`.toUpperCase()
    if (u.firstName) return u.firstName.slice(0, 2).toUpperCase()
    return '??'
  }
  function getUserName(u: DMUser | null | undefined): string {
    if (!u) return 'Unknown'
    if (u.firstName) return `${u.firstName} ${u.lastName ?? ''}`.trim()
    return 'Anonymous'
  }

  return (
    <div className="bg-white overflow-hidden flex community-inbox" style={{ height: 520, border: '1px solid rgba(5,14,36,0.06)', borderRadius: 10 }}>
      {/* ── Left panel: conversation list ── */}
      <div className="w-[320px] flex flex-col flex-shrink-0 community-inbox-list" style={{ borderRight: '1px solid rgba(5,14,36,0.06)' }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(5,14,36,0.06)' }}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(5,14,36,0.4)' }} />
            <input type="text" placeholder="Search messages..." className="w-full outline-none"
              style={{ backgroundColor: '#F9FAFB', border: '1px solid rgba(5,14,36,0.06)', borderRadius: 8, paddingLeft: 36, paddingRight: 12, paddingTop: 8, paddingBottom: 8, fontSize: 14, fontFamily: FONT, color: 'rgba(5,14,36,0.65)' }}
            />
          </div>
          <button
            onClick={() => setShowNewConvo(true)}
            className="flex items-center justify-center w-8 h-8 rounded-[8px] border-0 cursor-pointer transition-colors"
            style={{ backgroundColor: '#2563EB' }}
            title="New conversation"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvos && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          )}
          {!loadingConvos && convos.length === 0 && (
            <div className="text-center py-12 px-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" style={{ color: 'rgba(5,14,36,0.4)' }} />
              <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(5,14,36,0.4)', fontFamily: FONT, margin: 0 }}>No conversations yet</p>
              <button
                onClick={() => setShowNewConvo(true)}
                className="mt-3 border-0 cursor-pointer transition-colors"
                style={{ fontSize: 13, fontWeight: 600, color: '#2563EB', fontFamily: FONT, backgroundColor: 'transparent' }}
              >
                Start a conversation
              </button>
            </div>
          )}
          {convos.map(c => (
            <button key={c.id} onClick={() => setActiveConvoId(c.id)} className="w-full flex items-center gap-3 px-4 py-3.5 cursor-pointer border-0 text-left transition-colors"
              style={{ backgroundColor: activeConvoId === c.id ? 'rgba(37,99,235,0.08)' : '#FFFFFF' }}
              onMouseEnter={e => { if (activeConvoId !== c.id) (e.currentTarget as HTMLElement).style.backgroundColor = '#F9FAFB' }}
              onMouseLeave={e => { if (activeConvoId !== c.id) (e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF' }}
            >
              <div className="relative flex-shrink-0">
                <Avatar initials={getUserInitials(c.otherUser)} size={32} />
                {c.unread && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ backgroundColor: '#2563EB' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span style={{ fontSize: 14, fontWeight: c.unread ? 600 : 400, color: '#0B1224', fontFamily: FONT }}>{getUserName(c.otherUser)}</span>
                  <span className="flex-shrink-0" style={{ fontSize: 12, color: 'rgba(5,14,36,0.4)', fontFamily: FONT }}>
                    {c.lastMessage ? timeAgo(c.lastMessage.createdAt) : ''}
                  </span>
                </div>
                <p className="truncate" style={{ fontSize: 12, color: c.unread ? 'rgba(5,14,36,0.65)' : 'rgba(5,14,36,0.4)', fontFamily: FONT, margin: 0 }}>
                  {c.lastMessage?.content ?? 'No messages yet'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right panel: messages ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeConvoId ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center">
            <MessageSquare className="w-10 h-10 mb-3" style={{ color: 'rgba(5,14,36,0.12)' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(5,14,36,0.3)', fontFamily: FONT, margin: 0, marginBottom: 4 }}>Start a conversation</p>
            <p style={{ fontSize: 13, color: 'rgba(5,14,36,0.25)', fontFamily: FONT, margin: 0 }}>Select a conversation or message someone new</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid rgba(5,14,36,0.06)' }}>
              {/* Back button on mobile */}
              <button
                onClick={() => setActiveConvoId(null)}
                className="md:hidden flex items-center justify-center w-7 h-7 rounded-[6px] border-0 bg-transparent cursor-pointer"
                style={{ color: 'rgba(5,14,36,0.5)' }}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <Avatar initials={getUserInitials(activeOther)} size={32} />
              <span style={{ fontSize: 15, fontWeight: 600, color: '#0B1224', fontFamily: FONT }}>{getUserName(activeOther)}</span>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p style={{ fontSize: 13, color: 'rgba(5,14,36,0.3)', fontFamily: FONT }}>No messages yet. Say hello!</p>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%] px-4 py-2.5"
                      style={{
                        borderRadius: msg.isOwn ? '16px 16px 6px 16px' : '16px 16px 16px 6px',
                        backgroundColor: msg.isOwn ? '#2563EB' : '#F3F4F6',
                        color: msg.isOwn ? '#FFFFFF' : '#0B1224',
                      }}
                    >
                      <p style={{ fontSize: 14, fontFamily: FONT, margin: 0, lineHeight: 1.6 }}>{msg.content}</p>
                      <p style={{ fontSize: 11, marginTop: 4, marginBottom: 0, color: msg.isOwn ? '#BFDBFE' : 'rgba(5,14,36,0.4)', fontFamily: FONT }}>
                        {timeAgo(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="px-4 py-3" style={{ borderTop: '1px solid rgba(5,14,36,0.06)' }}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  placeholder="Type a message..."
                  className="flex-1 outline-none"
                  style={{ backgroundColor: '#F9FAFB', border: '1px solid rgba(5,14,36,0.06)', borderRadius: 8, padding: '10px 16px', fontSize: 14, fontFamily: FONT, color: '#0B1224' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!msgText.trim() || sending}
                  className="text-white border-0 cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{ backgroundColor: '#2563EB', borderRadius: 8, padding: 10 }}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── New conversation modal ── */}
      {showNewConvo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(5,14,36,0.4)' }}>
          <div className="bg-white w-full max-w-[420px] mx-4" style={{ borderRadius: 12, boxShadow: '0 20px 60px rgba(5,14,36,0.2)' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(5,14,36,0.06)' }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#0B1224', fontFamily: FONT }}>New Conversation</span>
              <button onClick={() => { setShowNewConvo(false); setUserSearch(''); setSearchResults([]) }}
                className="flex items-center justify-center w-7 h-7 rounded-[6px] border-0 bg-transparent cursor-pointer hover:bg-[rgba(5,14,36,0.04)]"
                style={{ color: 'rgba(5,14,36,0.4)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgba(5,14,36,0.4)' }} />
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => handleUserSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  autoFocus
                  className="w-full outline-none"
                  style={{ backgroundColor: '#F9FAFB', border: '1px solid rgba(5,14,36,0.06)', borderRadius: 8, paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10, fontSize: 14, fontFamily: FONT, color: '#0B1224' }}
                />
              </div>
              <div className="mt-3 max-h-[280px] overflow-y-auto">
                {searching && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-300" />
                  </div>
                )}
                {!searching && userSearch.trim().length >= 2 && searchResults.length === 0 && (
                  <p className="text-center py-6" style={{ fontSize: 13, color: 'rgba(5,14,36,0.4)', fontFamily: FONT }}>No users found</p>
                )}
                {searchResults.map(u => (
                  <button
                    key={u.id}
                    onClick={() => startConversation(u)}
                    className="w-full flex items-center gap-3 px-3 py-3 cursor-pointer border-0 text-left transition-colors rounded-[8px] hover:bg-[#F9FAFB]"
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <Avatar initials={getUserInitials(u)} size={36} />
                    <div className="flex-1 min-w-0">
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#0B1224', fontFamily: FONT }}>{getUserName(u)}</div>
                      {u.company && (
                        <div style={{ fontSize: 12, color: 'rgba(5,14,36,0.4)', fontFamily: FONT }}>{u.company}</div>
                      )}
                    </div>
                    <MessageSquare className="w-4 h-4 flex-shrink-0" style={{ color: '#2563EB' }} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════
   MAIN COMMUNITY PAGE
   ═══════════════════════════════════════════════ */
export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<Tab>('feed')

  return (
    <div className="bg-[#F9FAFB]" data-tour="community-content">
      <div
        className="flex-shrink-0 bg-white"
        style={{ borderBottom: '1px solid rgba(5,14,36,0.06)' }}
      >
        <div className="px-8">
          <nav className="flex gap-0.5 -mb-px">
            {pageTabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    fontFamily: "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
                    fontSize: '13px',
                    fontWeight: isActive ? 550 : 420,
                    letterSpacing: '-0.005em',
                  }}
                  className={`relative flex items-center gap-1.5 px-3 py-3 cursor-pointer border-0 bg-transparent transition-all ${
                    isActive
                      ? 'text-[#0B1224]'
                      : 'text-[rgba(5,14,36,0.4)] hover:text-[rgba(5,14,36,0.7)]'
                  }`}
                >
                  <Icon
                    className="flex-shrink-0"
                    style={{
                      width: 14,
                      height: 14,
                      strokeWidth: isActive ? 2 : 1.6,
                      color: isActive ? '#2563EB' : 'rgba(5,14,36,0.3)',
                      transition: 'color 0.18s ease',
                    }}
                  />
                  {tab.label}
                  {isActive && (
                    <div style={{ position: 'absolute', bottom: -1, left: 12, right: 12, height: 2, borderRadius: 1, background: '#2563EB' }} />
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="p-8 max-w-[1200px]">

      {activeTab === 'feed' && <FeedSection />}
      {activeTab === 'groups' && <GroupsSection />}
      {activeTab === 'messages' && <MessagesSection />}

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 900px) {
          .community-groups { grid-template-columns: 1fr !important; }
          .community-inbox { flex-direction: column !important; height: auto !important; }
          .community-inbox-list { width: 100% !important; max-height: 250px; border-right: none !important; border-bottom: 1px solid rgba(5,14,36,0.06); }
        }
      ` }} />
      </div>
    </div>
  )
}
