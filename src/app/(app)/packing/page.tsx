
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';


type PackableDocument = (Order | Invoice) & { docType: 'Order' | 'Invoice' };

// A new component for the packing slip dialog content
const PackingSlipDialogContent = ({ doc }: { doc: PackableDocument }) => {
    const [packedItems, setPackedItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Reset packed items when a new document is selected
        const initialPackedState = doc.lineItems.reduce((acc, item) => {
            acc[item.id] = false;
            return acc;
        }, {} as Record<string, boolean>);
        setPackedItems(initialPackedState);
    }, [doc]);

    const handlePackedChange = (itemId: string, checked: boolean) => {
        setPackedItems(prev => ({ ...prev, [itemId]: checked }));
    };

    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle className="text-2xl">
                    Packing Slip for {doc.docType} #{(doc as Order).orderNumber || (doc as Invoice).invoiceNumber}
                </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] mt-4">
                <div className="space-y-4">
                    {doc.lineItems.map(item => (
                        <div 
                          key={item.id} 
                          className={cn(
                            "flex justify-between items-center p-4 border rounded-lg transition-colors",
                            packedItems[item.id] ? "bg-green-100/50 dark:bg-green-900/20 border-green-300 dark:border-green-800" : "bg-card"
                          )}
                        >
                            <div className="flex items-center gap-4 flex-1">
                                <Checkbox
                                    id={`packed-${item.id}`}
                                    checked={packedItems[item.id]}
                                    onCheckedChange={(checked) => handlePackedChange(item.id, !!checked)}
                                    className="h-6 w-6"
                                />
                                <label
                                    htmlFor={`packed-${item.id}`}
                                    className={cn(
                                        "font-medium flex-1 text-lg cursor-pointer transition-colors",
                                        packedItems[item.id] && "text-muted-foreground line-through"
                                    )}
                                >
                                    {item.productName}
                                </label>
                            </div>
                            <div className={cn(
                                "font-bold text-2xl h-12 w-12 flex items-center justify-center rounded-md transition-colors",
                                packedItems[item.id] ? "bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200" : "bg-primary text-primary-foreground"
                            )}>
                                {item.quantity}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <DialogClose asChild className="mt-4">
              <Button type="button" variant="outline">Close</Button>
            </DialogClose>
        </DialogContent>
    );
};


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
    
    const invoicesQuery = query(collection(db, 'invoices'), where('status', 'in', ['Sent', 'Partially Paid', 'Ordered']));
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
                <TableHead>PO Number</TableHead>
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
                  <TableCell>{doc.poNumber || 'N/A'}</TableCell>
                  <TableCell>{new Date(doc.date).toLocaleDateString()}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground p-6">
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
            <PackingSlipDialogContent doc={selectedDoc} />
        </Dialog>
      )}
    </>
  );
}

