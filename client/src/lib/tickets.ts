import type { TicketStatus, TicketCategory } from './constants'

export type { TicketStatus, TicketCategory } from './constants'
export { statusLabel, categoryLabel } from './constants'

export interface Ticket {
  id: number
  subject: string
  body: string
  bodyHtml: string | null
  status: TicketStatus
  category: TicketCategory | null
  senderName: string
  senderEmail: string
  assignedToId: string | null
  createdAt: string
  updatedAt: string
}