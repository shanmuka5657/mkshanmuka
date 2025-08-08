
import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to the login page by default
  redirect('/login')
}
