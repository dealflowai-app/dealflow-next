import { prisma } from '@/lib/prisma'

/**
 * Create an in-app notification for a user.
 *
 * Fire-and-forget — catches errors silently so it never breaks the
 * calling API route.  Call without `await` if you don't need to wait.
 */
export async function createNotification(
  profileId: string,
  type: string,
  title: string,
  body: string,
  metadata?: Record<string, string | number | boolean | null>,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        profileId,
        type,
        title,
        body,
        data: metadata ?? undefined,
      },
    })
  } catch (err) {
    // Log but never throw — notifications should never break the main action
    console.error('[createNotification] failed:', err)
  }
}
