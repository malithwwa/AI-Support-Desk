import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import Users from './Users'
import { renderWithQuery } from '@/test/render-with-query'

vi.mock('axios')

const mockedAxios = vi.mocked(axios)

const users = [
  {
    id: '1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'ADMIN',
    createdAt: '2026-08-26T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'John Smith',
    email: 'john@example.com',
    role: 'AGENT',
    createdAt: '2026-08-27T00:00:00.000Z',
  },
]

function mockUserList() {
  mockedAxios.get.mockResolvedValue({ data: { users } })
}

describe('Users', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows skeleton rows while loading', () => {
    mockedAxios.get.mockReturnValue(new Promise(() => {}))
    renderWithQuery(<Users />)

    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument()
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1)
  })

  it('renders the user table after a successful fetch', async () => {
    mockUserList()

    renderWithQuery(<Users />)

    await screen.findByRole('cell', { name: 'Jane Doe' })

    expect(screen.getByRole('cell', { name: 'jane@example.com' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'John Smith' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'john@example.com' })).toBeInTheDocument()

    const adminRow = screen.getByRole('row', { name: /Jane Doe/i })
    expect(adminRow).toHaveTextContent('admin')

    const agentRow = screen.getByRole('row', { name: /John Smith/i })
    expect(agentRow).toHaveTextContent('agent')

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/users', {
      withCredentials: true,
    })
  })

  it('renders an error message when the request fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('network error'))

    renderWithQuery(<Users />)

    await waitFor(() =>
      expect(screen.getByText('Failed to load users')).toBeInTheDocument(),
    )
  })

  it('opens the create-user dialog and validates the form', async () => {
    mockUserList()
    const user = userEvent.setup()

    renderWithQuery(<Users />)

    await screen.findByRole('cell', { name: 'Jane Doe' })

    await user.click(screen.getByRole('button', { name: 'Create user' }))

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: 'Create user' }),
    ).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Create user' }))

    expect(
      within(dialog).getByText('Name must be at least 3 characters'),
    ).toBeInTheDocument()
    expect(
      within(dialog).getByText('Password must be at least 8 characters'),
    ).toBeInTheDocument()

    expect(mockedAxios.post).not.toHaveBeenCalled()
  })

  it('creates a user, closes the dialog, and refreshes the list', async () => {
    mockUserList()
    mockedAxios.post.mockResolvedValue({
      data: {
        user: {
          id: '3',
          name: 'Alice Wong',
          email: 'alice@example.com',
          role: 'AGENT',
          createdAt: '2026-08-28T00:00:00.000Z',
        },
      },
    })
    const user = userEvent.setup()

    renderWithQuery(<Users />)

    await screen.findByRole('cell', { name: 'Jane Doe' })
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Alice Wong')
    await user.type(within(dialog).getByLabelText('Email'), 'alice@example.com')
    await user.type(within(dialog).getByLabelText('Password'), 'password123')

    await user.click(within(dialog).getByRole('button', { name: 'Create user' }))

    await waitFor(() => {
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/users',
        { name: 'Alice Wong', email: 'alice@example.com', password: 'password123' },
        { withCredentials: true },
      )
    })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    expect(mockedAxios.get).toHaveBeenCalledTimes(2)
  })

  it('shows a server error when creation fails', async () => {
    mockUserList()
    mockedAxios.post.mockRejectedValue(new Error('network error'))
    const user = userEvent.setup()

    renderWithQuery(<Users />)

    await screen.findByRole('cell', { name: 'Jane Doe' })
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'Alice Wong')
    await user.type(within(dialog).getByLabelText('Email'), 'alice@example.com')
    await user.type(within(dialog).getByLabelText('Password'), 'password123')

    await user.click(within(dialog).getByRole('button', { name: 'Create user' }))

    await waitFor(() =>
      expect(
        within(dialog).getByText('Failed to save user'),
      ).toBeInTheDocument(),
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the dialog when the create button is clicked', async () => {
    mockUserList()
    const user = userEvent.setup()

    renderWithQuery(<Users />)

    await screen.findByRole('cell', { name: 'Jane Doe' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create user' }))

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('heading', { name: 'Create user' }),
    ).toBeInTheDocument()
  })

  it('hides the dialog when clicking outside of it', async () => {
    mockUserList()
    const user = userEvent.setup()

    renderWithQuery(<Users />)

    await screen.findByRole('cell', { name: 'Jane Doe' })
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

    const overlay = document.querySelector('[data-slot="dialog-overlay"]')
    expect(overlay).not.toBeNull()
    await user.click(overlay as HTMLElement)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('hides the dialog when pressing the Escape key', async () => {
    mockUserList()
    const user = userEvent.setup()

    renderWithQuery(<Users />)

    await screen.findByRole('cell', { name: 'Jane Doe' })
    await user.click(screen.getByRole('button', { name: 'Create user' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})