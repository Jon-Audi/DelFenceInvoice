
"use client";

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import type { IconName } from '@/components/icons';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer } from 'firebase/firestore';
import type { Estimate, Order } from '@/types'; // Product and Customer types are not directly used for data shaping here
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth
import { useToast } from "@/hooks/use-toast"; // Import useToast

interface DashboardCardProps {
  title: string;
  iconName: IconName;
  value: string;
  description: string;
  href: string;
  isLoading: boolean;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, iconName, value, description, href, isLoading }) => {
  return (
    <Link href={href} passHref>
      <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon name={iconName} className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <>
              <Skeleton className="h-7 w-1/2 mb-1" />
              <Skeleton className="h-3 w-3/4" />
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{description}</p>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
};

interface ActivityItem {
  id: string;
  type: 'Estimate' | 'Order';
  number: string;
  customerName?: string;
  date: Date;
  total: number;
  status: string;
}

function formatDashboardDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const { user: authUser } = useAuth(); // Get user from AuthContext
  const { toast } = useToast();

  const [totalProducts, setTotalProducts] = useState(0);
  const [activeCustomers, setActiveCustomers] = useState(0);
  const [openEstimatesCount, setOpenEstimatesCount] = useState(0);
  const [openEstimatesTotalValue, setOpenEstimatesTotalValue] = useState(0);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      console.log("Dashboard: Attempting to fetch data...");

      try {
        // Fetch Product Count
        const productsSnap = await getCountFromServer(collection(db, 'products'));
        setTotalProducts(productsSnap.data().count);

        // Fetch Active Customer Count
        const customersSnap = await getCountFromServer(collection(db, 'customers'));
        setActiveCustomers(customersSnap.data().count);

        // Fetch Open Estimates
        const openEstimatesQuery = query(
          collection(db, 'estimates'),
          where('status', 'in', ['Draft', 'Sent'])
        );
        const openEstimatesSnapshot = await getDocs(openEstimatesQuery);
        setOpenEstimatesCount(openEstimatesSnapshot.size);
        let tempOpenEstimatesTotalValue = 0;
        openEstimatesSnapshot.forEach(doc => {
          tempOpenEstimatesTotalValue += (doc.data() as Estimate).total;
        });
        setOpenEstimatesTotalValue(tempOpenEstimatesTotalValue);

        // Fetch Pending Orders
        const pendingOrdersQuery = query(
          collection(db, 'orders'),
          where('status', 'in', ['Ordered', 'Ready for pick up'])
        );
        const pendingOrdersSnapshot = await getDocs(pendingOrdersQuery);
        setPendingOrdersCount(pendingOrdersSnapshot.size);

        // Fetch Recent Activity
        const recentEstimatesQuery = query(collection(db, 'estimates'), orderBy('date', 'desc'), limit(3));
        const recentOrdersQuery = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(3));

        const [recentEstimatesSnapshot, recentOrdersSnapshot] = await Promise.all([
          getDocs(recentEstimatesQuery),
          getDocs(recentOrdersQuery)
        ]);

        const fetchedActivities: ActivityItem[] = [];
        recentEstimatesSnapshot.forEach(doc => {
          const data = doc.data() as Estimate;
          fetchedActivities.push({
            id: doc.id,
            type: 'Estimate',
            number: data.estimateNumber,
            customerName: data.customerName,
            date: new Date(data.date),
            total: data.total,
            status: data.status
          });
        });
        recentOrdersSnapshot.forEach(doc => {
          const data = doc.data() as Order;
          fetchedActivities.push({
            id: doc.id,
            type: 'Order',
            number: data.orderNumber,
            customerName: data.customerName,
            date: new Date(data.date),
            total: data.total,
            status: data.status
          });
        });

        setRecentActivity(
          fetchedActivities
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 5)
        );
        console.log("Dashboard: Data fetched successfully.");

      } catch (err: any) {
        console.error("Dashboard: Detailed error fetching data:", err);
        console.error("Dashboard: Error name:", err.name);
        console.error("Dashboard: Error code:", err.code); // Firebase errors often have a code
        const description = err.code === 'permission-denied' 
          ? "Permission denied. Please ensure you are logged in and have the necessary permissions."
          : `Failed to load dashboard data: ${err.message}.`;
        setError(description);
        toast({
            title: "Dashboard Error",
            description: description,
            variant: "destructive",
            duration: 7000,
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (authUser) {
      console.log("Dashboard: Auth user detected in context (UID:", authUser.uid, "), proceeding with fetchData.");
      fetchData();
    } else {
      // This case should ideally be handled by AppLayout redirecting if auth is truly not loading anymore.
      // We set isLoading to false here if we don't attempt a fetch.
      if (!isLoading) { // Avoid if already loading from a previous authUser state.
         // No explicit error set here, AppLayout should redirect. If it doesn't, a blank/stuck loading page is a symptom.
      }
      console.log("Dashboard: No authenticated user in context yet. Data fetch deferred. AppLayout should handle redirection if auth loading is complete.");
      // If AppLayout is correctly guarding, we might not even need to set isLoading to false here,
      // as the component might unmount or not proceed to this effect if authUser is null and auth is not loading.
      // However, to be safe, if authUser is null, we mark loading as false.
      if (isLoading && !authUser) { // Added a check to only set loading false if it was true
        setIsLoading(false);
      }
    }
  // Dependency array now includes authUser.
  // toast is stable (from useToast), setError and setIsLoading are stable setters from useState.
  }, [authUser, toast]);


  if (error && !isLoading) { // Show error only if not actively loading
    return (
      <PageHeader title="Dashboard" description="Error loading data.">
        <div className="flex items-center justify-center h-64">
          <div className="p-4 rounded-md border border-destructive bg-destructive/10 text-destructive">
            <Icon name="AlertCircle" className="h-6 w-6 mr-2 inline-block" />
            {error}
          </div>
        </div>
      </PageHeader>
    )
  }

  return (
    <>
      <PageHeader title="Dashboard" description="Welcome to Delaware Fence Solutions.">
        <div className="flex gap-2">
          <Link href="/orders/new" passHref>
            <Button>
              <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </Link>
          <Link href="/estimates/new" passHref>
            <Button>
              <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
              New Estimate
            </Button>
          </Link>
        </div>
      </PageHeader>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Products"
          iconName="Package"
          value={String(totalProducts)}
          description="Products in catalog"
          href="/products"
          isLoading={isLoading}
        />
        <DashboardCard
          title="Active Customers"
          iconName="Users"
          value={String(activeCustomers)}
          description="Registered customers"
          href="/customers"
          isLoading={isLoading}
        />
        <DashboardCard
          title="Open Estimates"
          iconName="FileText"
          value={String(openEstimatesCount)}
          description={`Totaling $${openEstimatesTotalValue.toFixed(2)}`}
          href="/estimates"
          isLoading={isLoading}
        />
        <DashboardCard
          title="Pending Orders"
          iconName="ShoppingCart"
          value={String(pendingOrdersCount)}
          description="Orders awaiting processing"
          href="/orders"
          isLoading={isLoading}
        />
      </div>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Overview of the latest estimates and orders.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && recentActivity.length === 0 ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-md border">
                    <div className="flex items-center gap-3">
                       <Skeleton className="h-5 w-5 rounded-full" />
                       <div>
                         <Skeleton className="h-4 w-32 mb-1" />
                         <Skeleton className="h-3 w-40" />
                       </div>
                    </div>
                    <div className="text-right">
                        <Skeleton className="h-5 w-16 mb-1" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !isLoading && recentActivity.length === 0 && !error ? (
              <p className="text-muted-foreground">No recent activity to display.</p>
            ) : !isLoading && error && recentActivity.length === 0 ? (
              <p className="text-muted-foreground">Recent activity could not be loaded due to an error.</p>
            ) : (
              <ul className="space-y-4">
                {recentActivity.map((item) => (
                  <li key={`${item.type}-${item.id}`} className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                       <Icon name={item.type === 'Estimate' ? 'FileText' : 'ShoppingCart'} className="h-5 w-5 text-primary" />
                       <div>
                        <Link href={item.type === 'Estimate' ? `/estimates#${item.id}` : `/orders#${item.id}`} className="font-medium hover:underline">
                          {item.type} {item.number}
                        </Link>
                         <p className="text-xs text-muted-foreground">
                           {item.customerName || 'N/A Customer'} - ${item.total.toFixed(2)}
                         </p>
                       </div>
                    </div>
                    <div className="text-right">
                        <Badge variant="outline" className="mb-1">{item.status}</Badge>
                        <p className="text-xs text-muted-foreground">{formatDashboardDate(item.date)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
