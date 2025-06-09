
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [isLoadingOrderCount, setIsLoadingOrderCount] = useState(true);

  useEffect(() => {
    setIsLoadingOrderCount(true);
    const unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
      setOrderCount(snapshot.size);
      setIsLoadingOrderCount(false);
    }, (error) => {
      console.error("Error fetching order count:", error);
      toast({
        title: "Error",
        description: "Could not fetch order count.",
        variant: "destructive",
      });
      setIsLoadingOrderCount(false);
    });
    return () => unsubscribe();
  }, [toast]);

  return (
    <>
      <PageHeader title="Dashboard" description="Overview of your fence business operations." />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Icon name="ShoppingCart" className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingOrderCount ? (
              <Skeleton className="h-8 w-1/2" />
            ) : (
              <div className="text-2xl font-bold">{orderCount ?? 'N/A'}</div>
            )}
            <p className="text-xs text-muted-foreground">
              All processed and pending orders.
            </p>
          </CardContent>
        </Card>
        {/* Add more stat cards here if needed, e.g., Total Customers, Revenue (requires more complex logic) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Icon name="Users" className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {/* Placeholder for customer count - implement similar to orderCount if needed */}
            <Skeleton className="h-8 w-1/2" /> 
            <p className="text-xs text-muted-foreground">
              All registered customers.
            </p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Estimates</CardTitle>
            <Icon name="FileText" className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {/* Placeholder for estimate count */}
            <Skeleton className="h-8 w-1/2" /> 
            <p className="text-xs text-muted-foreground">
              Estimates awaiting action.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Package" className="h-6 w-6 text-primary" />
              Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">Manage your product inventory, categories, and pricing.</CardDescription>
            <Link href="/products" passHref>
              <Button variant="outline" className="w-full">
                Go to Products <Icon name="ChevronRight" className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="Users" className="h-6 w-6 text-primary" />
              Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">Access and manage your customer database and details.</CardDescription>
            <Link href="/customers" passHref>
              <Button variant="outline" className="w-full">
                Go to Customers <Icon name="ChevronRight" className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon name="FileDigit" className="h-6 w-6 text-primary" />
              Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">Create, send, and track customer invoices and payments.</CardDescription>
            <Link href="/invoices" passHref>
              <Button variant="outline" className="w-full">
                Go to Invoices <Icon name="ChevronRight" className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome, {user?.displayName || user?.email || 'User'}!</CardTitle>
        </CardHeader>
        <CardContent>
          {authLoading && <p>Loading user information...</p>}
          {user && (
            <p className="mb-4 text-lg">
              Logged in as: <span className="font-semibold">{user.email}</span>
            </p>
          )}
          {!user && !authLoading && (
            <p className="mb-4 text-lg text-destructive">
              Not logged in. Please <Link href="/login" className="underline">login</Link>.
            </p>
          )}
          <p>
            This is your central hub for managing Delaware Fence Solutions. Use the links above to navigate to different sections.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
