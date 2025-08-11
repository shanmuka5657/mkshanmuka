
import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to the dashboard by default. The dashboard will handle auth checks
  // and redirect to login if necessary. This is a more stable flow.
  redirect('/dashboard')
}
