export type TicketStatus = 'OPEN' | 'RESOLVED' | 'CLOSED'

export type TicketCategory =
  | 'GENERAL_QUESTION'
  | 'TECHNICAL_QUESTION'
  | 'REFUND_REQUEST'

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

export function statusLabel(status: TicketStatus): string {
  switch (status) {
    case 'OPEN':
      return 'Open'
    case 'RESOLVED':
      return 'Resolved'
    case 'CLOSED':
      return 'Closed'
  }
}

export function categoryLabel(category: TicketCategory | null): string {
  switch (category) {
    case 'GENERAL_QUESTION':
      return 'General question'
    case 'TECHNICAL_QUESTION':
      return 'Technical question'
    case 'REFUND_REQUEST':
      return 'Refund request'
    default:
      return 'Uncategorized'
  }
}