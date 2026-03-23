import { NextRequest } from 'next/server'
import { getAuthProfile } from '@/lib/auth'
import { errorResponse, successResponse } from '@/lib/api-utils'
import { prisma } from '@/lib/prisma'

// ─── DELETE /api/feed/posts/[id] — delete own post ─────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { profile, error, status } = await getAuthProfile()
  if (!profile) return errorResponse(status, error!)

  const { id: postId } = await params

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { profileId: true },
  })

  if (!post) return errorResponse(404, 'Post not found')
  if (post.profileId !== profile.id) return errorResponse(403, 'Not your post')

  await prisma.communityPost.delete({ where: { id: postId } })

  return successResponse({ deleted: true })
}
