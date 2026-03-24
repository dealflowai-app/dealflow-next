import { prisma } from '@/lib/prisma'
import { emitNotification } from '@/lib/notification-emitter'
import { logger } from '@/lib/logger'

/**
 * Create an in-app notification for a user.
 *
 * Fire-and-forget — catches errors silently so it never breaks the
 * calling API route.  Call without `await` if you don't need to wait.
 *
 * Also pushes the notification to any connected SSE clients for
 * real-time delivery.
 */
export async function createNotification(
  profileId: string,
  type: string,
  title: string,
  body: string,
  metadata?: Record<string, string | number | boolean | null>,
): Promise<void> {
  try {
    const notification = await prisma.notification.create({
      data: {
        profileId,
        type,
        title,
        body,
        data: metadata ?? undefined,
      },
    })

    // Push to connected SSE clients for real-time delivery
    emitNotification(profileId, {
      type,
      title,
      body,
      data: {
        id: notification.id,
        createdAt: notification.createdAt.toISOString(),
        ...metadata,
      },
    })
  } catch (err) {
    // Log but never throw — notifications should never break the main action
    logger.error('[createNotification] failed', { error: err instanceof Error ? err.message : String(err) })
  }
}
