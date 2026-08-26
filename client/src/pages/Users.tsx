import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

function Users() {
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchUsers() {
      const res = await fetch('/api/users', { credentials: 'include' })
      if (!res.ok) {
        setError('Failed to load users')
        return
      }
      const data = await res.json()
      setUsers(data.users)
    }
    fetchUsers()
  }, [])

  if (error) {
    return (
      <main className="p-8 text-left">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900">Users</h1>
        <p className="text-[13px] text-destructive">{error}</p>
      </main>
    )
  }

  return (
    <main className="flex flex-col items-center p-8 text-left">
      <div className="w-full max-w-7xl">
        <h1 className="mb-1 text-2xl font-semibold text-zinc-900">Users</h1>
        <p className="mb-4 text-[13px] text-zinc-600">
          {users.length} user{users.length !== 1 && 's'} total
        </p>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-zinc-600">{user.email}</TableCell>
                <TableCell>
                  {user.role === 'ADMIN' ? (
                    <Badge className="bg-zinc-900 text-white hover:bg-zinc-800">
                      admin
                    </Badge>
                  ) : (
                    <Badge variant="secondary">agent</Badge>
                  )}
                </TableCell>
                <TableCell className="text-zinc-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  )
}

export default Users
