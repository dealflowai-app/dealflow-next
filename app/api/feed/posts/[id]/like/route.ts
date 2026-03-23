import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// ─── POST /api/feed/posts/[id]/like — toggle like ──────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id: postId } = await params

  // Check post exists
  const post = await prisma.communityPost.findUnique({ where: { id: postId }, select: { id: true } })
  if (!post) return errorResponse(404, 'Post not found')

  // Toggle: delete if exists, create if not
  const existing = await prisma.postLike.findUnique({
    where: { postId_profileId: { postId, profileId: profile.id } },
  })

  if (existing) {
    await prisma.postLike.delete({ where: { id: existing.id } })
    const count = await prisma.postLike.count({ where: { postId } })
    return successResponse({ liked: false, likeCount: count })
  } else {
    await prisma.postLike.create({ data: { postId, profileId: profile.id } })
    const count = await prisma.postLike.count({ where: { postId } })
    return successResponse({ liked: true, likeCount: count })
  }
}
