'use client'

import { useEffect } from 'react'

/**
 * Prevents body scrolling when a modal/overlay is open.
 * Handles nested modals via a global counter.
 */

const globalForScrollLock = globalThis as unknown as { __scrollLockCount?: number }

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return

    globalForScrollLock.__scrollLockCount = (globalForScrollLock.__scrollLockCount ?? 0) + 1
    document.body.style.overflow = 'hidden'

    return () => {
      globalForScrollLock.__scrollLockCount = (globalForScrollLock.__scrollLockCount ?? 1) - 1
      if (globalForScrollLock.__scrollLockCount <= 0) {
        document.body.style.overflow = ''
        globalForScrollLock.__scrollLockCount = 0
      }
    }
  }, [locked])
}
