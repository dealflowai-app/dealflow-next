'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Plus } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ChatErrorBoundary caught:', error, info.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleNewChat = () => {
    this.setState({ hasError: false, error: null })
    window.history.replaceState(null, '', '/gpt')
    window.location.href = '/gpt'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-[var(--cream,#F9FAFB)]">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 rounded-[12px] bg-amber-50 flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>
            <h1
              style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
              className="text-2xl text-[#0B1224] mb-2"
            >
              Something went wrong
            </h1>
            <p className="text-sm text-[#6B7280] mb-6">
              The AI assistant encountered an error. Your conversation history is safe.
            </p>
            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white text-sm rounded-[8px] hover:bg-[#1D4ED8] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
              <button
                onClick={this.handleNewChat}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#374151] text-sm rounded-[8px] border border-[#D1D5DB] hover:bg-[#F9FAFB] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Start New Chat
              </button>
            </div>
            <p className="text-xs text-[#9CA3AF]">
              If this keeps happening, contact support
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
