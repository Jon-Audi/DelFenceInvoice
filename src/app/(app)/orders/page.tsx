
"use client"; 

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { generateOrderEmailDraft } from '@/ai/flows/order-email-draft';
import type { Order, Customer, Product, CustomerType, EmailContactType } from '@/types'; 
import { OrderDialog } from '@/components/orders/order-dialog';

// Initial mock data for customers
const initialMockCustomers: Customer[] = [
  {
    id: 'cust_1',
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'Doe Fencing Co.',
    phone: '555-1234',
    emailContacts: [{ id: 'ec_1', type: 'Main Contact', email: 'john.doe@doefencing.com' }],
    customerType: 'Fence Contractor',
  },
  {
    id: 'cust_2',
    firstName: 'Jane',
    lastName: 'Smith',
    companyName: 'J. Smith Landscaping',
    phone: '555-5678',
    emailContacts: [{ id: 'ec_2', type: 'Main Contact', email: 'jane.smith@example.com' }],
    customerType: 'Landscaper',
  },
];

// Mock products data
const mockProducts: Product[] = [
  { id: 'prod_1', name: '6ft Cedar Picket', category: 'Fencing', unit: 'piece', price: 3.50, cost: 2.00, markupPercentage: 75, description: 'Standard cedar fence picket' },
  { id: 'prod_2', name: '4x4x8 Pressure Treated Post', category: 'Posts', unit: 'piece', price: 12.00, cost: 8.00, markupPercentage: 50, description: 'Ground contact rated post' },
  { id: 'prod_3', name: 'Vinyl Gate Kit', category: 'Gates', unit: 'kit', price: 150.00, cost: 100.00, markupPercentage: 50, description: 'Complete vinyl gate kit' },
  { id: 'prod_4', name: 'Stainless Steel Hinges', category: 'Hardware', unit: 'pair', price: 25.00, cost: 15.00, markupPercentage: 66.67, description: 'Heavy duty gate hinges' },
  { id: 'prod_5', name: 'Post Caps', category: 'Accessories', unit: 'piece', price: 2.50, cost: 1.00, markupPercentage: 150, description: 'Decorative post cap' },
];


// Initial mock data for orders
const initialMockOrders: Order[] = [
  {
    id: 'ord_1',
    orderNumber: 'ORD-2024-001',
    customerId: 'cust_1',
    customerName: 'Doe Fencing Co.',
    date: '2024-07-20T10:00:00.000Z',
    total: 350.00,
    status: 'Ordered',
    lineItems: [{id: 'li_1', productId: 'prod_1', productName: '6ft Cedar Picket', quantity: 100, unitPrice: 3.50, total: 350}],
    subtotal: 350.00,
    orderState: 'Open', 
    readyForPickUpDate: undefined,
    pickedUpDate: undefined,
  },
  {
    id: 'ord_2',
    orderNumber: 'ORD-2024-002',
    customerId: 'cust_2',
    customerName: 'J. Smith Landscaping',
    date: '2024-07-22T14:30:00.000Z',
    total: 150.00,
    status: 'Ready for pick up',
    lineItems: [{id: 'li_3', productId: 'prod_3', productName: 'Vinyl Gate Kit', quantity:1, unitPrice: 150.00, total: 150.00}],
    subtotal: 150.00,
    orderState: 'Closed', 
    readyForPickUpDate: '2024-07-28T09:00:00.000Z',
    pickedUpDate: undefined,
  },
];


