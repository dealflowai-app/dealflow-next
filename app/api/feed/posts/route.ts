import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// ─── GET /api/feed/posts — list feed posts (paginated) ──────────────────────

export async function GET(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const searchParams = req.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)
  const cursor = searchParams.get('cursor') // post ID for cursor-based pagination

  try {
    const posts = await prisma.communityPost.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        profile: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        _count: { select: { comments: true, likes: true } },
        likes: {
          where: { profileId: profile.id },
          select: { id: true },
          take: 1,
        },
      },
    })

    const hasMore = posts.length > limit
    const items = hasMore ? posts.slice(0, limit) : posts

    const feed = items.map(p => ({
      id: p.id,
      content: p.content,
      imageUrl: p.imageUrl,
      createdAt: p.createdAt.toISOString(),
      author: {
        id: p.profile.id,
        firstName: p.profile.firstName,
        lastName: p.profile.lastName,
        avatarUrl: p.profile.avatarUrl,
      },
      likeCount: p._count.likes,
      commentCount: p._count.comments,
      liked: p.likes.length > 0,
      isOwn: p.profileId === profile.id,
    }))

    return successResponse({
      posts: feed,
      hasMore,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    })
  } catch (err) {
    logger.error('Feed fetch error', { error: err instanceof Error ? err.message : String(err) })
    return errorResponse(500, 'Failed to load feed')
  }
}

// ─── POST /api/feed/posts — create a new post ──────────────────────────────

export async function POST(req: NextRequest) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  let body: { content?: string; imageUrl?: string }
  try {
    body = await req.json()
  } catch {
    return errorResponse(400, 'Invalid JSON body')
  }

  const content = body.content?.trim()
  if (!content || content.length === 0) {
    return errorResponse(400, 'Post content is required')
  }
  if (content.length > 2000) {
    return errorResponse(400, 'Post content must be under 2000 characters')
  }

  const post = await prisma.communityPost.create({
    data: {
      profileId: profile.id,
      content,
      imageUrl: body.imageUrl ?? null,
    },
    include: {
      profile: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      _count: { select: { comments: true, likes: true } },
    },
  })

  return successResponse({
    post: {
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt.toISOString(),
      author: {
        id: post.profile.id,
        firstName: post.profile.firstName,
        lastName: post.profile.lastName,
        avatarUrl: post.profile.avatarUrl,
      },
      likeCount: 0,
      commentCount: 0,
      liked: false,
      isOwn: true,
    },
  }, 201)
}
