import {
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type SortingState,
  type Updater,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Ticket, TicketStatus, TicketCategory } from '@/lib/tickets'
import { statusLabel, categoryLabel } from '@/lib/tickets'

const features = tableFeatures({ rowSortingFeature })

const columns: ColumnDef<typeof features, Ticket>[] = [
  {
    accessorKey: 'subject',
    header: 'Subject',
    cell: (info) => <span className="font-medium">{info.getValue<string>()}</span>,
  },
  {
    accessorKey: 'senderName',
    header: 'Sender',
    cell: (info) => {
      const ticket = info.row.original
      return (
        <div className="flex flex-col leading-tight">
          <span className="text-zinc-900">{ticket.senderName}</span>
          <span className="text-zinc-400">{ticket.senderEmail}</span>
        </div>
      )
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: (info) => statusBadge(info.getValue<TicketStatus>()),
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: (info) => categoryBadge(info.getValue<TicketCategory | null>()),
  },
  {
    accessorKey: 'createdAt',
    header: 'Received',
    cell: (info) => (
      <span className="text-zinc-600">
        {new Date(info.getValue<string>()).toLocaleDateString()}
      </span>
    ),
  },
]

function sortIndicator(sorted: false | 'asc' | 'desc') {
  if (sorted === 'asc') {
    return <ArrowUp className="size-3" />
  }
  if (sorted === 'desc') {
    return <ArrowDown className="size-3" />
  }
  return <ArrowUpDown className="size-3 text-zinc-400" />
}

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

function TicketsTable({
  tickets,
  sorting,
  onSortingChange,
}: {
  tickets: Ticket[]
  sorting: SortingState
  onSortingChange: (sorting: Updater<SortingState>) => void
}) {
  const table = useTable({
    features,
    columns,
    data: tickets,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
  })

  return (
    <Table className="text-[13px] [&_td]:py-2.5 [&_th]:h-8">
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} className="h-8">
                {header.isPlaceholder ? null : (
                  <button
                    type="button"
                    onClick={header.column.getToggleSortingHandler()}
                    className="flex cursor-pointer items-center gap-1 select-none"
                  >
                    <table.FlexRender header={header} />
                    {sortIndicator(header.column.getIsSorted())}
                  </button>
                )}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={
                  cell.column.id === 'senderName' ? 'whitespace-normal' : undefined
                }
              >
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export { TicketsTable, TicketsTableSkeleton }