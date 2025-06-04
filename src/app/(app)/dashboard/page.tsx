
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import type { IconName } from '@/components/icons';
import { MOCK_PRODUCTS, MOCK_CUSTOMERS, MOCK_ESTIMATES, MOCK_ORDERS } from '@/lib/mock-data';

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

export default function DashboardPage() {
  const totalProducts = MOCK_PRODUCTS.length;
  const activeCustomers = MOCK_CUSTOMERS.length; // Assuming all mock customers are active for now

  const openEstimates = MOCK_ESTIMATES.filter(
    (estimate) => estimate.status === 'Draft' || estimate.status === 'Sent'
  );
  const openEstimatesCount = openEstimates.length;
  const openEstimatesTotalValue = openEstimates.reduce((sum, est) => sum + est.total, 0);

  const pendingOrders = MOCK_ORDERS.filter(
    (order) => order.status === 'Ordered' || order.status === 'Ready for pick up'
  );
  const pendingOrdersCount = pendingOrders.length;

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
          description="Total products in catalog"
          href="/products"
        />
        <DashboardCard
          title="Active Customers"
          iconName="Users"
          value={String(activeCustomers)}
          description="Total customers registered"
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
            <CardDescription>Overview of recent system events.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No recent activity to display.</p>
            {/* Placeholder for recent activity feed */}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
