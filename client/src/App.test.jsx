import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App.jsx'

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  )
}

describe('App routing', () => {
  it('renders the Home placeholder at /', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()
  })

  it('renders the Drives placeholder at /drives', () => {
    renderAt('/drives')
    expect(screen.getByRole('heading', { name: 'Drives' })).toBeInTheDocument()
  })

  it('renders the About placeholder at /about', () => {
    renderAt('/about')
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
  })

  it('renders the 404 page for an unknown route', () => {
    renderAt('/no-such-route')
    expect(screen.getByRole('heading', { name: /not found/i })).toBeInTheDocument()
  })

  it('renders the layout shell (header nav + empty sidebar) around routes', () => {
    renderAt('/')
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Sidebar' })).toBeInTheDocument()
  })

  it('navigates between placeholder routes via the header nav', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'Drives' }))
    expect(screen.getByRole('heading', { name: 'Drives' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: 'About' }))
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
  })
})
