import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

// ─── GET /api/feed/posts/[id]/comments — list comments ─────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id: postId } = await params
  const searchParams = req.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

  const comments = await prisma.postComment.findMany({
    where: { postId },
    orderBy: { createdAt: 'asc' },
    take: limit,
    include: {
      profile: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  })

  return successResponse({
    comments: comments.map(c => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      author: {
        id: c.profile.id,
        firstName: c.profile.firstName,
        lastName: c.profile.lastName,
        avatarUrl: c.profile.avatarUrl,
      },
      isOwn: c.profileId === profile.id,
    })),
  })
}

// ─── POST /api/feed/posts/[id]/comments — add a comment ────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id: postId } = await params

  let body: { content?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const content = body.content?.trim()
  if (!content || content.length === 0) {
    return errorResponse(400, 'Comment content is required')
  }
  if (content.length > 1000) {
    return errorResponse(400, 'Comment must be under 1000 characters')
  }

  // Check post exists
  const post = await prisma.communityPost.findUnique({ where: { id: postId }, select: { id: true, profileId: true } })
  if (!post) return errorResponse(404, 'Post not found')

  const comment = await prisma.postComment.create({
    data: { postId, profileId: profile.id, content },
    include: {
      profile: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  })

  // Notify post author (don't notify yourself)
  if (post.profileId !== profile.id) {
    const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Someone'
    createNotification(
      post.profileId,
      'comment',
      `${name} commented on your post`,
      content.length > 80 ? content.slice(0, 80) + '...' : content,
      { postId, commentId: comment.id },
    )
  }

  return successResponse({
    comment: {
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      author: {
        id: comment.profile.id,
        firstName: comment.profile.firstName,
        lastName: comment.profile.lastName,
        avatarUrl: comment.profile.avatarUrl,
      },
      isOwn: true,
    },
  }, 201)
}
