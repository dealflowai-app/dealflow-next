/**
 * Contract Email Templates
 *
 * Re-exports from the new unified email template system.
 * Kept for backwards compatibility with lib/contracts/notifications.ts.
 */

export type { ContractEmailData } from '@/lib/emails/contract-notifications'

export {
  formatContractSentEmail,
  formatContractViewedEmail,
  formatContractSignedEmail,
  formatContractExecutedEmail,
  formatContractVoidedEmail,
} from '@/lib/emails/contract-notifications'
