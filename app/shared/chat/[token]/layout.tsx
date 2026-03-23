import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'

type Props = {
  params: Promise<{ token: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params

  const conversation = await prisma.chatConversation.findUnique({
    where: { shareToken: token },
    select: {
      title: true,
      summary: true,
      messages: true,
      sharedAt: true,
    },
  })

  if (!conversation || !conversation.sharedAt) {
    return {
      title: 'Conversation Unavailable | DealFlow AI',
    }
  }

  // Build description from summary or first message
  let description = conversation.summary || ''
  if (!description && Array.isArray(conversation.messages)) {
    const first = (conversation.messages as Array<{ role: string; content: string }>).find(
      (m) => m.role === 'user',
    )
    if (first) {
      description = first.content.slice(0, 120) + (first.content.length > 120 ? '...' : '')
    }
  }

  return {
    title: `${conversation.title} | DealFlow AI`,
    description,
    openGraph: {
      title: conversation.title,
      description: description || 'A shared conversation from DealFlow AI',
      type: 'article',
      images: ['/og-chat.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: conversation.title,
      description: description || 'A shared conversation from DealFlow AI',
      images: ['/og-chat.png'],
    },
  }
}

export default function SharedChatLayout({ children }: { children: React.ReactNode }) {
  return children
}
