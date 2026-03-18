'use client'

import { useEffect } from 'react'

export default function ScrollReveal() {
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )

    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stagger-children, .type-reveal, .strike-pill').forEach((el) => obs.observe(el))

    // Counter animation for elements with data-target
    const counterObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target as HTMLElement)
            counterObs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.3 }
    )
    document.querySelectorAll('[data-counter]').forEach((el) => counterObs.observe(el))

    return () => {
      obs.disconnect()
      counterObs.disconnect()
    }
  }, [])

  return null
}

function animateCounter(el: HTMLElement) {
  const target = parseFloat(el.dataset.target || '0')
  const suffix = el.dataset.suffix || ''
  const prefix = el.dataset.prefix || ''
  const duration = 1500
  const start = performance.now()

  function easeOutExpo(t: number) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
  }

  function tick(now: number) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    const eased = easeOutExpo(progress)
    const current = Math.round(eased * target)
    el.textContent = prefix + current + suffix
    if (progress < 1) requestAnimationFrame(tick)
  }

  requestAnimationFrame(tick)
}
