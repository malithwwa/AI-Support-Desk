import DOMPurify from 'isomorphic-dompurify'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { categoryLabel, statusLabel } from '@/lib/constants'
import type { Ticket, TicketAssignee } from '@/lib/tickets'

interface TicketDetailProps {
  ticket: Ticket & { assignedTo: TicketAssignee | null }
  showBadges?: boolean
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function assigneeTag(assignedTo: TicketAssignee | null) {
  if (!assignedTo) {
    return <Badge variant="ghost">Unassigned</Badge>
  }
  return <Badge variant="secondary">{assignedTo.name}</Badge>
}

function TicketDetail({ ticket, showBadges = false }: TicketDetailProps) {
  const sanitizedBody = DOMPurify.sanitize(ticket.body, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    USE_PROFILES: { html: false },
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold wrap-break-word text-zinc-900">
          {ticket.subject}
        </h1>
        {showBadges && (
          <div className="flex flex-wrap items-center gap-2">
            {ticket.status === 'OPEN' ? (
              <Badge className="bg-zinc-900 text-white hover:bg-zinc-800">
                {statusLabel(ticket.status)}
              </Badge>
            ) : (
              <Badge variant="secondary">{statusLabel(ticket.status)}</Badge>
            )}
            {ticket.category ? (
              <Badge variant="outline">{categoryLabel(ticket.category)}</Badge>
            ) : (
              <Badge variant="ghost">{categoryLabel(ticket.category)}</Badge>
            )}
            {assigneeTag(ticket.assignedTo)}
          </div>
        )}
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[13px]">
        <div className="flex gap-1.5">
          <dt className="text-zinc-500">Created</dt>
          <dd className="text-zinc-900">{formatDateTime(ticket.createdAt)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-zinc-500">Updated</dt>
          <dd className="text-zinc-900">{formatDateTime(ticket.updatedAt)}</dd>
        </div>
      </dl>

      <Card>
        <CardContent className="flex flex-col gap-1">
          <h2 className="text-sm font-bold text-zinc-900">Message</h2>
          <p className="text-[13px] text-zinc-500">
            From{' '}
            <a
              href={`mailto:${ticket.senderEmail}`}
              className="link text-[13px] text-zinc-500"
            >
              {ticket.senderName}
            </a>
          </p>
          <p className="text-[13px] wrap-break-word whitespace-pre-wrap text-zinc-900 mt-5">
            {sanitizedBody}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default TicketDetail
