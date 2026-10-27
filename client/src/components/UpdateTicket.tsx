import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios, { isAxiosError } from 'axios'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  categoryLabel,
  statusLabel,
  type TicketCategory,
  type TicketStatus,
} from '@/lib/constants'
import type { TicketDetail } from '@/lib/tickets'
import type { UpdateTicketInput } from '@helpdesk/core'

const UNASSIGNED = 'UNASSIGNED'
const UNCATEGORIZED = 'UNCATEGORIZED'

interface AssignableUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'AGENT'
}

interface UsersResponse {
  users: AssignableUser[]
}

async function fetchAgents() {
  const { data } = await axios.get<UsersResponse>('/api/users', {
    withCredentials: true,
  })
  return data.users.filter((user) => user.role === 'AGENT')
}

async function updateTicket(id: number, patch: UpdateTicketInput) {
  const { data } = await axios.patch<{ ticket: TicketDetail }>(
    `/api/tickets/${id}`,
    patch,
    { withCredentials: true },
  )
  return data.ticket
}

function UpdateTicket({ ticket }: { ticket: TicketDetail }) {
  const queryClient = useQueryClient()

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
  })

  const updateMutation = useMutation({
    mutationFn: (patch: UpdateTicketInput) => updateTicket(ticket.id, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', ticket.id], updated)
    },
  })

  const updateError = updateMutation.isError
    ? isAxiosError(updateMutation.error)
      ? (updateMutation.error.response?.data?.error ?? 'Failed to update ticket')
      : 'Failed to update ticket'
    : null

  return (
    <div className="flex flex-col items-end gap-4">
      <div className="flex w-44 flex-col gap-1">
        <span className="text-[13px] text-zinc-500">Status</span>
        <Select
          value={ticket.status}
          onValueChange={(value) =>
            updateMutation.mutate({ status: value as TicketStatus })
          }
          disabled={updateMutation.isPending}
        >
          <SelectTrigger className="w-full text-[13px]" aria-label="Ticket status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            {TICKET_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-44 flex-col gap-1">
        <span className="text-[13px] text-zinc-500">Category</span>
        <Select
          value={ticket.category ?? UNCATEGORIZED}
          onValueChange={(value) =>
            updateMutation.mutate({
              category: value === UNCATEGORIZED ? null : (value as TicketCategory),
            })
          }
          disabled={updateMutation.isPending}
        >
          <SelectTrigger className="w-full text-[13px]" aria-label="Ticket category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={UNCATEGORIZED}>{categoryLabel(null)}</SelectItem>
            {TICKET_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>
                {categoryLabel(category)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-44 flex-col gap-1">
        <span className="text-[13px] text-zinc-500">Assigned to</span>
        <Select
          value={ticket.assignedTo?.id ?? UNASSIGNED}
          onValueChange={(value) =>
            updateMutation.mutate({
              assignedToId: value === UNASSIGNED ? null : value,
            })
          }
          disabled={updateMutation.isPending}
        >
          <SelectTrigger className="w-full text-[13px]" aria-label="Assign ticket">
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {(agents ?? []).map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {updateError && <p className="text-[13px] text-destructive">{updateError}</p>}
    </div>
  )
}

export default UpdateTicket