export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(initialMockOrders);
  const [customers, setCustomers] = useState<Customer[]>(initialMockCustomers);
  const [selectedOrderForEmail, setSelectedOrderForEmail] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
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

  const handleSaveOrder = (orderToSave: Order) => {
    setOrders(prevOrders => {
      const index = prevOrders.findIndex(o => o.id === orderToSave.id);
      if (index !== -1) {
        const updatedOrders = [...prevOrders];
        updatedOrders[index] = orderToSave;
        toast({ title: "Order Updated", description: `Order ${orderToSave.orderNumber} has been updated.` });
        return updatedOrders;
      } else {
        toast({ title: "Order Added", description: `Order ${orderToSave.orderNumber} has been added.` });
        return [...prevOrders, { ...orderToSave, id: orderToSave.id || crypto.randomUUID() }];
      }
    });
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
    toast({ title: "Order Deleted", description: "The order has been removed." });
    setOrderToDelete(null);
  };

  const handleGenerateEmail = async (order: Order) => {
    setSelectedOrderForEmail(order);
    setIsEmailModalOpen(true);
    setIsLoadingEmail(true);
    setEmailDraft(null);
    setEditableSubject('');
    setEditableBody('');

    try {
      const orderItemsDescription = order.lineItems.map(item => 
        `- ${item.productName} (Qty: ${item.quantity}, Unit Price: $${item.unitPrice.toFixed(2)}, Total: $${item.total.toFixed(2)})`
      ).join('\n') || 'Items as per order.';
      
      const customer = customers.find(c => c.id === order.customerId);
      const customerDisplayName = customer ? (customer.companyName || `${customer.firstName} ${customer.lastName}`) : (order.customerName || 'Valued Customer');
      const customerEmail = customer?.emailContacts.find(ec => ec.type === 'Main Contact')?.email || 'customer@example.com';


      const result = await generateOrderEmailDraft({
        customerName: customerDisplayName,
        customerEmail: customerEmail,
        orderNumber: order.orderNumber,
        orderDate: new Date(order.date).toLocaleDateString(),
        orderItems: orderItemsDescription,
        orderTotal: order.total,
        companyName: "Delaware Fence Solutions",
      });

      setEmailDraft({ subject: result.subject, body: result.body });
      setEditableSubject(result.subject);
      setEditableBody(result.body);

    } catch (error) {
      console.error("Error generating email draft:", error);
      toast({ title: "Error", description: "Failed to generate email draft.", variant: "destructive" });
      setEmailDraft({ subject: "Error generating subject", body: "Could not generate email content." });
      setEditableSubject("Error generating subject");
      setEditableBody("Could not generate email content.");
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleSendEmail = () => {
    toast({
      title: "Email Sent (Simulation)",
      description: `Email with subject "${editableSubject}" for order ${selectedOrderForEmail?.orderNumber} would be sent.`,
    });
    setIsEmailModalOpen(false);
  };

  const formatDate = (dateString: string | undefined, options?: Intl.DateTimeFormatOptions) => {
    if (!dateString) return '';
    if (!isClient) return new Date(dateString).toISOString().split('T')[0]; 
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <>
      <PageHeader title="Orders" description="Create and manage customer orders.">
        <OrderDialog
          triggerButton={
            <Button>
              <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
              New Order
            </Button>
          }
          onSave={handleSaveOrder}
          customers={customers}
          products={mockProducts}
        />
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
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
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
                     <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Icon name="MoreHorizontal" className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <OrderDialog
                          order={order}
                          triggerButton={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          }
                          onSave={handleSaveOrder}
                          customers={customers}
                          products={mockProducts}
                        />
                        <DropdownMenuItem onClick={() => handleGenerateEmail(order)}>
                          <Icon name="Mail" className="mr-2 h-4 w-4" /> Email Draft
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onSelect={() => setOrderToDelete(order)}
                        >
                          <Icon name="Trash2" className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

       {selectedOrderForEmail && (
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Email Draft for Order {selectedOrderForEmail.orderNumber}</DialogTitle>
              <DialogDescription>
                Review and send the email to {selectedOrderForEmail.customerName}.
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
                  <Input id="emailSubject" value={editableSubject} onChange={(e) => setEditableSubject(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="emailBody">Body</Label>
                  <Textarea id="emailBody" value={editableBody} onChange={(e) => setEditableBody(e.target.value)} rows={10} className="min-h-[200px]" />
                </div>
              </div>
            ) : ( <p className="text-center py-4">Could not load email draft.</p> )}
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="button" onClick={handleSendEmail} disabled={isLoadingEmail || !emailDraft}>
                <Icon name="Send" className="mr-2 h-4 w-4" /> Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {orderToDelete && (
        <AlertDialog open={!!orderToDelete} onOpenChange={(isOpen) => !isOpen && setOrderToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete order "{orderToDelete.orderNumber}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteOrder(orderToDelete.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

    