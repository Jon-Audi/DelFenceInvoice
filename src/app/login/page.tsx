
"use client";

import React, { useState, FormEvent } from 'react';
import Link from 'next/link'; // Import Link
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/icons';
import { useRouter } from 'next/navigation'; // For redirecting

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error, user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (user) {
      router.replace('/dashboard'); // If user is already logged in, redirect
    }
  }, [user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await login(email, password);
    // Redirection is handled within the login function in AuthContext
  };

  if (user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-muted/40">
        <Icon name="Loader2" className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-muted/40">
      <Card className="w-full max-w-sm shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Icon name="PanelsTopLeft" className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" /> : 'Sign In'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="underline hover:text-primary">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
