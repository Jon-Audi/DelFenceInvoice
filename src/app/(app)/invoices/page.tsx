import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Invoice } from '@/types';

const mockInvoices: Invoice[] = [
  { id: 'inv_1', invoiceNumber: 'INV-2024-001', customerId: 'cust_1', customerName: 'John Doe Fencing', date: '2024-07-25', total: 1850.50, status: 'Sent', dueDate: '2024-08-24', lineItems: [], subtotal: 1850.50 },
  { id: 'inv_2', invoiceNumber: 'INV-2024-002', customerId: 'cust_2', customerName: 'Jane Smith Landscaping', date: '2024-07-28', total: 975.00, status: 'Paid', dueDate: '2024-08-27', lineItems: [], subtotal: 975.00 },
];


export default function InvoicesPage() {
  return (
    <>
      <PageHeader title="Invoices" description="Create and manage customer invoices.">
        <Button>
          <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </PageHeader>
      
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>A list of all invoices in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.customerName}</TableCell>
                  <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                  <TableCell>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>${invoice.total.toFixed(2)}</TableCell>
                  <TableCell>{invoice.status}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <Icon name="Mail" className="mr-2 h-4 w-4" />
                      Email Invoice
                    </Button>
                    {/* Add more actions like View, Edit, Mark as Paid */}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
