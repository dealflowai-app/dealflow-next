'use client'

import { EmptyState } from './EmptyState'

// --- SVG Icons ---

const DealsIcon = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="5" y="4" width="22" height="24" rx="2" />
    <path d="M10 10h12M10 15h8M10 20h10" />
  </svg>
)

const BuyersIcon = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="16" cy="11" r="5" />
    <path d="M6 27c0-5.523 4.477-10 10-10s10 4.477 10 10" />
  </svg>
)

const CampaignsIcon = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 14l17-8v20L7 18v-4z" />
    <path d="M7 16h-2a2 2 0 01-2-2v0a2 2 0 012-2h2" />
    <path d="M24 12l3-2M24 16h3M24 20l3 2" />
  </svg>
)

const ContractsIcon = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 4H9a2 2 0 00-2 2v20a2 2 0 002 2h14a2 2 0 002-2V10l-6-6z" />
    <path d="M19 4v6h6" />
    <path d="M12 18l2 2 4-4" />
  </svg>
)

const CommunityIcon = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8h20a2 2 0 012 2v10a2 2 0 01-2 2H14l-5 4v-4H6a2 2 0 01-2-2V10a2 2 0 012-2z" />
    <path d="M11 14h1M16 14h1M21 14h1" />
  </svg>
)

const MarketplaceIcon = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10l2-6h20l2 6" />
    <rect x="4" y="10" width="24" height="4" rx="1" />
    <path d="M6 14v12a2 2 0 002 2h16a2 2 0 002-2V14" />
    <rect x="12" y="20" width="8" height="8" rx="1" />
  </svg>
)

const MessagesIcon = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6h24a2 2 0 012 2v14a2 2 0 01-2 2H10l-6 4V8a2 2 0 012-2z" />
    <path d="M10 13h12M10 17h8" />
  </svg>
)

const SavedViewsIcon = (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 6h8l2 3h10a2 2 0 012 2v13a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" />
    <path d="M12 18h8" />
  </svg>
)

// --- Pre-configured Empty States ---

export function DealEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={DealsIcon}
      title="No deals yet"
      description="Start by analyzing a property or creating your first deal."
      action={{ label: 'Create Deal', onClick: onAction, href: onAction ? undefined : '/deals/new' }}
    />
  )
}

export function BuyerEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={BuyersIcon}
      title="No buyers in your list"
      description="Import buyers from Find Buyers or add them manually."
      action={{ label: 'Find Buyers', onClick: onAction, href: onAction ? undefined : '/discovery' }}
    />
  )
}

export function CampaignEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={CampaignsIcon}
      title="No campaigns yet"
      description="Create your first outreach campaign to start connecting with buyers."
      action={{ label: 'New Campaign', onClick: onAction }}
    />
  )
}

export function ContractEmptyState() {
  return (
    <EmptyState
      icon={ContractsIcon}
      title="No contracts yet"
      description="Contracts will appear here when you move a deal to the signing stage."
    />
  )
}

export function CommunityEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={CommunityIcon}
      title="No posts yet"
      description="Be the first to share a deal win, ask a question, or drop market knowledge."
      action={{ label: 'Write a Post', onClick: onAction }}
    />
  )
}

export function MarketplaceEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={MarketplaceIcon}
      title="No listings found"
      description="Be the first to list a deal or check back soon for new opportunities."
      action={{ label: 'List a Deal', onClick: onAction }}
    />
  )
}

export function MessageEmptyState({ onAction }: { onAction?: () => void }) {
  return (
    <EmptyState
      icon={MessagesIcon}
      title="No conversations yet"
      description="Start a conversation with another wholesaler."
      action={{ label: 'New Message', onClick: onAction }}
    />
  )
}

export function SavedViewEmptyState() {
  return (
    <EmptyState
      icon={SavedViewsIcon}
      title="No saved views"
      description="Save your current filters to quickly access them later."
    />
  )
}
