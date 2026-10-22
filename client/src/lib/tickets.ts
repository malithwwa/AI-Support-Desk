import type { TicketStatus, TicketCategory, ReplySenderType } from './constants'

export type {
  TicketStatus,
  TicketCategory,
  ReplySenderType,
} from './constants'
export { statusLabel, categoryLabel, senderTypeLabel } from './constants'

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

export interface TicketAssignee {
  id: string
  name: string
  email: string
}

export interface TicketReply {
  id: number
  ticketId: number
  userId: string
  user: TicketAssignee
  senderType: ReplySenderType
  body: string
  createdAt: string
}

export interface TicketDetail extends Ticket {
  assignedTo: TicketAssignee | null
  replies: TicketReply[]
}
