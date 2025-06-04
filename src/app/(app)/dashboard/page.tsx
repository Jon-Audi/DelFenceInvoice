
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import type { IconName } from '@/components/icons';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, where,getCountFromServer } from 'firebase/firestore';
import type { Estimate, Order, Product, Customer } from '@/types';
import { Badge } from '@/components/ui/badge';

interface DashboardCardProps {
  title: string;
  iconName: IconName;
  value: string;
  description: string;
  href: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, iconName, value, description, href }) => {
  return (
    <Link href={href} passHref>
      <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon name={iconName} className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{description}</p>
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

export default async function DashboardPage() {
  let totalProducts = 0;
  let activeCustomers = 0;
  let openEstimatesCount = 0;
  let openEstimatesTotalValue = 0;
  let pendingOrdersCount = 0;
  let recentActivity: ActivityItem[] = [];

  try {
    // Fetch Product Count
    const productsSnap = await getCountFromServer(collection(db, 'products'));
    totalProducts = productsSnap.data().count;

    // Fetch Active Customer Count (assuming all customers in DB are active for now)
    const customersSnap = await getCountFromServer(collection(db, 'customers'));
    activeCustomers = customersSnap.data().count;

    // Fetch Open Estimates
    const openEstimatesQuery = query(
      collection(db, 'estimates'),
      where('status', 'in', ['Draft', 'Sent'])
    );
    const openEstimatesSnapshot = await getDocs(openEstimatesQuery);
    openEstimatesCount = openEstimatesSnapshot.size;
    openEstimatesSnapshot.forEach(doc => {
      openEstimatesTotalValue += (doc.data() as Estimate).total;
    });

    // Fetch Pending Orders
    const pendingOrdersQuery = query(
      collection(db, 'orders'),
      where('status', 'in', ['Ordered', 'Ready for pick up'])
    );
    const pendingOrdersSnapshot = await getDocs(pendingOrdersQuery);
    pendingOrdersCount = pendingOrdersSnapshot.size;

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

    recentActivity = fetchedActivities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    // Data will remain at initial 0 values, page will render with "Error loading data" message
  }

  return (
    <>
      <PageHeader title="Dashboard" description="Welcome to Delaware Fence Solutions.">
        <div className="flex gap-2">
          <Link href="/orders/new" passHref> {/* Assuming /orders/new for creating a new order, adjust if needed */}
            <Button>
              <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
              New Order
            </Button>
          </Link>
          <Link href="/estimates/new" passHref> {/* Assuming /estimates/new for creating, adjust if needed */}
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
        />
        <DashboardCard
          title="Active Customers"
          iconName="Users"
          value={String(activeCustomers)}
          description="Registered customers"
          href="/customers"
        />
        <DashboardCard
          title="Open Estimates"
          iconName="FileText"
          value={String(openEstimatesCount)}
          description={`Totaling $${openEstimatesTotalValue.toFixed(2)}`}
          href="/estimates"
        />
        <DashboardCard
          title="Pending Orders"
          iconName="ShoppingCart"
          value={String(pendingOrdersCount)}
          description="Orders awaiting processing"
          href="/orders"
        />
      </div>
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Overview of the latest estimates and orders.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length > 0 ? (
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
            ) : (
              <p className="text-muted-foreground">No recent activity to display or error loading data.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
