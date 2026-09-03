import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CreateUserDialog from '@/components/CreateUserDialog'
import { UsersTable, UsersTableSkeleton, type User } from '@/components/UsersTable'

interface UsersResponse {
  users: User[]
}

async function fetchUsers() {
  const { data } = await axios.get<UsersResponse>('/api/users', {
    withCredentials: true,
  })
  return data.users
}

function Users() {
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })
  const [createOpen, setCreateOpen] = useState(false)

  if (isLoading) {
    return (
      <main className="flex flex-col items-center p-8 text-left">
        <div className="w-full max-w-7xl">
          <h1 className="mb-4 text-2xl font-semibold text-zinc-900">Users</h1>
          <UsersTableSkeleton />
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="p-8 text-left">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Users</h1>
        <p className="text-[13px] text-destructive">Failed to load users</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center p-8 text-left">
      <div className="w-full max-w-7xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Users</h1>
          <Button
            onClick={() => setCreateOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={createOpen}
          >
            <UserPlus className="size-4" />
            Create user
          </Button>
        </div>

        <UsersTable users={users} />

        <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </main>
  )
}

export default Users