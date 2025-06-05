
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { generateOrderEmailDraft } from '@/ai/flows/order-email-draft';
import type { Order, Customer, Product, Estimate, CompanySettings } from '@/types';
import { OrderDialog } from '@/components/orders/order-dialog';
import type { OrderFormData } from '@/components/orders/order-form';
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { PrintableOrder } from '@/components/orders/printable-order';

const COMPANY_SETTINGS_DOC_ID = "main";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [selectedOrderForEmail, setSelectedOrderForEmail] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject?: string; body?: string } | null>(null);
  const [editableSubject, setEditableSubject] = useState<string>('');
  const [editableBody, setEditableBody] = useState<string>('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  const [isConvertingOrder, setIsConvertingOrder] = useState(false);
  const [conversionOrderData, setConversionOrderData] = useState<OrderFormData | null>(null);

  const [orderForPrinting, setOrderForPrinting] = useState<Order | null>(null);
  const [companySettingsForPrinting, setCompanySettingsForPrinting] = useState<CompanySettings | null>(null);
  const [isLoadingCompanySettings, setIsLoadingCompanySettings] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const pendingOrderRaw = localStorage.getItem('estimateToConvert_order');
    if (pendingOrderRaw) {
      localStorage.removeItem('estimateToConvert_order');
      try {
        const estimateToConvert = JSON.parse(pendingOrderRaw) as Estimate;
        const newOrderData: OrderFormData = {
          orderNumber: `ORD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
          customerId: estimateToConvert.customerId,
          date: new Date(),
          status: 'Ordered',
          orderState: 'Open',
          lineItems: estimateToConvert.lineItems.map(li => ({
            productId: li.productId,
            quantity: li.quantity,
          })),
          notes: estimateToConvert.notes || '',
          expectedDeliveryDate: undefined,
          readyForPickUpDate: undefined,
          pickedUpDate: undefined,
        };
        setConversionOrderData(newOrderData);
        setIsConvertingOrder(true);
      } catch (error) {
        console.error("Error processing estimate for order conversion:", error);
        toast({ title: "Conversion Error", description: "Could not process estimate data for order.", variant: "destructive" });
      }
    }
  }, [toast]);

  useEffect(() => {
    setIsLoadingOrders(true);
    const unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const fetchedOrders: Order[] = [];
      snapshot.forEach((docSnap) => {
        fetchedOrders.push({ ...docSnap.data() as Omit<Order, 'id'>, id: docSnap.id });
      });
      setOrders(fetchedOrders.sort((a, b) => a.orderNumber.localeCompare(b.orderNumber)));
      setIsLoadingOrders(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      toast({ title: "Error", description: "Could not fetch orders.", variant: "destructive" });
      setIsLoadingOrders(false);
    });
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    setIsLoadingCustomers(true);
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const fetchedCustomers: Customer[] = [];
      snapshot.forEach((docSnap) => {
        fetchedCustomers.push({ ...docSnap.data() as Omit<Customer, 'id'>, id: docSnap.id });
      });
      setCustomers(fetchedCustomers);
      setIsLoadingCustomers(false);
    }, (error) => {
      console.error("Error fetching customers:", error);
      toast({ title: "Error", description: "Could not fetch customers.", variant: "destructive" });
      setIsLoadingCustomers(false);
    });
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    setIsLoadingProducts(true);
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const fetchedProducts: Product[] = [];
      snapshot.forEach((docSnap) => {
        fetchedProducts.push({ ...docSnap.data() as Omit<Product, 'id'>, id: docSnap.id });
      });
      setProducts(fetchedProducts);
      setIsLoadingProducts(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      toast({ title: "Error", description: "Could not fetch products.", variant: "destructive" });
      setIsLoadingProducts(false);
    });
    return () => unsubscribe();
  }, [toast]);


  const handleSaveOrder = async (orderToSave: Order) => {
    const { id, ...orderData } = orderToSave;
    try {
      if (id && orders.some(o => o.id === id)) {
        const orderRef = doc(db, 'orders', id);
        await setDoc(orderRef, orderData, { merge: true });
        toast({ title: "Order Updated", description: `Order ${orderToSave.orderNumber} has been updated.` });
      } else {
        const docRef = await addDoc(collection(db, 'orders'), orderData);
        toast({ title: "Order Added", description: `Order ${orderToSave.orderNumber} has been added with ID: ${docRef.id}.` });
      }
    } catch (error: any) {
      console.error("Error saving order:", error);
      toast({ title: "Error", description: `Could not save order: ${error.message}`, variant: "destructive" });
    }
    if (isConvertingOrder) {
        setIsConvertingOrder(false);
        setConversionOrderData(null);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      toast({ title: "Order Deleted", description: "The order has been removed." });
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({ title: "Error", description: "Could not delete order.", variant: "destructive" });
    }
    setOrderToDelete(null);
  };

  const fetchCompanySettings = async (): Promise<CompanySettings | null> => {
    setIsLoadingCompanySettings(true);
    try {
      const docRef = doc(db, 'companySettings', COMPANY_SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as CompanySettings;
      }
      toast({ title: "Company Settings Not Found", description: "Please configure company settings for printing.", variant: "default" });
      return null;
    } catch (error) {
      console.error("Error fetching company settings:", error);
      toast({ title: "Error", description: "Could not fetch company settings.", variant: "destructive" });
      return null;
    } finally {
      setIsLoadingCompanySettings(false);
    }
  };

  const handlePrintOrder = async (order: Order) => {
    const settings = await fetchCompanySettings();
    if (settings) {
      setCompanySettingsForPrinting(settings);
      setOrderForPrinting(order);
    } else {
      toast({ title: "Cannot Print", description: "Company settings are required for printing.", variant: "destructive"});
    }
  };

  const handlePrinted = () => {
    setOrderForPrinting(null);
    setCompanySettingsForPrinting(null);
  };

  useEffect(() => {
    if (orderForPrinting && companySettingsForPrinting && !isLoadingCompanySettings) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const printContainer = document.querySelector('.print-only-container');
          const printableContent = printContainer ? printContainer.innerHTML : 'Print container not found';
          console.log('[OrdersPage] Before print - Container found:', !!printContainer);
          console.log('[OrdersPage] Before print - Container innerHTML (first 200 chars):', printableContent.substring(0, 200));
          window.print();
          handlePrinted();
        });
      });
    }
  }, [orderForPrinting, companySettingsForPrinting, isLoadingCompanySettings]);

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

  const formatDateForDisplay = (dateString: string | undefined, options?: Intl.DateTimeFormatOptions) => {
    if (!dateString) return '';
    if (!isClient) return new Date(dateString).toISOString().split('T')[0];
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleConvertToInvoice = (order: Order) => {
    localStorage.setItem('orderToConvert_invoice', JSON.stringify(order));
    router.push('/invoices');
  };

  if (isLoadingOrders || isLoadingCustomers || isLoadingProducts) {
    return (
      <PageHeader title="Orders" description="Loading orders database...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

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
          products={products}
        />
      </PageHeader>

      {isConvertingOrder && conversionOrderData && (
        <OrderDialog
            isOpen={isConvertingOrder}
            onOpenChange={(open) => {
                setIsConvertingOrder(open);
                if (!open) setConversionOrderData(null);
            }}
            initialData={conversionOrderData}
            onSave={handleSaveOrder}
            customers={customers}
            products={products}
        />
      )}


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
                  <TableCell>{formatDateForDisplay(order.date)}</TableCell>
                  <TableCell>${order.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={
                      order.status === 'Picked up' ? 'default' :
                      order.status === 'Ready for pick up' ? 'secondary' :
                      'outline'
                    }>
                      {order.status}
                      {order.status === 'Ready for pick up' && order.readyForPickUpDate && ` (${formatDateForDisplay(order.readyForPickUpDate, { month: '2-digit', day: '2-digit' })})`}
                      {order.status === 'Picked up' && order.pickedUpDate && ` (${formatDateForDisplay(order.pickedUpDate, { month: '2-digit', day: '2-digit' })})`}
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
                          products={products}
                        />
                        <DropdownMenuItem onClick={() => handleGenerateEmail(order)}>
                          <Icon name="Mail" className="mr-2 h-4 w-4" /> Email Draft
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrintOrder(order)}>
                           <Icon name="Printer" className="mr-2 h-4 w-4" /> Print Order
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleConvertToInvoice(order)}>
                          <Icon name="FileDigit" className="mr-2 h-4 w-4" /> Convert to Invoice
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
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
           {orders.length === 0 && !isLoadingOrders && (
            <p className="p-4 text-center text-muted-foreground">No orders found.</p>
          )}
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
              <AlertDialogAction onClick={() => { orderToDelete && handleDeleteOrder(orderToDelete.id)}} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <div className="print-only-container">
        {(orderForPrinting && companySettingsForPrinting && !isLoadingCompanySettings) && (
          <PrintableOrder
            order={orderForPrinting}
            companySettings={companySettingsForPrinting}
          />
        )}
      </div>
       {isLoadingCompanySettings && orderForPrinting && ( 
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <Icon name="Loader2" className="h-10 w-10 animate-spin text-white" />
            <p className="ml-2 text-white">Preparing printable order...</p>
        </div>
      )}
    </>
  );
}

    