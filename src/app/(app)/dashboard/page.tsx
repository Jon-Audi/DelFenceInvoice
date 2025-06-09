
"use client";

import React from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth

export default function DashboardPage() {
  const { user, loading } = useAuth(); // Get user from AuthContext

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your application." />
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Delaware Fence Pro</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading user information...</p>}
          {user && (
            <p className="mb-4 text-lg">
              Logged in as: <span className="font-semibold">{user.email}</span>
            </p>
          )}
          {!user && !loading && (
            <p className="mb-4 text-lg text-destructive">
              Not logged in. Please <Link href="/login" className="underline">login</Link>.
            </p>
          )}
          <p className="mb-4">
            If you can see your email above, Firebase Authentication is working.
          </p>
          <div className="flex gap-4">
            <Link href="/products" passHref>
              <Button variant="outline">
                <Icon name="Package" className="mr-2 h-4 w-4" />
                Go to Products
              </Button>
            </Link>
            <Link href="/customers" passHref>
              <Button variant="outline">
                <Icon name="Users" className="mr-2 h-4 w-4" />
                Go to Customers
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
