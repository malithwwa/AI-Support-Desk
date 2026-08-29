import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import Users from './Users'
import { renderWithQuery } from '@/test/render-with-query'

vi.mock('axios')

const mockedAxios = vi.mocked(axios)

describe('Users', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedAxios.get.mockReset()
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
    mockedAxios.get.mockResolvedValue({
      data: {
        users: [
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
        ],
      },
    })

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
})
