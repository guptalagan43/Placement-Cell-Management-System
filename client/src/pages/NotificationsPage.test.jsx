import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotificationsPage from './NotificationsPage.jsx'
import * as notificationApi from '../api/notification.api.js'

vi.mock('../api/notification.api.js', () => ({
  getMyNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}))

const renderWithRouter = (component) => {
  return render(<MemoryRouter initialEntries={['/notifications']}>{component}</MemoryRouter>)
}

describe('NotificationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders page title and description', async () => {
    notificationApi.getMyNotifications.mockResolvedValue({
      notifications: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    })

    renderWithRouter(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument()
      expect(screen.getByText(/manage your in-app notifications/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no notifications', async () => {
    notificationApi.getMyNotifications.mockResolvedValue({
      notifications: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    })

    renderWithRouter(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
      expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument()
    })
  })

  it('displays notifications with correct formatting', async () => {
    const mockNotifications = [
      {
        _id: '1',
        type: 'drive_published',
        message: 'New drive posted for CSE students',
        read: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        link: '/drives/123',
      },
      {
        _id: '2',
        type: 'offer_issued',
        message: 'Offer issued from TechCorp',
        read: true,
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        link: '/offers/456',
      },
    ]

    notificationApi.getMyNotifications.mockResolvedValue({
      notifications: mockNotifications,
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    })

    renderWithRouter(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByText('New drive posted for CSE students')).toBeInTheDocument()
      expect(screen.getByText('Offer issued from TechCorp')).toBeInTheDocument()
      expect(screen.getByText('New Drive')).toBeInTheDocument()
      expect(screen.getByText('Offer Issued')).toBeInTheDocument()
    })
  })

  it('shows unread indicator for unread notifications', async () => {
    notificationApi.getMyNotifications.mockResolvedValue({
      notifications: [
        {
          _id: '1',
          type: 'general',
          message: 'Unread notification',
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          _id: '2',
          type: 'general',
          message: 'Read notification',
          read: true,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    })

    renderWithRouter(<NotificationsPage />)

    await waitFor(() => {
      const unreadItem = screen.getByText('Unread notification').closest('div')
      const readItem = screen.getByText('Read notification').closest('div')

      expect(unreadItem).toHaveClass('bg-primary-50/50')
      expect(readItem).toHaveClass('bg-surface')
    })
  })

  it('marks notification as read when Mark as read clicked', async () => {
    notificationApi.getMyNotifications.mockResolvedValue({
      notifications: [
        {
          _id: '1',
          type: 'general',
          message: 'Test',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })
    notificationApi.markAsRead.mockResolvedValue({})

    renderWithRouter(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark as read/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /mark as read/i }))

    await waitFor(() => {
      expect(notificationApi.markAsRead).toHaveBeenCalledWith('1')
    })
  })

  it('marks all as read when button clicked', async () => {
    notificationApi.getMyNotifications.mockResolvedValue({
      notifications: [
        {
          _id: '1',
          type: 'general',
          message: 'Test 1',
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          _id: '2',
          type: 'general',
          message: 'Test 2',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
    })
    notificationApi.markAllAsRead.mockResolvedValue({ modifiedCount: 2 })

    renderWithRouter(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }))

    await waitFor(() => {
      expect(notificationApi.markAllAsRead).toHaveBeenCalled()
    })
  })

  it('shows pagination controls when multiple pages', async () => {
    notificationApi.getMyNotifications.mockResolvedValue({
      notifications: Array.from({ length: 20 }, (_, i) => ({
        _id: String(i),
        type: 'general',
        message: `Notification ${i}`,
        read: false,
        createdAt: new Date().toISOString(),
      })),
      pagination: { page: 1, limit: 20, total: 45, totalPages: 3 },
    })

    renderWithRouter(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
    })
  })

  it('fetches next page when Next clicked', async () => {
    notificationApi.getMyNotifications
      .mockResolvedValueOnce({
        notifications: Array.from({ length: 20 }, (_, i) => ({
          _id: String(i),
          type: 'general',
          message: `Notification ${i}`,
          read: false,
          createdAt: new Date().toISOString(),
        })),
        pagination: { page: 1, limit: 20, total: 45, totalPages: 3 },
      })
      .mockResolvedValueOnce({
        notifications: Array.from({ length: 20 }, (_, i) => ({
          _id: String(i + 20),
          type: 'general',
          message: `Notification ${i + 20}`,
          read: false,
          createdAt: new Date().toISOString(),
        })),
        pagination: { page: 2, limit: 20, total: 45, totalPages: 3 },
      })

    renderWithRouter(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled()
    })

    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    await waitFor(() => {
      expect(notificationApi.getMyNotifications).toHaveBeenCalledTimes(2)
      expect(notificationApi.getMyNotifications).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 })
      )
    })
  })

  it('filters by read status when filter changed', async () => {
    notificationApi.getMyNotifications.mockResolvedValue({
      notifications: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
    })

    renderWithRouter(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /filters/i }))

    await waitFor(() => {
      expect(screen.getByText('Unread')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Unread'))

    await waitFor(() => {
      expect(notificationApi.getMyNotifications).toHaveBeenCalledWith(
        expect.objectContaining({ read: 'false' })
      )
    })
  })

  it('shows error state on fetch failure', async () => {
    notificationApi.getMyNotifications.mockRejectedValue(new Error('Network error'))

    renderWithRouter(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })
  })

  it('navigates to link when View Details clicked', async () => {
    notificationApi.getMyNotifications.mockResolvedValue({
      notifications: [
        {
          _id: '1',
          type: 'drive_published',
          message: 'New drive',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/drives/123',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    })

    renderWithRouter(<NotificationsPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /view details/i }))

    expect(screen.getByText('New drive')).not.toBeInTheDocument()
  })
})
