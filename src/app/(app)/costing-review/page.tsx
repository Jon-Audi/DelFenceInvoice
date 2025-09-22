
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Order, Invoice, Customer, Product, LineItem } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, runTransaction } from 'firebase/firestore';
import { OrderDialog } from '@/components/orders/order-dialog';
import { InvoiceDialog } from '@/components/invoices/invoice-dialog';
import { ALL_CATEGORIES_MARKUP_KEY } from '@/lib/constants';

// A unified type for displaying documents in the review list.
type ReviewableDocument = (Order | Invoice) & { docType: 'Order' | 'Invoice' };

export default function CostingReviewPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // For loading state on auto-cost button
  const { toast } = useToast();

  const [editingDoc, setEditingDoc] = useState<ReviewableDocument | null>(null);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    setIsLoading(true);

    const collections = {
      orders: (items: Order[]) => setOrders(items),
      invoices: (items: Invoice[]) => setInvoices(items),
      customers: (items: Customer[]) => setCustomers(items),
      products: (items: Product[]) => {
          setProducts(items);
          const categories = Array.from(new Set(items.map(p => p.category))).sort();
          setProductCategories(categories);
      },
    };

    Object.entries(collections).forEach(([path, setStateCallback]) => {
      unsubscribes.push(onSnapshot(collection(db, path), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setStateCallback(items as any[]);
      }, (error) => {
        console.error(`Error fetching ${path}:`, error);
        toast({ title: "Error", description: `Could not fetch ${path}.`, variant: "destructive" });
      }));
    });

    // A simple way to determine initial loading state
    Promise.all([
        new Promise(res => onSnapshot(collection(db, 'orders'), () => res(true))),
        new Promise(res => onSnapshot(collection(db, 'invoices'), () => res(true))),
        new Promise(res => onSnapshot(collection(db, 'customers'), () => res(true))),
        new Promise(res => onSnapshot(collection(db, 'products'), () => res(true))),
    ]).then(() => {
        setIsLoading(false);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [toast]);

  const documentsToReview = useMemo((): ReviewableDocument[] => {
    const docs: ReviewableDocument[] = [];
    const hasMissingCost = (item: LineItem) => item.isNonStock && (!item.cost || item.cost === 0);

    orders.forEach(order => {
      if (order.lineItems.some(hasMissingCost)) {
        docs.push({ ...order, docType: 'Order' });
      }
    });

    invoices.forEach(invoice => {
      if (invoice.lineItems.some(hasMissingCost)) {
         docs.push({ ...invoice, docType: 'Invoice' });
      }
    });

    return docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, invoices]);
  
  const handleSaveOrder = async (order: Order) => {
    setIsProcessing(order.id);
    try {
      await runTransaction(db, async (transaction) => {
          const { id, ...orderData } = order;
          const orderRef = doc(db, 'orders', id);
          transaction.set(orderRef, orderData, { merge: true });
      });
      toast({ title: "Order Updated", description: `Order #${(order as any).orderNumber} has been updated.` });
      if (editingDoc?.id === order.id) setEditingDoc(null);
    } catch (error) {
       console.error("Error saving order:", error);
       toast({ title: "Error", description: "Could not save order.", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };
  
  const handleSaveInvoice = async (invoice: Invoice) => {
    setIsProcessing(invoice.id);
    try {
      await runTransaction(db, async (transaction) => {
          const { id, ...invoiceData } = invoice;
          const invoiceRef = doc(db, 'invoices', id);
          transaction.set(invoiceRef, invoiceData, { merge: true });
      });
      toast({ title: "Invoice Updated", description: `Invoice #${(invoice as any).invoiceNumber} has been updated.` });
      if (editingDoc?.id === invoice.id) setEditingDoc(null);
    } catch (error) {
       console.error("Error saving invoice:", error);
       toast({ title: "Error", description: "Could not save invoice.", variant: "destructive" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleAutoCost = async (docToCost: ReviewableDocument) => {
    const customer = customers.find(c => c.id === docToCost.customerId);
    if (!customer) {
        toast({ title: "Customer not found", description: "Cannot auto-cost without customer data.", variant: "destructive"});
        return;
    }

    const DEFAULT_MARKUP_PERCENT = 35; // Default markup if no specific rule applies.

    const getMarkupForCategory = (categoryName?: string): number => {
        const specificRule = customer.specificMarkups?.find(m => m.categoryName === categoryName);
        const allCategoriesRule = customer.specificMarkups?.find(m => m.categoryName === ALL_CATEGORIES_MARKUP_KEY);

        if (specificRule) return specificRule.markupPercentage;
        if (allCategoriesRule) return allCategoriesRule.markupPercentage;
        return DEFAULT_MARKUP_PERCENT;
    };
    
    const updatedLineItems = docToCost.lineItems.map(item => {
      if (item.isNonStock && (!item.cost || item.cost === 0)) {
        // Find the associated product category if the item was added to the list, or use a default.
        const product = products.find(p => p.id === item.productId);
        const categoryForMarkup = item.newProductCategory || product?.category || undefined;
        
        const markupPercent = getMarkupForCategory(categoryForMarkup);
        const calculatedCost = item.unitPrice / (1 + markupPercent / 100);

        return {
          ...item,
          cost: parseFloat(calculatedCost.toFixed(2)),
          markupPercentage: markupPercent,
        };
      }
      return item;
    });
    
    // Create a new document object with the updated line items to be saved.
    const updatedDoc = {
        ...docToCost,
        lineItems: updatedLineItems,
    };
    
    // Call the appropriate save function.
    if (updatedDoc.docType === 'Order') {
        await handleSaveOrder(updatedDoc as Order);
    } else {
        await handleSaveInvoice(updatedDoc as Invoice);
    }
  };


  if (isLoading) {
    return (
      <PageHeader title="Costing Review" description="Finding documents needing attention...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="Costing Review" description="Orders & Invoices with non-stock items missing a cost." />
      <Card>
        <CardHeader>
          <CardTitle>Documents Requiring Costing</CardTitle>
          <CardDescription>
            The following documents contain non-stock items that do not have a cost associated. 
            Edit them manually or use the "Auto-Cost" feature to calculate costs based on customer markup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentsToReview.length > 0 ? documentsToReview.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <Badge variant={doc.docType === 'Order' ? 'secondary' : 'outline'}>
                      {doc.docType}
                    </Badge>
                  </TableCell>
                  <TableCell>{(doc as Order).orderNumber || (doc as Invoice).invoiceNumber}</TableCell>
                  <TableCell>{doc.customerName}</TableCell>
                  <TableCell>{new Date(doc.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                     <Button variant="secondary" size="sm" onClick={() => handleAutoCost(doc)} disabled={isProcessing === doc.id}>
                      {isProcessing === doc.id ? <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" /> : <Icon name="Calculator" className="mr-2 h-4 w-4" />}
                       Auto-Cost
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditingDoc(doc)} disabled={!!isProcessing}>
                      <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground p-6">
                        No documents require costing at this time.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {editingDoc?.docType === 'Order' && (
        <OrderDialog 
            isOpen={!!editingDoc && editingDoc.docType === 'Order'}
            onOpenChange={() => setEditingDoc(null)}
            order={editingDoc as Order}
            onSave={handleSaveOrder}
            onSaveProduct={() => Promise.resolve()}
            onSaveCustomer={() => Promise.resolve()}
            customers={customers}
            products={products}
            productCategories={productCategories}
        />
      )}
      
       {editingDoc?.docType === 'Invoice' && (
        <InvoiceDialog 
            isOpen={!!editingDoc && editingDoc.docType === 'Invoice'}
            onOpenChange={() => setEditingDoc(null)}
            invoice={editingDoc as Invoice}
            onSave={handleSaveInvoice}
            onSaveProduct={() => Promise.resolve()}
            onSaveCustomer={() => Promise.resolve()}
            customers={customers}
            products={products}
            productCategories={productCategories}
        />
      )}
    </>
  );
}
