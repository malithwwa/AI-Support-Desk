import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios, { isAxiosError } from 'axios'
import { Link, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/lib/auth-client'
import {
  TICKET_CATEGORIES,
  TICKET_STATUSES,
  categoryLabel,
  statusLabel,
  type TicketCategory,
  type TicketStatus,
} from '@/lib/constants'
import type { TicketAssignee, TicketDetail as TicketDetailData } from '@/lib/tickets'
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

async function fetchTicket(id: number) {
  const { data } = await axios.get<{ ticket: TicketDetailData }>(`/api/tickets/${id}`, {
    withCredentials: true,
  })
  return data.ticket
}

async function fetchAgents() {
  const { data } = await axios.get<UsersResponse>('/api/users', {
    withCredentials: true,
  })
  return data.users.filter((user) => user.role === 'AGENT')
}

async function updateTicket(id: number, patch: UpdateTicketInput) {
  const { data } = await axios.patch<{ ticket: TicketDetailData }>(
    `/api/tickets/${id}`,
    patch,
    { withCredentials: true },
  )
  return data.ticket
}

function assigneeTag(assignedTo: TicketAssignee | null) {
  if (!assignedTo) {
    return <Badge variant="ghost">Unassigned</Badge>
  }
  return <Badge variant="secondary">{assignedTo.name}</Badge>
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function TicketDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-7 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
      <Skeleton className="h-40 w-full" />
    </div>
  )
}

function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const ticketId = Number(id)
  const isValidId = Number.isInteger(ticketId) && ticketId > 0

  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const isAdmin = session?.user.role === 'ADMIN'

  const { data: ticket, isLoading, error, isError } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => fetchTicket(ticketId),
    enabled: isValidId,
  })

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: fetchAgents,
    enabled: isAdmin,
  })

  const updateMutation = useMutation({
    mutationFn: (patch: UpdateTicketInput) => updateTicket(ticketId, patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(['ticket', ticketId], updated)
    },
  })

  const updateError = updateMutation.isError
    ? isAxiosError(updateMutation.error)
      ? (updateMutation.error.response?.data?.error ?? 'Failed to update ticket')
      : 'Failed to update ticket'
    : null

  const notFound =
    isError && isAxiosError(error) && error.response?.status === 404

  return (
    <main className="flex flex-col items-center p-8 text-left">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <Link
          to="/tickets"
          className="flex w-fit items-center gap-1 text-[13px] text-zinc-500 transition hover:text-zinc-900"
        >
          <ArrowLeft className="size-3.5" />
          Back to tickets
        </Link>

        {isLoading ? (
          <TicketDetailSkeleton />
        ) : notFound || (!isValidId && !isLoading) ? (
          <p className="text-[13px] text-destructive">Ticket not found</p>
        ) : error || !ticket ? (
          <p className="text-[13px] text-destructive">Failed to load ticket</p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <h1 className="text-lg font-bold wrap-break-word text-zinc-900">
                {ticket.subject}
              </h1>
              {isAdmin ? (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[13px] text-zinc-500">Status</span>
                      <Select
                        value={ticket.status}
                        onValueChange={(value) =>
                          updateMutation.mutate({ status: value as TicketStatus })
                        }
                        disabled={updateMutation.isPending}
                      >
                        <SelectTrigger
                          className="w-48 text-[13px]"
                          aria-label="Ticket status"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TICKET_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {statusLabel(status)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[13px] text-zinc-500">Category</span>
                      <Select
                        value={ticket.category ?? UNCATEGORIZED}
                        onValueChange={(value) =>
                          updateMutation.mutate({
                            category:
                              value === UNCATEGORIZED
                                ? null
                                : (value as TicketCategory),
                          })
                        }
                        disabled={updateMutation.isPending}
                      >
                        <SelectTrigger
                          className="w-48 text-[13px]"
                          aria-label="Ticket category"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNCATEGORIZED}>
                            {categoryLabel(null)}
                          </SelectItem>
                          {TICKET_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category}>
                              {categoryLabel(category)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1">
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
                        <SelectTrigger
                          className="w-48 text-[13px]"
                          aria-label="Assign ticket"
                        >
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                          {(agents ?? []).map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {updateError && (
                    <p className="text-[13px] text-destructive">{updateError}</p>
                  )}
                </div>
              ) : (
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

            <Card>
              <CardHeader>
                <CardTitle className="text-[13px] font-medium text-zinc-500">
                  From
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col leading-tight">
                  <span className="text-zinc-900">{ticket.senderName}</span>
                  <a href={`mailto:${ticket.senderEmail}`} className="link">
                    {ticket.senderEmail}
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[13px] font-medium text-zinc-500">
                  Message
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[13px] break-words whitespace-pre-wrap text-zinc-900">
                  {ticket.body}
                </p>
              </CardContent>
            </Card>

            <dl className="flex flex-wrap gap-x-8 gap-y-1 text-[13px]">
              <div className="flex gap-2">
                <dt className="text-zinc-500">Received</dt>
                <dd className="text-zinc-900">{formatDateTime(ticket.createdAt)}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-zinc-500">Last updated</dt>
                <dd className="text-zinc-900">{formatDateTime(ticket.updatedAt)}</dd>
              </div>
            </dl>
          </>
        )}
      </div>
    </main>
  )
}

export default TicketDetail
