'use client'

import { useRef, useState, useEffect, useCallback } from 'react'

// ─── Audio Player ───────────────────────────────────────────────────────────
// In-app audio player for call recordings.
// Features: play/pause, progress bar with seeking, speed control, volume,
// skip +-10s, download, and current time / duration display.

export interface AudioPlayerProps {
  /** Proxied recording URL: /api/outreach/calls/[id]/recording */
  src: string
  /** Call ID for the download filename */
  callId?: string
  /** Optional callback when playback position changes (for transcript sync) */
  onTimeUpdate?: (currentTime: number) => void
  /** Optional callback to seek to a specific time (exposed to parent) */
  seekRef?: React.MutableRefObject<((time: number) => void) | null>
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]

function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AudioPlayer({ src, callId, onTimeUpdate, seekRef }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [speed, setSpeed] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Expose seekTo function to parent
  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0))
  }, [])

  useEffect(() => {
    if (seekRef) seekRef.current = seekTo
  }, [seekRef, seekTo])

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onLoadedMetadata = () => {
      setDuration(audio.duration)
      setLoading(false)
    }
    const onTimeUpdateEvent = () => {
      setCurrentTime(audio.currentTime)
      onTimeUpdate?.(audio.currentTime)
    }
    const onEnded = () => setPlaying(false)
    const onError = () => {
      setError('Failed to load recording')
      setLoading(false)
    }
    const onCanPlay = () => setLoading(false)

    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('timeupdate', onTimeUpdateEvent)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    audio.addEventListener('canplay', onCanPlay)

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('timeupdate', onTimeUpdateEvent)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('canplay', onCanPlay)
    }
  }, [onTimeUpdate])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play()
    }
    setPlaying(!playing)
  }

  const skip = (seconds: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, audio.duration || 0))
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current
    const audio = audioRef.current
    if (!bar || !audio || !duration) return
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1))
    audio.currentTime = ratio * duration
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (audioRef.current) audioRef.current.volume = val
  }

  const cycleSpeed = () => {
    const idx = PLAYBACK_SPEEDS.indexOf(speed)
    const next = PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  if (error) {
    return (
      <div className="rounded-lg bg-gray-900 px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-gray-900 p-4">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Progress bar */}
      <div
        ref={progressRef}
        onClick={handleProgressClick}
        className="group relative mb-3 h-2 cursor-pointer rounded-full bg-gray-700"
      >
        <div
          className="h-full rounded-full bg-brand-blue-500 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white opacity-0 shadow group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progressPercent}% - 7px)` }}
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3">
        {/* Time display */}
        <span className="min-w-[4rem] text-xs text-gray-400 tabular-nums">
          {formatTime(currentTime)} / {loading ? '--:--' : formatTime(duration)}
        </span>

        {/* Skip back */}
        <button
          onClick={() => skip(-10)}
          className="text-gray-400 hover:text-white transition-colors"
          title="Back 10s"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 17l-5-5 5-5" />
            <path d="M18 17l-5-5 5-5" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          disabled={loading}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue-600 text-white hover:bg-brand-blue-500 transition-colors disabled:opacity-40"
          title={playing ? 'Pause' : 'Play'}
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>

        {/* Skip forward */}
        <button
          onClick={() => skip(10)}
          className="text-gray-400 hover:text-white transition-colors"
          title="Forward 10s"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 17l5-5-5-5" />
            <path d="M6 17l5-5-5-5" />
          </svg>
        </button>

        {/* Speed control */}
        <button
          onClick={cycleSpeed}
          className="rounded bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          title="Playback speed"
        >
          {speed}x
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Volume */}
        <div className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            {volume > 0 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
            {volume > 0.5 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-gray-700 accent-brand-blue-500"
          />
        </div>

        {/* Download */}
        <a
          href={src}
          download={`call-${callId || 'recording'}.mp3`}
          className="text-gray-400 hover:text-white transition-colors"
          title="Download recording"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </a>
      </div>
    </div>
  )
}
