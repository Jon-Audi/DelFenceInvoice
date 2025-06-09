
import { redirect } from 'next/navigation';

export default function HomePage() {
  // This will automatically redirect any visits to the root path "/"
  // to the "/dashboard" path.
  redirect('/dashboard');

  // Note: Code after redirect() is not reached, but it's good practice
  // to have a return statement if your linter/compiler expects one,
  // though Next.js's redirect will handle interrupting the render.
  // For a pure redirect component, no further JSX is strictly needed.
  // return null; 
}
