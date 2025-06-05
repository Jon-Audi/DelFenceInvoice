
"use client";

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import type { IconName } from '@/components/icons';
import { auth as firebaseAuthInstance, db } from '@/lib/firebase'; // Import db and firebaseAuthInstance
import { collection, query, orderBy, limit, getDocs, where, getCountFromServer } from 'firebase/firestore';
import type { Estimate, Order } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from "@/hooks/use-toast";

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
  const { user: authUser, loading: authLoading } = useAuth();
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
      console.log("Dashboard: fetchData called.");
      console.log("Dashboard: AuthUser from context in useEffect:", authUser?.uid);
      console.log("Dashboard: firebaseAuthInstance.currentUser in useEffect:", firebaseAuthInstance.currentUser?.uid);


      try {
        console.log("Dashboard: Attempting to fetch Product Count...");
        const productsSnap = await getCountFromServer(collection(db, 'products'));
        setTotalProducts(productsSnap.data().count);
        console.log("Dashboard: Product Count fetched:", productsSnap.data().count);

        console.log("Dashboard: Attempting to fetch Active Customer Count...");
        const customersSnap = await getCountFromServer(collection(db, 'customers'));
        setActiveCustomers(customersSnap.data().count);
        console.log("Dashboard: Active Customer Count fetched:", customersSnap.data().count);

        console.log("Dashboard: Attempting to fetch Open Estimates...");
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
        console.log("Dashboard: Open Estimates fetched:", openEstimatesSnapshot.size);

        console.log("Dashboard: Attempting to fetch Pending Orders...");
        const pendingOrdersQuery = query(
          collection(db, 'orders'),
          where('status', 'in', ['Ordered', 'Ready for pick up'])
        );
        const pendingOrdersSnapshot = await getDocs(pendingOrdersQuery);
        setPendingOrdersCount(pendingOrdersSnapshot.size);
        console.log("Dashboard: Pending Orders fetched:", pendingOrdersSnapshot.size);

        console.log("Dashboard: Attempting to fetch Recent Estimates (limit 3)...");
        const recentEstimatesQuery = query(collection(db, 'estimates'), orderBy('date', 'desc'), limit(3));
        const recentEstimatesSnapshot = await getDocs(recentEstimatesQuery);
        console.log("Dashboard: Recent Estimates fetched:", recentEstimatesSnapshot.size);
        
        console.log("Dashboard: Attempting to fetch Recent Orders (limit 3)...");
        const recentOrdersQuery = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(3));
        const recentOrdersSnapshot = await getDocs(recentOrdersQuery);
        console.log("Dashboard: Recent Orders fetched:", recentOrdersSnapshot.size);

        const fetchedActivities: ActivityItem[] = [];
        recentEstimatesSnapshot.forEach(doc => {
          const data = doc.data() as Estimate;
          fetchedActivities.push({
            id: doc.id,
            type: 'Estimate',
            number: data.estimateNumber,
            customerName: data.customerName,
            date: new Date(data.date), // Ensure date is Date object
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
            date: new Date(data.date), // Ensure date is Date object
            total: data.total,
            status: data.status
          });
        });

        setRecentActivity(
          fetchedActivities
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 5)
        );
        console.log("Dashboard: Recent activity processed. Data fetch complete.");

      } catch (err: any) {
        console.error("Dashboard: Detailed error fetching data:", err);
        console.error("Dashboard: Error name:", err.name);
        console.error("Dashboard: Error code:", err.code);
        console.error("Dashboard: Error message:", err.message);
        const description = err.code === 'permission-denied' || err.message?.includes('PERMISSION_DENIED') || err.message?.includes('Missing or insufficient permissions')
          ? "Permission denied. Please ensure you are logged in, have the necessary permissions, and that Firestore rules are correctly deployed."
          : `Failed to load dashboard data. ${err.message || 'Unknown error'}. Check console for details.`;
        setError(description);
        toast({
            title: "Dashboard Error",
            description: description,
            variant: "destructive",
            duration: 10000, // Increased duration for better visibility
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (authLoading) {
      console.log("Dashboard: Auth state still loading, deferring data fetch.");
      setIsLoading(true); // Keep dashboard in loading state while auth is resolving
      return;
    }

    if (authUser) {
      console.log("Dashboard: AuthUser context is (UID:", authUser.uid, "), authLoading is false. Attempting data fetch.");
      console.log("Dashboard: firebaseAuthInstance.currentUser right before fetch:", firebaseAuthInstance.currentUser?.uid);
      fetchData();
    } else {
      console.log("Dashboard: No authenticated user after auth check. Data fetch aborted. AppLayout should handle redirection.");
      setError("You must be logged in to view the dashboard. If you are logged in, there might be an issue with your session or permissions.");
      setIsLoading(false);
    }
  }, [authUser, authLoading, toast]);


  if (isLoading) { // Combined initial loading and data fetching loading
    return (
      <PageHeader title="Dashboard" description="Loading dashboard data...">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
                 <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-7 w-1/2 mb-1" />
                        <Skeleton className="h-3 w-3/4" />
                    </CardContent>
                 </Card>
            ))}
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/4 mb-1" />
                <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
        </Card>
      </PageHeader>
    );
  }
  
  if (error && !isLoading) {
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
          <Link href="/orders" passHref>
            <Button>
              <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </Link>
          <Link href="/estimates" passHref>
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
            {!isLoading && recentActivity.length === 0 && !error ? (
              <p className="text-muted-foreground">No recent activity to display.</p>
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
