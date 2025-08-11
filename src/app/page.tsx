
import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to the dashboard page by default, which will handle auth
  redirect('/dashboard')
}
