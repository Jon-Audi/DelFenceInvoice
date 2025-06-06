
export default function HomePage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Welcome to Delaware Fence Pro</h1>
      <p>If you see this, the basic Next.js app is running.</p>
      <p>Attempting to redirect to /dashboard might be causing issues if the dashboard itself has runtime errors.</p>
      <a href="/dashboard">Go to Dashboard (Manual)</a>
    </div>
  );
}
