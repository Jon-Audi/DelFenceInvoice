
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Order, Invoice, LineItem } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

type PackableDocument = (Order | Invoice) & { docType: 'Order' | 'Invoice' };

export default function PackingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<PackableDocument | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    setIsLoading(true);

    const ordersQuery = query(collection(db, 'orders'), where('status', 'in', ['Ordered', 'Ready for pick up']));
    unsubscribes.push(onSnapshot(ordersQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Order[];
      setOrders(items);
    }, (error) => {
      console.error(`Error fetching orders:`, error);
      toast({ title: "Error", description: `Could not fetch orders for packing.`, variant: "destructive" });
    }));
    
    const invoicesQuery = query(collection(db, 'invoices'), where('status', 'in', ['Sent', 'Partially Paid']));
     unsubscribes.push(onSnapshot(invoicesQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Invoice[];
      setInvoices(items);
    }, (error) => {
      console.error(`Error fetching invoices:`, error);
      toast({ title: "Error", description: `Could not fetch invoices for packing.`, variant: "destructive" });
    }));
    
    Promise.all([
      new Promise(res => onSnapshot(ordersQuery, () => res(true))),
      new Promise(res => onSnapshot(invoicesQuery, () => res(true))),
    ]).finally(() => setIsLoading(false));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [toast]);

  const documentsToPack = useMemo((): PackableDocument[] => {
    const docs: PackableDocument[] = [];
    orders.forEach(order => docs.push({ ...order, docType: 'Order' }));
    invoices.forEach(invoice => docs.push({ ...invoice, docType: 'Invoice' }));
    return docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, invoices]);

  if (isLoading) {
    return (
      <PageHeader title="Packing Slips" description="Finding documents ready for material pulling...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="Packing Slips" description="Orders and invoices ready for material pulling." />
      <Card>
        <CardHeader>
          <CardTitle>Documents to Pack</CardTitle>
          <CardDescription>
            Click on a row to view the packing slip with item quantities.
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {documentsToPack.length > 0 ? documentsToPack.map((doc) => (
                <TableRow key={doc.id} onClick={() => setSelectedDoc(doc)} className="cursor-pointer">
                  <TableCell>
                    <Badge variant={doc.docType === 'Order' ? 'secondary' : 'outline'}>
                      {doc.docType}
                    </Badge>
                  </TableCell>
                  <TableCell>{(doc as Order).orderNumber || (doc as Invoice).invoiceNumber}</TableCell>
                  <TableCell>{doc.customerName}</TableCell>
                  <TableCell>{new Date(doc.date).toLocaleDateString()}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground p-6">
                      No documents are currently ready for packing.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {selectedDoc && (
        <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
            <DialogContent className="sm:max-w-xl">
                 <DialogHeader>
                    <DialogTitle className="text-2xl">
                        Packing Slip for {selectedDoc.docType} #{(selectedDoc as Order).orderNumber || (selectedDoc as Invoice).invoiceNumber}
                    </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] mt-4">
                     <div className="space-y-4">
                        {selectedDoc.lineItems.map(item => (
                            <div key={item.id} className="flex justify-between items-center p-4 border rounded-lg text-lg">
                                <span className="font-medium flex-1 mr-4">{item.productName}</span>
                                <span className="font-bold text-2xl bg-primary text-primary-foreground h-12 w-12 flex items-center justify-center rounded-md">
                                    {item.quantity}
                                </span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogClose asChild className="mt-4">
                  <Button type="button" variant="outline">Close</Button>
                </DialogClose>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
