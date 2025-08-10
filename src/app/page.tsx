
import { redirect } from 'next/navigation'

export default function HomePage() {
  // Redirect to the credit page by default
  redirect('/credit')
}
