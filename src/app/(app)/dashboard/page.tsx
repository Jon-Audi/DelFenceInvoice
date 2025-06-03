
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Icon } from '@/components/icons';

interface DashboardCardProps {
  title: string;
  iconName: IconName;
  value: string;
  description: string;
  href: string;
}

// Extracted IconName type from components/icons.tsx to avoid direct import issues in non-component files if it were there
type IconName = "LayoutDashboard" | "Package" | "Users" | "FileText" | "ShoppingCart" | "FileDigit" | "Calculator" | "ChevronDown" | "ChevronRight" | "PlusCircle" | "Edit" | "Trash2" | "Upload" | "Download" | "Send" | "Mail" | "MoreHorizontal" | "Search" | "PanelLeft" | "Sun" | "Moon" | "Settings" | "LogOut" | "ExternalLink" | "PanelsTopLeft" | "AlertCircle" | "XCircle" | "CheckCircle2" | "UsersRound" | "UserCog" | "Paintbrush" | "Loader2";


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
  return (
    <>
      <PageHeader title="Dashboard" description="Welcome to Delaware Fence Pro." />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Total Products"
          iconName="Package"
          value="150"
          description="+10 from last month"
          href="/products"
        />
        <DashboardCard
          title="Active Customers"
          iconName="Users"
          value="72"
          description="+5 new this month"
          href="/customers"
        />
        <DashboardCard
          title="Open Estimates"
          iconName="FileText"
          value="23"
          description="Totaling $15,230.00"
          href="/estimates"
        />
        <DashboardCard
          title="Pending Orders"
          iconName="ShoppingCart"
          value="8"
          description="Ready for processing"
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
