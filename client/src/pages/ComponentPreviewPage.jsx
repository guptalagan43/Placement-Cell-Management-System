import { Search } from 'lucide-react'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import Input from '../components/ui/Input.jsx'

// Living reference for the Phase 4 base components: renders every variant and
// state defined in design.md §6 in one place, satisfying the phase acceptance
// criterion and giving later phases a visual/regression check for the tokens.
const badgeTones = [
  { tone: 'success', label: 'Eligible' },
  { tone: 'danger', label: 'Rejected' },
  { tone: 'warning', label: 'Pending' },
  { tone: 'neutral', label: 'Draft' },
  { tone: 'info', label: 'Info' },
]

function PreviewSection({ title, children }) {
  return (
    <section className="flex flex-col gap-4">
      <h2>{title}</h2>
      {children}
    </section>
  )
}

export default function ComponentPreviewPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-1">
        <h1>Component Preview</h1>
        <p className="text-ink-600">
          Every base component in every variant and state, per design.md §6.
        </p>
      </div>

      <PreviewSection title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" disabled>
            Primary disabled
          </Button>
          <Button variant="outline" disabled>
            Outline disabled
          </Button>
          <Button variant="danger" disabled>
            Danger disabled
          </Button>
        </div>
        <div className="max-w-sm">
          <Button variant="primary" fullWidth>
            Full-width (in forms)
          </Button>
        </div>
      </PreviewSection>

      <PreviewSection title="Badges">
        <div className="flex flex-wrap items-center gap-3">
          {badgeTones.map(({ tone, label }) => (
            <Badge key={tone} tone={tone}>
              {label}
            </Badge>
          ))}
        </div>
      </PreviewSection>

      <PreviewSection title="Cards">
        <div className="flex flex-wrap gap-4">
          <Card className="w-64">
            <h3>Resting card</h3>
            <p className="mt-1 text-ink-600">Default resting elevation.</p>
          </Card>
          <Card elevated className="w-64">
            <h3>Raised card</h3>
            <p className="mt-1 text-ink-600">Raised elevation for hover / modal surfaces.</p>
          </Card>
        </div>
      </PreviewSection>

      <PreviewSection title="Inputs">
        <div className="flex max-w-sm flex-col gap-4">
          <Input label="Full name" placeholder="Jane Student" />
          <Input label="Email (disabled)" placeholder="jane@skit.ac.in" disabled />
          <Input
            label="Roll number"
            placeholder="Enter roll number"
            error="Roll number is required."
          />
          <Input
            aria-label="Search actions"
            placeholder="Search for an action…"
            pill
            icon={<Search size={18} strokeWidth={1.5} />}
          />
        </div>
      </PreviewSection>
    </div>
  )
}
