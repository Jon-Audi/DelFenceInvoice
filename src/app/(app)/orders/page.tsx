
"use client"; // Marking as client component for useState and event handlers

import React, { useState, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { generateOrderEmailDraft } from '@/ai/flows/order-email-draft';
import type { Order, Customer } from '@/types'; // Assuming you have these types

// Mock data
const mockOrders: Order[] = [
  {
    id: 'ord_1',
    orderNumber: 'ORD-2024-001',
    customerId: 'cust_1',
    customerName: 'John Doe Fencing',
    date: '2024-07-20T10:00:00.000Z',
    total: 1850.50,
    status: 'Ordered',
    lineItems: [{id: 'li_1', productId: 'prod_1', productName: '6ft Cedar Picket', quantity: 100, unitPrice: 3.50, total: 350}],
    subtotal: 1850.50,
    orderState: 'Open', // Customer might add more
    readyForPickUpDate: undefined,
    pickedUpDate: undefined,
  },
  {
    id: 'ord_2',
    orderNumber: 'ORD-2024-002',
    customerId: 'cust_2',
    customerName: 'Jane Smith Landscaping',
    date: '2024-07-22T14:30:00.000Z',
    total: 975.00,
    status: 'Ready for pick up',
    lineItems: [{id: 'li_3', productId: 'prod_3', productName: 'Vinyl Gate Kit', quantity:1, unitPrice: 150.00, total: 150.00}],
    subtotal: 975.00,
    orderState: 'Closed', // Finalized, awaiting pickup
    readyForPickUpDate: '2024-07-28T09:00:00.000Z',
    pickedUpDate: undefined,
  },
  {
    id: 'ord_3',
    orderNumber: 'ORD-2024-003',
    customerId: 'cust_1',
    customerName: 'John Doe Fencing',
    date: '2024-07-25T11:15:00.000Z',
    total: 500.00,
    status: 'Picked up',
    lineItems: [{id: 'li_2', productId: 'prod_2', productName: '4x4x8 Pressure Treated Post', quantity: 20, unitPrice: 12.00, total: 240.00}],
    subtotal: 500.00,
    orderState: 'Closed', // Picked up, order fulfilled
    readyForPickUpDate: '2024-07-26T16:00:00.000Z',
    pickedUpDate: '2024-07-27T10:30:00.000Z',
  },
   {
    id: 'ord_4',
    orderNumber: 'ORD-2024-004',
    customerId: 'cust_3', // Assuming cust_3 exists or is mocked
    customerName: 'Robert Johnson Home',
    date: '2024-07-29T08:00:00.000Z',
    total: 75.00,
    status: 'Draft',
    lineItems: [{id: 'li_4', productId: 'prod_4', productName: 'Stainless Steel Hinges', quantity: 2, unitPrice: 25.00, total: 50.00}],
    subtotal: 75.00,
    orderState: 'Open',
    readyForPickUpDate: undefined,
    pickedUpDate: undefined,
  },
];

const mockCustomer: Customer = {
  id: 'cust_1',
  firstName: 'John',
  lastName: 'Doe',
  companyName: 'Doe Fencing Co.',
  phone: '555-1234',
  emailContacts: [{ id: 'ec_1', type: 'Main Contact', email: 'john.doe@doefencing.com' }],
  customerType: 'Fence Contractor',
};

export default function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject?: string; body?: string } | null>(null);
  const [editableSubject, setEditableSubject] = useState<string>('');
  const [editableBody, setEditableBody] = useState<string>('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleGenerateEmail = async (order: Order) => {
    setSelectedOrder(order);
    setIsEmailModalOpen(true);
    setIsLoadingEmail(true);
    setEmailDraft(null);
    setEditableSubject('');
    setEditableBody('');

    try {
      const orderItemsDescription = order.lineItems.map(item => `${item.productName} (Qty: ${item.quantity})`).join(', ') || 'Items as per order.';

      const result = await generateOrderEmailDraft({
        customerName: order.customerName || `${mockCustomer.firstName} ${mockCustomer.lastName}`,
        customerEmail: mockCustomer.emailContacts.find(ec => ec.type === 'Main Contact')?.email || 'customer@example.com',
        orderNumber: order.orderNumber,
        orderDate: new Date(order.date).toLocaleDateString(),
        orderItems: orderItemsDescription,
        orderTotal: order.total,
        companyName: "Delaware Fence Pro",
      });

      setEmailDraft({ subject: result.subject, body: result.body });
      setEditableSubject(result.subject);
      setEditableBody(result.body);

    } catch (error) {
      console.error("Error generating email draft:", error);
      toast({
        title: "Error",
        description: "Failed to generate email draft.",
        variant: "destructive",
      });
      const errorSubject = "Error generating subject";
      const errorBody = "Could not generate email content.";
      setEmailDraft({ subject: errorSubject, body: errorBody});
      setEditableSubject(errorSubject);
      setEditableBody(errorBody);
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleSendEmail = () => {
    toast({
      title: "Email Sent (Simulation)",
      description: `Email with subject "${editableSubject}" for order ${selectedOrder?.orderNumber} would be sent.`,
    });
    setIsEmailModalOpen(false);
  };

  const formatDate = (dateString: string | undefined, options?: Intl.DateTimeFormatOptions) => {
    if (!dateString) return '';
    if (!isClient) return new Date(dateString).toISOString().split('T')[0]; // Fallback for SSR / pre-hydration
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <>
      <PageHeader title="Orders" description="Create and manage customer orders.">
        <Button>
          <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>A list of all orders in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order State</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.orderNumber}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>{formatDate(order.date)}</TableCell>
                  <TableCell>${order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      order.status === 'Picked up' ? 'default' :
                      order.status === 'Ready for pick up' ? 'secondary' :
                      'outline'
                    }>
                      {order.status}
                      {order.status === 'Ready for pick up' && order.readyForPickUpDate && ` (${formatDate(order.readyForPickUpDate, { month: '2-digit', day: '2-digit' })})`}
                      {order.status === 'Picked up' && order.pickedUpDate && ` (${formatDate(order.pickedUpDate, { month: '2-digit', day: '2-digit' })})`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.orderState === 'Open' ? 'outline' : 'default'}>
                      {order.orderState}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleGenerateEmail(order)}>
                      <Icon name="Mail" className="mr-2 h-4 w-4" />
                      Email Draft
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       {selectedOrder && (
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Email Draft for Order {selectedOrder.orderNumber}</DialogTitle>
              <DialogDescription>
                Review and send the email to {selectedOrder.customerName}.
              </DialogDescription>
            </DialogHeader>
            {isLoadingEmail ? (
              <div className="flex flex-col justify-center items-center h-40 space-y-2">
                 <Icon name="Loader2" className="h-8 w-8 animate-spin text-primary" />
                 <p>Loading email draft...</p>
              </div>
            ) : emailDraft ? (
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="emailSubject">Subject</Label>
                  <Input
                    id="emailSubject"
                    value={editableSubject}
                    onChange={(e) => setEditableSubject(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="emailBody">Body</Label>
                  <Textarea
                    id="emailBody"
                    value={editableBody}
                    onChange={(e) => setEditableBody(e.target.value)}
                    rows={10} className="min-h-[200px]"
                  />
                </div>
              </div>
            ) : (
               <p className="text-center py-4">Could not load email draft.</p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="button" onClick={handleSendEmail} disabled={isLoadingEmail || !emailDraft}>
                <Icon name="Send" className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
