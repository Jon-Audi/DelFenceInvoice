
"use client";

import React, { useState, FormEvent, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/icons';
import { useRouter } from 'next/navigation';
import ReCAPTCHA from "react-google-recaptcha";

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const { signup, loading, error, user } = useAuth();
  const router = useRouter();
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  React.useEffect(() => {
    if (user) {
      router.replace('/dashboard'); 
    }
  }, [user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await signup(email, password, firstName, lastName, recaptchaToken);
    if (recaptchaRef.current) {
        recaptchaRef.current.reset();
        setRecaptchaToken(null);
    }
  };
  
  const handleRecaptchaChange = useCallback((token: string | null) => {
    setRecaptchaToken(token);
  }, []);

  const handleRecaptchaExpired = useCallback(() => {
    setRecaptchaToken(null);
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
  }, []);

  const handleRecaptchaErrored = useCallback(() => {
    setRecaptchaToken(null);
    if (recaptchaRef.current) {
      recaptchaRef.current.reset();
    }
  }, []);

  if (!siteKey) {
    return (
         <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-muted/40">
            <Card className="w-full max-w-sm shadow-xl p-6">
                <CardHeader className="text-center">
                    <CardTitle className="text-xl text-destructive">reCAPTCHA Configuration Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        The reCAPTCHA site key is missing. Please check the application configuration.
                    </p>
                </CardContent>
                 <CardFooter className="flex justify-center">
                    <Link href="/login" className="underline hover:text-primary text-sm">
                        Back to Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
  }

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
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
           <div className="flex justify-center mb-4">
            <Icon name="PanelsTopLeft" className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
          <CardDescription>Fill in the details below to get started.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="John"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Doe"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
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
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
             <div className="flex justify-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={siteKey}
                onChange={handleRecaptchaChange}
                onExpired={handleRecaptchaExpired}
                onErrored={handleRecaptchaErrored}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading || !recaptchaToken}>
              {loading ? <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" /> : 'Sign Up'}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="underline hover:text-primary">
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
