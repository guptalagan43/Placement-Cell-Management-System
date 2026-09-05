import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section>
      <h1>404 — Not Found</h1>
      <p>This route does not exist.</p>
      <Link to="/">Back to Home</Link>
    </section>
  )
}
