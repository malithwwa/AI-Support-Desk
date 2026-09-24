import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import UserFormDialog from '@/components/UserFormDialog'
import DeleteUserDialog from '@/components/DeleteUserDialog'
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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  function openCreate() {
    setEditUser(null)
    setDialogOpen(true)
  }

  function openEdit(user: User) {
    setEditUser(user)
    setDialogOpen(true)
  }

  function openDelete(user: User) {
    setDeleteTarget(user)
  }

  if (isLoading) {
    return (
      <main className="flex flex-col items-center p-8 text-left">
        <div className="w-full max-w-5xl">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-zinc-900">Users</h1>
          </div>
          <UsersTableSkeleton />
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex flex-col items-center p-8 text-left">
        <div className="w-full max-w-5xl">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-zinc-900">Users</h1>
          </div>
          <p className="text-[13px] text-destructive">Failed to load users</p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center p-8 text-left">
      <div className="w-full max-w-5xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="font-bold text-zinc-900 text-lg">Users</h1>
          <Button
            onClick={openCreate}
            aria-haspopup="dialog"
            aria-expanded={dialogOpen}
            className="text-[13px]"
          >
            <UserPlus className="size-4" />
            Create user
          </Button>
        </div>

        <UsersTable users={users} onEdit={openEdit} onDelete={openDelete} />

        <UserFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          user={editUser}
        />

        <DeleteUserDialog
          user={deleteTarget}
          open={Boolean(deleteTarget)}
          onOpenChange={(next) => {
            if (!next) setDeleteTarget(null)
          }}
        />
      </div>
    </main>
  )
}

export default Users