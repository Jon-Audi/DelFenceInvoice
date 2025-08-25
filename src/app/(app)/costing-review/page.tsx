
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Order, Invoice, Customer, Product, DocumentStatus } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc, writeBatch } from 'firebase/firestore';
import { OrderDialog } from '@/components/orders/order-dialog';
import { InvoiceDialog } from '@/components/invoices/invoice-dialog';
import { runTransaction } from 'firebase/firestore';

// Define a unified type for the items list
type ReviewableDocument = (Partial<Order> & Partial<Invoice>) & { 
    id: string; 
    docType: 'Order' | 'Invoice'; 
    date: string; 
    customerName: string; 
    lineItems: any[];
    status: DocumentStatus; // Unified status property
};


export default function CostingReviewPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [editingDoc, setEditingDoc] = useState<ReviewableDocument | null>(null);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    setIsLoading(true);

    const collections = {
      orders: (items: any[]) => setOrders(items as Order[]),
      invoices: (items: any[]) => setInvoices(items as Invoice[]),
      customers: (items: any[]) => setCustomers(items as Customer[]),
      products: (items: any[]) => {
          const productItems = items as Product[];
          setProducts(productItems);
          const categories = Array.from(new Set(productItems.map(p => p.category))).sort();
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

    // Simplified loading state management
    const allCollections = ['orders', 'invoices', 'customers', 'products'];
    const loadingPromises = allCollections.map(path => 
        new Promise(resolve => {
            const unsub = onSnapshot(collection(db, path), snapshot => {
                if (!snapshot.metadata.fromCache) {
                    resolve(true);
                    unsub();
                }
            }, () => resolve(true)); // Resolve on error too
        })
    );

    Promise.all(loadingPromises).then(() => {
        setIsLoading(false);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [toast]);

  const documentsToReview = useMemo((): ReviewableDocument[] => {
    const docs: ReviewableDocument[] = [];

    const hasMissingCost = (item: { isNonStock?: boolean; cost?: number }) => 
        item.isNonStock && (item.cost === undefined || item.cost === null || item.cost === 0);

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
    try {
      await runTransaction(db, async (transaction) => {
          const { id, ...orderData } = order;
          const orderRef = doc(db, 'orders', id);
          transaction.set(orderRef, orderData, { merge: true });
      });
      toast({ title: "Order Updated", description: `Order ${order.orderNumber} has been updated.` });
      setEditingDoc(null);
    } catch (error) {
       console.error("Error saving order:", error);
       toast({ title: "Error", description: "Could not save order.", variant: "destructive" });
    }
  };
  
  const handleSaveInvoice = async (invoice: Invoice) => {
    try {
      await runTransaction(db, async (transaction) => {
          const { id, ...invoiceData } = invoice;
          const invoiceRef = doc(db, 'invoices', id);
          transaction.set(invoiceRef, invoiceData, { merge: true });
      });
      toast({ title: "Invoice Updated", description: `Invoice ${invoice.invoiceNumber} has been updated.` });
      setEditingDoc(null);
    } catch (error) {
       console.error("Error saving invoice:", error);
       toast({ title: "Error", description: "Could not save invoice.", variant: "destructive" });
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
            Please edit them to ensure accurate profitability reporting.
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
                  <TableCell>{doc.docType === 'Order' ? (doc as Order).orderNumber : (doc as Invoice).invoiceNumber}</TableCell>
                  <TableCell>{doc.customerName}</TableCell>
                  <TableCell>{new Date(doc.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setEditingDoc(doc)}>
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
            isOpen={!!editingDoc}
            onOpenChange={() => setEditingDoc(null)}
            order={editingDoc as Order}
            onSave={handleSaveOrder}
            onSaveProduct={() => Promise.resolve()}
            customers={customers}
            products={products}
            productCategories={productCategories}
        />
      )}
      
       {editingDoc?.docType === 'Invoice' && (
        <InvoiceDialog 
            isOpen={!!editingDoc}
            onOpenChange={() => setEditingDoc(null)}
            invoice={editingDoc as Invoice}
            onSave={handleSaveInvoice}
            onSaveProduct={() => Promise.resolve()}
            customers={customers}
            products={products}
            productCategories={productCategories}
        />
      )}
    </>
  );
}
