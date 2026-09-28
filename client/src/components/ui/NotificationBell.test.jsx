import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotificationBell from './NotificationBell.jsx'
import * as notificationApi from '../../api/notification.api.js'

vi.mock('../../api/notification.api.js', () => ({
  getUnreadCount: vi.fn(),
  getMyNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}))

const renderWithRouter = (component) => {
  return render(<MemoryRouter initialEntries={['/']}>{component}</MemoryRouter>)
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders bell icon without badge when unread count is 0', async () => {
    notificationApi.getUnreadCount.mockResolvedValue({ count: 0 })

    renderWithRouter(<NotificationBell />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })

    expect(screen.queryByText('9+')).not.toBeInTheDocument()
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })

  it('renders unread count badge when count > 0', async () => {
    notificationApi.getUnreadCount.mockResolvedValue({ count: 3 })

    renderWithRouter(<NotificationBell />)

    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('shows 9+ for counts greater than 9', async () => {
    notificationApi.getUnreadCount.mockResolvedValue({ count: 15 })

    renderWithRouter(<NotificationBell />)

    await waitFor(() => {
      expect(screen.getByText('9+')).toBeInTheDocument()
    })
  })

  it('opens dropdown on click and fetches notifications', async () => {
    notificationApi.getUnreadCount.mockResolvedValue({ count: 2 })
    notificationApi.getMyNotifications.mockResolvedValue({
      notifications: [
        {
          _id: '1',
          type: 'drive_published',
          message: 'New drive available',
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          _id: '2',
          type: 'general',
          message: 'General announcement',
          read: true,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    })

    renderWithRouter(<NotificationBell />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    await waitFor(() => {
      expect(screen.getByText('New drive available')).toBeInTheDocument()
      expect(screen.getByText('General announcement')).toBeInTheDocument()
    })

    expect(notificationApi.getMyNotifications).toHaveBeenCalledWith({ limit: 10 })
  })

  it('shows loading state while fetching notifications', async () => {
    notificationApi.getUnreadCount.mockResolvedValue({ count: 1 })
    let resolveNotifications
    notificationApi.getMyNotifications.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveNotifications = resolve
        })
    )

    renderWithRouter(<NotificationBell />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    expect(screen.getByText(/loading notifications/i)).toBeInTheDocument()

    resolveNotifications({
      notifications: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    })

    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
    })
  })

  it('marks notification as read on click', async () => {
    notificationApi.getUnreadCount.mockResolvedValue({ count: 1 })
    notificationApi.getMyNotifications.mockResolvedValue({
      notifications: [
        {
          _id: '1',
          type: 'drive_published',
          message: 'New drive available',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    })
    notificationApi.markAsRead.mockResolvedValue({})

    renderWithRouter(<NotificationBell />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    await waitFor(() => {
      expect(screen.getByText('New drive available')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('New drive available'))

    await waitFor(() => {
      expect(notificationApi.markAsRead).toHaveBeenCalledWith('1')
    })
  })

  it('marks all as read when button clicked', async () => {
    notificationApi.getUnreadCount.mockResolvedValue({ count: 2 })
    notificationApi.getMyNotifications.mockResolvedValue({
      notifications: [
        {
          _id: '1',
          type: 'drive_published',
          message: 'New drive',
          read: false,
          createdAt: new Date().toISOString(),
        },
        {
          _id: '2',
          type: 'general',
          message: 'General',
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
    })
    notificationApi.markAllAsRead.mockResolvedValue({ modifiedCount: 2 })

    renderWithRouter(<NotificationBell />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }))

    await waitFor(() => {
      expect(notificationApi.markAllAsRead).toHaveBeenCalled()
    })
  })

  it('closes dropdown when clicking outside', async () => {
    notificationApi.getUnreadCount.mockResolvedValue({ count: 1 })
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
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    })

    renderWithRouter(<NotificationBell />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument()
    })

    fireEvent.mouseDown(document.body)

    expect(screen.queryByText('Test')).not.toBeInTheDocument()
  })

  it('shows empty state when no notifications', async () => {
    notificationApi.getUnreadCount.mockResolvedValue({ count: 0 })
    notificationApi.getMyNotifications.mockResolvedValue({
      notifications: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
    })

    renderWithRouter(<NotificationBell />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    await waitFor(() => {
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
      expect(screen.getByText(/you're all caught up/i)).toBeInTheDocument()
    })
  })

  it('navigates to notifications page when View All clicked', async () => {
    notificationApi.getUnreadCount.mockResolvedValue({ count: 1 })
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
      pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
    })

    renderWithRouter(<NotificationBell />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /notifications/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /view all notifications/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /view all notifications/i }))

    expect(screen.getByText('Test')).not.toBeInTheDocument()
  })
})
