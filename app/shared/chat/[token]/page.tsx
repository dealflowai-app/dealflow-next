'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Bot, User, Share2, ExternalLink } from 'lucide-react'

interface SharedMessage {
  role: string
  content: string
  timestamp?: string
}

interface SharedConversation {
  title: string
  messages: SharedMessage[]
  summary: string | null
  sharedAt: string
  createdAt: string
  sharedBy: {
    firstName: string | null
    company: string | null
  }
}

export default function SharedChatPage() {
  const { token } = useParams<{ token: string }>()
  const [conversation, setConversation] = useState<SharedConversation | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token) return
    fetch(`/api/shared/chat/${token}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then((data) => {
        if (data) setConversation(data)
        setLoading(false)
      })
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [token])

  useEffect(() => {
    if (conversation) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
    }
  }, [conversation])

  // Update document title for OG
  useEffect(() => {
    if (conversation?.title) {
      document.title = `${conversation.title} | DealFlow AI`
    }
  }, [conversation?.title])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#E5E7EB]" />
          <div className="h-4 w-32 bg-[#E5E7EB] rounded" />
        </div>
      </div>
    )
  }

  if (notFound || !conversation) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mx-auto mb-4">
            <Share2 className="w-8 h-8 text-[#9CA3AF]" />
          </div>
          <h1
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            className="text-2xl text-[#0B1224] mb-2"
          >
            Conversation Unavailable
          </h1>
          <p className="text-[#6B7280] mb-6">
            This conversation is no longer available. The owner may have revoked the share link.
          </p>
          <a
            href="https://dealflow.ai"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-sm rounded-lg hover:bg-[#1D4ED8] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Visit DealFlow AI
          </a>
        </div>
      </div>
    )
  }

  const attribution = [
    conversation.sharedBy.firstName,
    conversation.sharedBy.company ? `from ${conversation.sharedBy.company}` : null,
  ]
    .filter(Boolean)
    .join(' ')

  const sharedDate = new Date(conversation.sharedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E7EB] px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center">
              <Share2 className="w-4 h-4 text-[#6B7280]" />
            </div>
            <span className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
              Shared Conversation
            </span>
          </div>
          <h1
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
            className="text-xl text-[#0B1224] mb-1"
          >
            {conversation.title}
          </h1>
          <p className="text-xs text-[#9CA3AF]">
            {attribution ? `Shared by ${attribution}` : 'Shared'} on {sharedDate}
          </p>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
          {conversation.messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((msg, i) => (
              <div key={i} className="flex gap-3">
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'assistant'
                      ? 'bg-[#F3F4F6]'
                      : 'bg-[#2563EB]'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <Bot className="w-4 h-4 text-[#6B7280]" />
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-[#374151]">
                      {msg.role === 'assistant' ? 'DealFlow AI' : 'User'}
                    </span>
                    {msg.timestamp && (
                      <span className="text-[10px] text-[#9CA3AF]">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[#374151] leading-relaxed prose-sm max-w-none">
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-2">
                              <table className="min-w-full text-xs border-collapse">
                                {children}
                              </table>
                            </div>
                          ),
                          thead: ({ children }) => (
                            <thead className="border-b border-[#E5E7EB] font-semibold text-[#111827]">
                              {children}
                            </thead>
                          ),
                          th: ({ children }) => (
                            <th className="px-2 py-1.5 text-left">{children}</th>
                          ),
                          td: ({ children }) => (
                            <td className="px-2 py-1.5">{children}</td>
                          ),
                          code: ({ children, className }) => {
                            const isBlock = className?.includes('language-')
                            if (isBlock) {
                              return (
                                <pre className="bg-[#F3F4F6] rounded-lg p-3 my-2 overflow-x-auto text-xs">
                                  <code>{children}</code>
                                </pre>
                              )
                            }
                            return (
                              <code className="bg-[#F3F4F6] px-1 py-0.5 rounded text-xs">
                                {children}
                              </code>
                            )
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Footer CTA */}
      <footer className="border-t border-[#E5E7EB] bg-white px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#6B7280]" />
            </div>
            <div>
              <p className="text-xs font-medium text-[#374151]">
                Powered by DealFlow AI
              </p>
              <p className="text-[10px] text-[#9CA3AF]">
                The AI-powered wholesaling platform
              </p>
            </div>
          </div>
          <a
            href="https://dealflow.ai"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2563EB] text-white text-xs rounded-md hover:bg-[#1D4ED8] transition-colors"
          >
            Learn More
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  )
}
