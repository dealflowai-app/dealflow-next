'use client'

import { useState, useEffect } from 'react'

const FONT = "'Satoshi', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif"

type BadgeNotificationProps = {
  icon: string
  name: string
  description: string
  onDismiss: () => void
}

export default function BadgeNotification({ icon, name, description, onDismiss }: BadgeNotificationProps) {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const enterTimer = setTimeout(() => setVisible(true), 50)

    // Auto-dismiss after 5 seconds
    const dismissTimer = setTimeout(() => {
      setExiting(true)
      setTimeout(onDismiss, 400)
    }, 5000)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(dismissTimer)
    }
  }, [onDismiss])

  function handleClose() {
    setExiting(true)
    setTimeout(onDismiss, 400)
  }

  return (
    <div
      className="fixed z-[10001]"
      style={{
        top: 24,
        left: '50%',
        transform: `translateX(-50%) translateY(${visible && !exiting ? '0' : '-120%'})`,
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div
        style={{
          background: '#0B1224',
          borderRadius: 14,
          padding: '16px 24px',
          fontFamily: FONT,
          minWidth: 300,
          maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06) inset',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Confetti particles (CSS animation) */}
        <div className="badge-confetti-container" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="badge-confetti-particle"
              style={{
                '--i': i,
                '--color': ['#2563EB', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981', '#EC4899'][i % 6],
              } as React.CSSProperties}
            />
          ))}
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: 8,
            right: 10,
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            fontSize: 16,
            cursor: 'pointer',
            padding: '2px 6px',
            lineHeight: 1,
          }}
        >
          x
        </button>

        {/* Content */}
        <div className="flex items-center gap-4">
          {/* Badge icon with glow */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'rgba(37,99,235,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              flexShrink: 0,
              boxShadow: '0 0 20px rgba(37,99,235,0.2)',
            }}
          >
            {icon}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#2563EB', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>
              Badge Earned!
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
              {name}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
              {description}
            </div>
          </div>
        </div>
      </div>

      {/* Confetti CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        .badge-confetti-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .badge-confetti-particle {
          position: absolute;
          width: 6px;
          height: 6px;
          border-radius: 1px;
          background: var(--color);
          top: 50%;
          left: 50%;
          opacity: 0;
          animation: badgeConfetti 1.2s ease-out forwards;
          animation-delay: calc(var(--i) * 0.06s);
        }
        @keyframes badgeConfetti {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform:
              translate(
                calc((var(--i) - 6) * 25px),
                calc(-30px + var(--i) * 8px)
              )
              rotate(calc(var(--i) * 90deg))
              scale(0.4);
          }
        }
      `}} />
    </div>
  )
}
