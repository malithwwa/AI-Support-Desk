import { useState } from 'react'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import UserFormDialog from './UserFormDialog'
import { renderWithQuery } from '@/test/render-with-query'

vi.mock('axios')

const mockedAxios = vi.mocked(axios)

const alice = {
  id: '1',
  name: 'Alice Wong',
  email: 'alice@example.com',
  role: 'AGENT',
  createdAt: '2026-08-28T00:00:00.000Z',
}

function StatefulDialog() {
  const [open, setOpen] = useState(true)
  return (
    <>
      <button onClick={() => setOpen(true)}>Create user</button>
      <UserFormDialog open={open} onOpenChange={setOpen} />
    </>
  )
}

function renderDialog(open = true, onOpenChange = vi.fn()) {
  return {
    onOpenChange,
    ...renderWithQuery(<UserFormDialog open={open} onOpenChange={onOpenChange} />),
  }
}

describe('UserFormDialog (create mode)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the form fields when open', () => {
    renderDialog()

    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: 'Create user' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Name')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Email')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Password')).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Create user' }),
    ).toBeInTheDocument()
  })

  it('does not render the dialog content when closed', () => {
    renderDialog(false)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows validation errors for invalid input', async () => {
    renderDialog()
    const user = userEvent.setup()

    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: 'Create user' }))

    expect(dialog.getByText('Name must be at least 3 characters')).toBeInTheDocument()
    expect(dialog.getByText('Email is required')).toBeInTheDocument()
    expect(
      dialog.getByText('Password must be at least 8 characters'),
    ).toBeInTheDocument()

    expect(mockedAxios.post).not.toHaveBeenCalled()
  })

  it('submits valid input to /api/users on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { user: alice } })
    const user = userEvent.setup()

    renderDialog()

    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText('Name'), 'Alice Wong')
    await user.type(dialog.getByLabelText('Email'), 'alice@example.com')
    await user.type(dialog.getByLabelText('Password'), 'password123')

    await user.click(dialog.getByRole('button', { name: 'Create user' }))

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/users',
        { name: 'Alice Wong', email: 'alice@example.com', password: 'password123' },
        { withCredentials: true },
      )
    })
  })

  it('closes the dialog and clears the form after a successful submit', async () => {
    mockedAxios.post.mockResolvedValue({ data: { user: alice } })
    const user = userEvent.setup()

    const onOpenChange = vi.fn()
    renderWithQuery(<UserFormDialog open onOpenChange={onOpenChange} />)

    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText('Name'), 'Alice Wong')
    await user.type(dialog.getByLabelText('Email'), 'alice@example.com')
    await user.type(dialog.getByLabelText('Password'), 'password123')
    await user.click(dialog.getByRole('button', { name: 'Create user' }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('resets the fields when the dialog is closed', async () => {
    const user = userEvent.setup()

    renderWithQuery(<StatefulDialog />)

    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText('Name'), 'Typed name')
    expect(dialog.getByLabelText('Name')).toHaveValue('Typed name')

    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Create user' }))
    expect(screen.getByLabelText('Name')).toHaveValue('')
  })

  it('shows a server error message when creation fails', async () => {
    mockedAxios.post.mockRejectedValue(new Error('network error'))
    const user = userEvent.setup()

    renderDialog()

    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText('Name'), 'Alice Wong')
    await user.type(dialog.getByLabelText('Email'), 'alice@example.com')
    await user.type(dialog.getByLabelText('Password'), 'password123')
    await user.click(dialog.getByRole('button', { name: 'Create user' }))

    await waitFor(() =>
      expect(dialog.getByText('Failed to save user')).toBeInTheDocument(),
    )
  })
})

describe('UserFormDialog (edit mode)', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  function renderEdit(user: typeof alice = alice) {
    const onOpenChange = vi.fn()
    renderWithQuery(<UserFormDialog open user={user} onOpenChange={onOpenChange} />)
    return { onOpenChange }
  }

  it('renders with the user data prefilled', () => {
    renderEdit()

    const dialog = within(screen.getByRole('dialog'))
    expect(dialog.getByRole('heading', { name: 'Edit user' })).toBeInTheDocument()
    expect(dialog.getByLabelText('Name')).toHaveValue('Alice Wong')
    expect(dialog.getByLabelText('Email')).toHaveValue('alice@example.com')
    expect(dialog.getByLabelText('New password (optional)')).toHaveValue('')
    expect(dialog.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
  })

  it('submits an update to /api/users/:id with the password when provided', async () => {
    mockedAxios.patch.mockResolvedValue({ data: { user: alice } })
    const user = userEvent.setup()

    renderEdit()

    const dialog = within(screen.getByRole('dialog'))
    await user.clear(dialog.getByLabelText('Name'))
    await user.type(dialog.getByLabelText('Name'), 'Alice Changed')
    await user.type(dialog.getByLabelText('New password (optional)'), 'newpass123')

    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        '/api/users/1',
        {
          name: 'Alice Changed',
          email: 'alice@example.com',
          password: 'newpass123',
        },
        { withCredentials: true },
      )
    })
  })

  it('omits the password from the update when left blank', async () => {
    mockedAxios.patch.mockResolvedValue({ data: { user: alice } })
    const user = userEvent.setup()

    renderEdit()

    const dialog = within(screen.getByRole('dialog'))
    await user.clear(dialog.getByLabelText('Name'))
    await user.type(dialog.getByLabelText('Name'), 'Alice Changed')

    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(mockedAxios.patch).toHaveBeenCalledWith(
        '/api/users/1',
        { name: 'Alice Changed', email: 'alice@example.com' },
        { withCredentials: true },
      )
    })
  })

  it('closes the dialog after a successful update', async () => {
    mockedAxios.patch.mockResolvedValue({ data: { user: alice } })
    const user = userEvent.setup()

    const { onOpenChange } = renderEdit()

    const dialog = within(screen.getByRole('dialog'))
    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it('shows a validation error for a too-short new password', async () => {
    const user = userEvent.setup()

    renderEdit()

    const dialog = within(screen.getByRole('dialog'))
    await user.type(dialog.getByLabelText('New password (optional)'), 'short')
    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    expect(
      dialog.getByText('Password must be at least 8 characters'),
    ).toBeInTheDocument()
    expect(mockedAxios.patch).not.toHaveBeenCalled()
  })
})
