
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from "@/hooks/use-toast";
import { generateOrderEmailDraft } from '@/ai/flows/order-email-draft';
import type { Order, Customer, Product, Estimate, CompanySettings, EmailContact } from '@/types';
import { OrderDialog } from '@/components/orders/order-dialog';
import type { OrderFormData } from '@/components/orders/order-form';
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, getDoc, runTransaction, DocumentReference } from 'firebase/firestore';
import { PrintableOrder } from '@/components/orders/printable-order';
import { PrintableOrderPackingSlip } from '@/components/orders/printable-order-packing-slip';
import { LineItemsViewerDialog } from '@/components/shared/line-items-viewer-dialog';
import { OrderTable, type SortableOrderKeys } from '@/components/orders/order-table';
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const COMPANY_SETTINGS_DOC_ID = "main";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stableProductCategories, setStableProductCategories] = useState<string[]>([]);
  const [stableProductSubcategories, setStableProductSubcategories] = useState<string[]>([]);

  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [selectedOrderForEmail, setSelectedOrderForEmail] = useState<Order | null>(null);
  const [targetCustomerForEmail, setTargetCustomerForEmail] = useState<Customer | null>(null);
  const [selectedRecipientEmails, setSelectedRecipientEmails] = useState<string[]>([]);
  const [additionalRecipientEmail, setAdditionalRecipientEmail] = useState<string>('');

  const [emailDraft, setEmailDraft] = useState<{ subject?: string; body?: string } | null>(null);
  const [editableSubject, setEditableSubject] = useState<string>('');
  const [editableBody, setEditableBody] = useState<string>('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  const conversionHandled = useRef(false);

  const [isConvertingOrder, setIsConvertingOrder] = useState(false);
  const [conversionOrderData, setConversionOrderData] = useState<OrderFormData | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableOrderKeys; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const [orderForViewingItems, setOrderForViewingItems] = useState<Order | null>(null);
  const [isLineItemsViewerOpen, setIsLineItemsViewerOpen] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const [orderToPrint, setOrderToPrint] = useState<any | null>(null);
  const [packingSlipToPrint, setPackingSlipToPrint] = useState<any | null>(null);
  
  useEffect(() => {
    setIsClient(true);
    if (conversionHandled.current) return;
    if (typeof window !== 'undefined') {
      const pendingOrderRaw = localStorage.getItem('estimateToConvert_order');
      if (pendingOrderRaw) {
        conversionHandled.current = true;
        localStorage.removeItem('estimateToConvert_order');
        try {
          const estimateToConvert = JSON.parse(pendingOrderRaw) as Estimate;
          const newOrderData: OrderFormData = {
            orderNumber: `ORD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
            customerId: estimateToConvert.customerId,
            date: new Date(),
            status: 'Ordered',
            orderState: 'Open',
            poNumber: estimateToConvert.poNumber || '',
            lineItems: estimateToConvert.lineItems.map(li => ({
              id: li.id,
              productId: li.productId,
              productName: li.productName,
              quantity: li.quantity,
              unitPrice: li.unitPrice,
              isReturn: li.isReturn || false,
              isNonStock: li.isNonStock || false,
              addToProductList: li.addToProductList ?? false,
            })),
            notes: `Converted from Estimate #${estimateToConvert.estimateNumber}. ${estimateToConvert.notes || ''}`.trim(),
            expectedDeliveryDate: undefined,
            readyForPickUpDate: undefined,
            pickedUpDate: undefined,
            payments: [],
          };
          setConversionOrderData(newOrderData);
        } catch (error) {
          console.error("Error processing estimate for order conversion:", error);
          toast({ title: "Conversion Error", description: "Could not process estimate data for order.", variant: "destructive" });
        }
      }
    }
  }, [toast]);

  const handleSaveCustomer = async (customerToSave: Customer): Promise<string | void> => {
    const { id, ...customerData } = customerToSave;
    try {
      if (id && customers.some(c => c.id === id)) {
        const customerRef = doc(db, 'customers', id);
        await setDoc(customerRef, customerData, { merge: true });
        toast({ title: "Customer Updated", description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been updated.` });
        return id;
      } else {
        const dataToSave = { ...customerData, createdAt: new Date().toISOString() };
        const docRef = await addDoc(collection(db, 'customers'), dataToSave);
        toast({ title: "Customer Added", description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been added.` });
        return docRef.id;
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not save customer to database.", variant: "destructive" });
    }
  };

  const handleSaveProduct = async (productToSave: Omit<Product, 'id'>): Promise<string | void> => {
    try {
      const docRef = await addDoc(collection(db, 'products'), productToSave);
      toast({
        title: "Product Added",
        description: `Product ${productToSave.name} has been added to the product list.`,
      });
      return docRef.id;
    } catch (error) {
      console.error("Error saving new product from invoice:", error);
      toast({
        title: "Error Saving Product",
        description: "Could not save the new item to the product list.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (conversionOrderData && !isLoadingProducts && !isLoadingCustomers) {
      setIsConvertingOrder(true);
    }
  }, [conversionOrderData, isLoadingProducts, isLoadingCustomers]);


  useEffect(() => {
    setIsLoadingOrders(true);
    const unsubscribe = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const fetchedOrders: Order[] = [];
      snapshot.forEach((docSnap) => {
         const data = docSnap.data();
        fetchedOrders.push({
          ...data as Omit<Order, 'id' | 'total' | 'amountPaid' | 'balanceDue' | 'payments'>,
          id: docSnap.id,
          total: data.total || 0,
          amountPaid: data.amountPaid || 0,
          balanceDue: data.balanceDue !== undefined ? data.balanceDue : (data.total || 0) - (data.amountPaid || 0),
          payments: data.payments || [],
        });
      });
      setOrders(fetchedOrders);
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

  useEffect(() => {
    if (products && products.length > 0) {
        const newCategories = Array.from(new Set(products.map(p => p.category))).sort();
        setStableProductCategories(currentStableCategories => {
            if (JSON.stringify(newCategories) !== JSON.stringify(currentStableCategories)) {
                return newCategories;
            }
            return currentStableCategories;
        });
        const newSubcategories = Array.from(new Set(products.map(p => p.subcategory).filter(Boolean) as string[])).sort();
        setStableProductSubcategories(currentStableSubcategories => {
            if (JSON.stringify(newSubcategories) !== JSON.stringify(currentStableSubcategories)) {
                return newSubcategories;
            }
            return currentStableSubcategories;
        });
    } else {
        setStableProductCategories(currentStableCategories => {
            if (currentStableCategories.length > 0) return [];
            return currentStableCategories;
        });
        setStableProductSubcategories(currentStableSubcategories => {
            if (currentStableSubcategories.length > 0) return [];
            return currentStableSubcategories;
        });
    }
  }, [products]);

  const handleSaveOrder = async (orderToSave: Order) => {
    try {
        await runTransaction(db, async (transaction) => {
            const { id, ...orderDataFromDialog } = orderToSave;
            
            // --- Phase 1: Pre-computation and ID collection ---
            const inventoryChanges = new Map<string, number>();
            let originalOrder: Order | null = null;
            
            if (id) {
                const originalOrderRef = doc(db, 'orders', id);
                const originalOrderSnap = await transaction.get(originalOrderRef);
                if (originalOrderSnap.exists()) {
                    originalOrder = { id, ...originalOrderSnap.data() } as Order;
                    originalOrder.lineItems.forEach(item => {
                        if (item.productId && !item.isNonStock) {
                            const change = item.isReturn ? -item.quantity : item.quantity;
                            inventoryChanges.set(item.productId, (inventoryChanges.get(item.productId) || 0) + change);
                        }
                    });
                }
            }

            orderDataFromDialog.lineItems.forEach(item => {
                if (item.productId && !item.isNonStock) {
                    const change = item.isReturn ? item.quantity : -item.quantity;
                    inventoryChanges.set(item.productId, (inventoryChanges.get(item.productId) || 0) + change);
                }
            });

            const productIdsToUpdate = Array.from(inventoryChanges.keys());
            if (productIdsToUpdate.length === 0) {
                const orderRef = id ? doc(db, 'orders', id) : doc(collection(db, 'orders'));
                transaction.set(orderRef, orderDataFromDialog, id ? { merge: true } : {});
                return;
            }

            // --- Phase 2: Batch Read ---
            const productRefs = productIdsToUpdate.map(pid => doc(db, 'products', pid));
            const productReadPromises = productRefs.map(ref => transaction.get(ref));
            const productSnapshots = await Promise.all(productReadPromises);

            // --- Phase 3: Write ---
            productSnapshots.forEach((productSnap, index) => {
                if (!productSnap.exists()) {
                    throw new Error(`Product with ID ${productRefs[index].id} not found during transaction!`);
                }
                const productId = productSnap.id;
                const quantityChange = inventoryChanges.get(productId);
                if (quantityChange === undefined) return;

                const currentStock = productSnap.data().quantityInStock || 0;
                const newStock = currentStock + quantityChange;
                transaction.update(productSnap.ref, { quantityInStock: newStock });
            });
            
            const orderRef = id ? doc(db, 'orders', id) : doc(collection(db, 'orders'));
            transaction.set(orderRef, orderDataFromDialog, id ? { merge: true } : {});
        });

        toast({
            title: orderToSave.id ? "Order Updated" : "Order Added",
            description: `Order ${orderToSave.orderNumber} and stock levels have been updated.`
        });
    } catch (error: any) {
        console.error("Error saving order:", error);
        toast({ title: "Error", description: `Could not save order: ${error.message}`, variant: "destructive" });
    } finally {
        if (isConvertingOrder) {
            setIsConvertingOrder(false);
            setConversionOrderData(null);
        }
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
  };

  const fetchCompanySettings = async (): Promise<CompanySettings | null> => {
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
    }
  };

  const handlePrepareAndPrintOrder = async (order: Order) => {
    const settings = await fetchCompanySettings();
    if (settings) {
      const absoluteLogoUrl = `${window.location.origin}/Logo.png`;

      setOrderToPrint({
        order: order,
        companySettings: settings,
        logoUrl: absoluteLogoUrl,
      });
      setPackingSlipToPrint(null); 
      setTimeout(() => {
        if (printRef.current) {
          const printContents = printRef.current.innerHTML;
          const win = window.open('', '_blank');
          if (win) {
            win.document.write('<html><head><title>Print Order</title>');
            win.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">');
            win.document.write('<style>body { margin: 0; } .print-only-container { width: 100%; min-height: 100vh; } @media print { body { size: auto; margin: 0; } .print-only { display: block !important; } .print-only-container { display: block !important; } }</style>');
            win.document.write('</head><body>');
            win.document.write(printContents);
            win.document.write('</body></html>');
            win.document.close();
            win.focus();
            setTimeout(() => { win.print(); win.close(); }, 750);
          } else {
            toast({ title: "Print Error", description: "Popup blocked.", variant: "destructive" });
          }
        }
        setOrderToPrint(null); 
      }, 100);
    } else {
      toast({ title: "Cannot Print", description: "Company settings are required.", variant: "destructive" });
    }
  };

  const handlePrepareAndPrintOrderPackingSlip = async (order: Order) => {
    const settings = await fetchCompanySettings();
    if (settings) {
      const absoluteLogoUrl = `${window.location.origin}/Logo.png`;

      setPackingSlipToPrint({
        order: order,
        companySettings: settings,
        logoUrl: absoluteLogoUrl,
      });
      setOrderToPrint(null); 
      setTimeout(() => {
        if (printRef.current) {
          const printContents = printRef.current.innerHTML;
          const win = window.open('', '_blank');
          if (win) {
            win.document.write('<html><head><title>Print Packing Slip</title>');
            win.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">');
            win.document.write('<style>body { margin: 0; } .print-only-container { width: 100%; min-height: 100vh; } @media print { body { size: auto; margin: 0; } .print-only { display: block !important; } .print-only-container { display: block !important; } }</style>');
            win.document.write('</head><body>');
            win.document.write(printContents);
            win.document.write('</body></html>');
            win.document.close();
            win.focus();
            setTimeout(() => { win.print(); win.close(); }, 750);
          } else {
            toast({ title: "Print Error", description: "Popup blocked.", variant: "destructive" });
          }
        }
        setPackingSlipToPrint(null); 
      }, 100);
    } else {
      toast({ title: "Cannot Print", description: "Company settings are required.", variant: "destructive" });
    }
  };


  const handleGenerateEmail = async (order: Order) => {
    setSelectedOrderForEmail(order);
    const customer = customers.find(c => c.id === order.customerId);
    setTargetCustomerForEmail(customer || null);
    setSelectedRecipientEmails([]);
    setAdditionalRecipientEmail('');

    setIsEmailModalOpen(true);
    setIsLoadingEmail(true);
    setEmailDraft(null);
    setEditableSubject('');
    setEditableBody('');

    try {
      const orderItemsDescription = order.lineItems.map(item =>
        `- ${item.productName} (Qty: ${item.quantity}, Unit Price: $${item.unitPrice.toFixed(2)}, Total: $${item.total.toFixed(2)})`
      ).join('\n') || 'Items as per order.';

      const customerDisplayName = customer ? (customer.companyName || `${customer.firstName} ${customer.lastName}`) : (order.customerName || 'Valued Customer');
      const customerEmail = customer?.emailContacts.find(ec => ec.type === 'Main Contact')?.email || customer?.emailContacts[0]?.email ||'customer@example.com';

      const result = await generateOrderEmailDraft({
        customerName: customerDisplayName,
        customerEmail: customerEmail,
        orderNumber: order.orderNumber,
        orderDate: new Date(order.date).toLocaleDateString(),
        orderItems: orderItemsDescription,
        orderTotal: order.total,
        companyName: (await fetchCompanySettings())?.companyName || "Delaware Fence Pro",
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

  const handleSendEmail = async () => {
    if (!selectedOrderForEmail || !editableSubject || !editableBody) {
        toast({ title: "Error", description: "Email content or order details missing.", variant: "destructive"});
        return;
    }
    
    const finalRecipients: { email: string; name: string }[] = [];
    if (targetCustomerForEmail && targetCustomerForEmail.emailContacts) {
        selectedRecipientEmails.forEach(selEmail => {
            const contact = targetCustomerForEmail.emailContacts.find(ec => ec.email === selEmail);
            if (contact) {
                finalRecipients.push({ email: contact.email, name: contact.name || '' });
            }
        });
    }
    if (additionalRecipientEmail.trim() !== "") {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(additionalRecipientEmail.trim())) {
          if (!finalRecipients.some(r => r.email === additionalRecipientEmail.trim())) {
              finalRecipients.push({ email: additionalRecipientEmail.trim(), name: '' });
          }
      } else {
        toast({ title: "Invalid Email", description: "The additional email address is not valid.", variant: "destructive" });
        return;
      }
    }

    if (finalRecipients.length === 0) {
      toast({ title: "No Recipients", description: "Please select or add at least one email recipient.", variant: "destructive" });
      return;
    }

    setIsLoadingEmail(true);
    try {
      await addDoc(collection(db, 'emails'), {
        to: finalRecipients,
        subject: editableSubject,
        html: editableBody,
      });
      toast({
        title: "Email Queued",
        description: `Email for order ${selectedOrderForEmail.orderNumber} has been queued for sending.`,
      });
      setIsEmailModalOpen(false);
    } catch (error: any) {
      console.error("Error queueing email:", error);
      toast({
        title: "Email Queue Failed",
        description: error.message || "Could not queue the email. Check Firestore permissions and console.",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const formatDateForDisplay = (dateString: string | undefined, options?: Intl.DateTimeFormatOptions) => {
    if (!dateString) return 'N/A';
    if (!isClient) return new Date(dateString).toISOString().split('T')[0];
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const handleConvertToInvoice = (order: Order) => {
    localStorage.setItem('orderToConvert_invoice', JSON.stringify(order));
    router.push('/invoices');
  };

  const handleViewItems = (orderToView: Order) => {
    setOrderForViewingItems(orderToView);
    setIsLineItemsViewerOpen(true);
  };

  const requestSort = (key: SortableOrderKeys) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      if (key === 'date' || key === 'total' || key === 'amountPaid' || key === 'balanceDue' ||
          key === 'expectedDeliveryDate' || key === 'readyForPickUpDate' || key === 'pickedUpDate') {
        direction = 'desc';
      } else {
        direction = 'asc';
      }
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredOrders = useMemo(() => {
    let sortableItems = orders.filter(order => {
        if (!searchTerm.trim()) return true;
        const lowercasedFilter = searchTerm.toLowerCase();
        const searchFields = [
            order.orderNumber,
            order.customerName,
            order.poNumber,
            order.status,
            order.orderState,
        ];
        return searchFields.some(field =>
            field && field.toLowerCase().includes(lowercasedFilter)
        );
    });

    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key as keyof Order];
        const valB = b[sortConfig.key as keyof Order];

        let comparison = 0;

        if (valA === null || valA === undefined) comparison = 1;
        else if (valB === null || valB === undefined) comparison = -1;
        else if (['date', 'expectedDeliveryDate', 'readyForPickUpDate', 'pickedUpDate'].includes(sortConfig.key)) {
          comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else {
          comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
        }
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [orders, searchTerm, sortConfig]);

  const renderSortArrow = (columnKey: SortableOrderKeys) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === 'asc' ? <Icon name="ChevronUp" className="inline ml-1 h-4 w-4" /> : <Icon name="ChevronDown" className="inline ml-1 h-4 w-4" />;
    }
    return null;
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
          onSaveProduct={handleSaveProduct}
          onSaveCustomer={handleSaveCustomer}
          customers={customers}
          products={products}
          productCategories={stableProductCategories}
          productSubcategories={stableProductSubcategories}
        />
      </PageHeader>

      {isConvertingOrder && conversionOrderData && !isLoadingProducts && !isLoadingCustomers && (
        <OrderDialog
            isOpen={isConvertingOrder}
            onOpenChange={(open) => {
                setIsConvertingOrder(open);
                if (!open) setConversionOrderData(null);
            }}
            initialData={conversionOrderData}
            onSave={handleSaveOrder}
            onSaveProduct={handleSaveProduct}
            onSaveCustomer={handleSaveCustomer}
            customers={customers}
            products={products}
            productCategories={stableProductCategories}
            productSubcategories={stableProductSubcategories}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Orders</CardTitle>
          <CardDescription>A list of all orders in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by #, customer, PO, status, or state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm mb-4"
          />
          <OrderTable
            orders={sortedAndFilteredOrders}
            onSave={handleSaveOrder}
            onDelete={handleDeleteOrder}
            onGenerateEmail={handleGenerateEmail}
            onPrint={handlePrepareAndPrintOrder}
            onPrintPackingSlip={handlePrepareAndPrintOrderPackingSlip}
            formatDate={formatDateForDisplay}
            customers={customers}
            products={products}
            productCategories={stableProductCategories}
            productSubcategories={stableProductSubcategories}
            onViewItems={handleViewItems}
            onConvertToInvoice={handleConvertToInvoice}
            sortConfig={sortConfig}
            requestSort={requestSort}
            renderSortArrow={renderSortArrow}
            onSaveProduct={handleSaveProduct}
            onSaveCustomer={handleSaveCustomer}
          />
           {sortedAndFilteredOrders.length === 0 && (
             <p className="p-4 text-center text-muted-foreground">
               {orders.length === 0 ? "No orders found." : "No orders match your search."}
            </p>
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
            {isLoadingEmail && !emailDraft ? ( 
              <div className="flex flex-col justify-center items-center h-60 space-y-2">
                 <Icon name="Loader2" className="h-8 w-8 animate-spin text-primary" />
                 <p>Loading email draft...</p>
              </div>
            ) : emailDraft ? (
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Recipients</Label>
                  {targetCustomerForEmail && targetCustomerForEmail.emailContacts.length > 0 ? (
                    <ScrollArea className="h-24 w-full rounded-md border p-2 mb-2">
                      {targetCustomerForEmail.emailContacts.map((contact: EmailContact) => (
                        <div key={contact.id} className="flex items-center space-x-2 mb-1">
                          <Checkbox
                            id={`email-contact-order-${contact.id}`}
                            checked={selectedRecipientEmails.includes(contact.email)}
                            onCheckedChange={(checked) => {
                              setSelectedRecipientEmails(prev =>
                                checked ? [...prev, contact.email] : prev.filter(e => e !== contact.email)
                              );
                            }}
                          />
                          <Label htmlFor={`email-contact-order-${contact.id}`} className="text-sm font-normal">
                            {contact.email} ({contact.type} - {contact.name || 'N/A'})
                          </Label>
                        </div>
                      ))}
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-2">No saved email contacts for this customer.</p>
                  )}
                  <FormFieldWrapper>
                    <Label htmlFor="additionalEmailOrder">Or add another email:</Label>
                    <Input
                      id="additionalEmailOrder"
                      type="email"
                      placeholder="another@example.com"
                      value={additionalRecipientEmail}
                      onChange={(e) => setAdditionalRecipientEmail(e.target.value)}
                    />
                  </FormFieldWrapper>
                </div>
                <Separator />
                <div>
                  <Label htmlFor="emailSubjectOrder">Subject</Label>
                  <Input id="emailSubjectOrder" value={editableSubject} onChange={(e) => setEditableSubject(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="emailBodyOrder">Body</Label>
                  <Textarea id="emailBodyOrder" value={editableBody} onChange={(e) => setEditableBody(e.target.value)} rows={8} className="min-h-[150px]" />
                </div>
              </div>
            ) : ( <p className="text-center py-4">Could not load email draft.</p> )}
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="button" onClick={handleSendEmail} disabled={isLoadingEmail || !emailDraft}>
                {isLoadingEmail && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      <div style={{ display: 'none' }}>
        {orderToPrint && <PrintableOrder ref={printRef} {...orderToPrint} />}
        {packingSlipToPrint && <PrintableOrderPackingSlip ref={printRef} {...packingSlipToPrint} />}
      </div>

      {orderForViewingItems && (
        <LineItemsViewerDialog
          isOpen={isLineItemsViewerOpen}
          onOpenChange={setIsLineItemsViewerOpen}
          lineItems={orderForViewingItems.lineItems}
          documentType="Order"
          documentNumber={orderForViewingItems.orderNumber}
        />
      )}
    </>
  );
}

const FormFieldWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="space-y-1">{children}</div>
);

    
