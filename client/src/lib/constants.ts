export const TICKET_STATUSES = ['OPEN', 'RESOLVED', 'CLOSED'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const TICKET_CATEGORIES = [
  'GENERAL_QUESTION',
  'TECHNICAL_QUESTION',
  'REFUND_REQUEST',
] as const
export type TicketCategory = (typeof TICKET_CATEGORIES)[number]

export const TICKET_CATEGORY_FILTERS = ['UNCATEGORIZED'] as const

export const STATUS_FILTERS = ['ALL', ...TICKET_STATUSES] as const
export type StatusFilterValue = (typeof STATUS_FILTERS)[number]

export const CATEGORY_FILTERS = [
  'ALL',
  ...TICKET_CATEGORIES,
  ...TICKET_CATEGORY_FILTERS,
] as const
export type CategoryFilterValue = (typeof CATEGORY_FILTERS)[number]

export const TICKET_SORT_COLUMNS = [
  'subject',
  'senderName',
  'senderEmail',
  'status',
  'category',
  'createdAt',
  'updatedAt',
] as const
export type TicketSortColumn = (typeof TICKET_SORT_COLUMNS)[number]

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