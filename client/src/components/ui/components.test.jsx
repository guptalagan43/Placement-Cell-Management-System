import { describe, it, expect, vi } from 'vitest'
import { createRef } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import Button from './Button.jsx'
import Badge from './Badge.jsx'
import Card from './Card.jsx'
import Input from './Input.jsx'

describe('Button', () => {
  it('renders its children and defaults to type="button"', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button')
  })

  it('applies the variant classes', () => {
    render(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass('bg-danger')
  })

  it('honors disabled and does not fire onClick', () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Nope
      </Button>
    )
    const btn = screen.getByRole('button', { name: 'Nope' })
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('applies the full-width class when fullWidth is set', () => {
    render(<Button fullWidth>Wide</Button>)
    expect(screen.getByRole('button', { name: 'Wide' })).toHaveClass('w-full')
  })

  it('forwards its ref to the underlying button', () => {
    const ref = createRef()
    render(<Button ref={ref}>Ref</Button>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })
})

describe('Badge', () => {
  it('renders the label with the semantic tone classes', () => {
    render(<Badge tone="success">Eligible</Badge>)
    expect(screen.getByText('Eligible')).toHaveClass('bg-success-bg', 'text-success-text')
  })

  it('defaults to the neutral tone', () => {
    render(<Badge>Draft</Badge>)
    expect(screen.getByText('Draft')).toHaveClass('bg-neutral-bg')
  })
})

describe('Card', () => {
  it('uses the resting shadow by default', () => {
    render(<Card>Resting</Card>)
    expect(screen.getByText('Resting')).toHaveClass('shadow-card')
  })

  it('uses the raised shadow when elevated', () => {
    render(<Card elevated>Raised</Card>)
    expect(screen.getByText('Raised')).toHaveClass('shadow-raised')
  })
})

describe('Input', () => {
  it('associates the label with the input', () => {
    render(<Input label="Full name" />)
    expect(screen.getByLabelText('Full name')).toBeInstanceOf(HTMLInputElement)
  })

  it('renders an accessible error and marks the field invalid', () => {
    render(<Input label="Roll" error="Required." />)
    const input = screen.getByLabelText('Roll')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveClass('border-danger')
    expect(screen.getByText('Required.')).toBeInTheDocument()
  })

  it('supports the disabled state', () => {
    render(<Input label="Email" disabled />)
    expect(screen.getByLabelText('Email')).toBeDisabled()
  })

  it('forwards its ref to the underlying input', () => {
    const ref = createRef()
    render(<Input label="Name" ref={ref} />)
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })
})
