import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Ticket, TicketStatus, TicketCategory } from '@/lib/tickets'
import { statusLabel, categoryLabel } from '@/lib/tickets'

function TicketsTableSkeleton() {
  return (
    <Table className="text-[13px] [&_td]:py-2.5 [&_th]:h-8">
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Sender</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Received</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell>
              <Skeleton className="h-4 w-48" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-36" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-28 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-20" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function statusBadge(status: TicketStatus) {
  return status === 'OPEN' ? (
    <Badge className="bg-zinc-900 text-white hover:bg-zinc-800">
      {statusLabel(status)}
    </Badge>
  ) : (
    <Badge variant="secondary">{statusLabel(status)}</Badge>
  )
}

function categoryBadge(category: TicketCategory | null) {
  return category ? (
    <Badge variant="outline">{categoryLabel(category)}</Badge>
  ) : (
    <Badge variant="ghost">{categoryLabel(category)}</Badge>
  )
}

function TicketsTable({ tickets }: { tickets: Ticket[] }) {
  return (
    <Table className="text-[13px] [&_td]:py-2.5 [&_th]:h-8">
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Sender</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Received</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((ticket) => (
          <TableRow key={ticket.id}>
            <TableCell className="font-medium">{ticket.subject}</TableCell>
            <TableCell className="whitespace-normal">
              <div className="flex flex-col leading-tight">
                <span className="text-zinc-900">{ticket.senderName}</span>
                <span className="text-zinc-400">{ticket.senderEmail}</span>
              </div>
            </TableCell>
            <TableCell>{statusBadge(ticket.status)}</TableCell>
            <TableCell>{categoryBadge(ticket.category)}</TableCell>
            <TableCell className="text-zinc-600">
              {new Date(ticket.createdAt).toLocaleDateString()}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { TicketsTable, TicketsTableSkeleton }