
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Manage your application settings." />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="UserCog" className="mr-2 h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>Manage user accounts, roles, and permissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/users" passHref>
              <Button variant="outline">
                Manage Users
                <Icon name="ChevronRight" className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
               <Icon name="Settings" className="mr-2 h-5 w-5" />
              Company Information
            </CardTitle>
            <CardDescription>Manage your company details for estimates and invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/company" passHref>
              <Button variant="outline">
                Company Settings
                <Icon name="ChevronRight" className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="Paintbrush" className="mr-2 h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>Customize the look and feel of the application.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/settings/appearance" passHref>
              <Button variant="outline">
                Theme Settings
                <Icon name="ChevronRight" className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
