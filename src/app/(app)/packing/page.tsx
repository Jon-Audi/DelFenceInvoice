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
import { collection, onSnapshot, query, where, doc, runTransaction } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';


type PackableDocument = (Order | Invoice) & { docType: 'Order' | 'Invoice' };

// A new component for the packing slip dialog content
const PackingSlipDialogContent = ({ doc, onStatusChange, onPartialPackSave, isUpdating }: { doc: PackableDocument, onStatusChange: (newStatus: 'Ready for pick up' | 'Packed') => void, onPartialPackSave: (packedItems: Record<string, boolean>, newStatus: 'Partial Packed') => void, isUpdating: boolean }) => {
    const [packedItems, setPackedItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Reset packed items when a new document is selected, respecting existing data
        const initialPackedState = doc.lineItems.reduce((acc, item) => {
            acc[item.id] = !!item.packed; // Use existing 'packed' status
            return acc;
        }, {} as Record<string, boolean>);
        setPackedItems(initialPackedState);
    }, [doc]);

    const handlePackedChange = (itemId: string, checked: boolean) => {
        setPackedItems(prev => ({ ...prev, [itemId]: checked }));
    };

    const allItemsPacked = Object.values(packedItems).every(packed => packed) && Object.keys(packedItems).length > 0;

    return (
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle className="text-2xl">
                    Packing Slip for {doc.docType} #{(doc as Order).orderNumber || (doc as Invoice).invoiceNumber}
                </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] mt-4">
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
             <DialogFooter className="mt-4 sm:justify-between">
              <Button type="button" variant="secondary" onClick={() => onPartialPackSave(packedItems, 'Partial Packed')} disabled={isUpdating}>
                 {isUpdating && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
                Save Partial Pack
              </Button>
              <div className="flex flex-wrap gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="outline">Close</Button>
                </DialogClose>
                 <Button 
                    type="button" 
                    onClick={() => onStatusChange('Packed')}
                    disabled={!allItemsPacked || isUpdating}
                >
                    {isUpdating && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
                    Mark as Packed
                </Button>
                <Button 
                    type="button" 
                    onClick={() => onStatusChange('Ready for pick up')}
                    disabled={!allItemsPacked || isUpdating}
                >
                    {isUpdating && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
                    Ready for Pickup
                </Button>
              </div>
            </DialogFooter>
        </DialogContent>
    );
};


export default function PackingPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PackableDocument | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    setIsLoading(true);

    const ordersQuery = query(collection(db, 'orders'), where('status', 'in', ['Ordered', 'Ready for pick up', 'Packed', 'Partial Packed']));
    unsubscribes.push(onSnapshot(ordersQuery, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Order[];
      setOrders(items);
    }, (error) => {
      console.error(`Error fetching orders:`, error);
      toast({ title: "Error", description: `Could not fetch orders for packing.`, variant: "destructive" });
    }));
    
    const invoicesQuery = query(collection(db, 'invoices'), where('status', 'in', ['Sent', 'Partially Paid', 'Ordered', 'Paid', 'Partial Packed', 'Packed', 'Ready for pick up']));
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
  
  const handleStatusChange = async (newStatus: 'Ready for pick up' | 'Packed') => {
    if (!selectedDoc) return;
    setIsUpdating(true);
    
    try {
        const docRef = doc(db, selectedDoc.docType === 'Order' ? 'orders' : 'invoices', selectedDoc.id);
        const updateData: any = { status: newStatus };
        
        if (newStatus === 'Ready for pick up') {
            updateData.readyForPickUpDate = new Date().toISOString();
        }
        
        // Mark all items as packed when setting these final statuses
        const updatedLineItems = selectedDoc.lineItems.map(item => ({ ...item, packed: true }));
        updateData.lineItems = updatedLineItems;

        await runTransaction(db, async (transaction) => {
            transaction.update(docRef, updateData);
        });

        toast({
            title: "Status Updated",
            description: `${selectedDoc.docType} #${(selectedDoc as Order).orderNumber || (selectedDoc as Invoice).invoiceNumber} marked as ${newStatus}.`
        });
        setSelectedDoc(null); // Close the dialog on success

    } catch (error) {
        console.error("Error updating document status:", error);
        toast({ title: "Error", description: `Could not update status.`, variant: "destructive" });
    } finally {
        setIsUpdating(false);
    }
  };

  const handlePartialPackSave = async (packedItemsStatus: Record<string, boolean>, newStatus: 'Partial Packed') => {
    if (!selectedDoc) return;
    setIsUpdating(true);

    try {
        const docRef = doc(db, selectedDoc.docType === 'Order' ? 'orders' : 'invoices', selectedDoc.id);
        const updatedLineItems = selectedDoc.lineItems.map(item => ({
            ...item,
            packed: packedItemsStatus[item.id] || false,
        }));
        
        await runTransaction(db, async (transaction) => {
            const updatePayload: any = { lineItems: updatedLineItems };
            if(selectedDoc.docType === 'Invoice' || selectedDoc.docType === 'Order') {
                updatePayload.status = newStatus;
            }
            transaction.update(docRef, updatePayload);
        });

        toast({
            title: "Packing Progress Saved",
            description: `Packed items for ${selectedDoc.docType} #${(selectedDoc as Order).orderNumber || (selectedDoc as Invoice).invoiceNumber} have been saved.`,
        });
        setSelectedDoc(null);

    } catch (error) {
        console.error("Error saving partial pack status:", error);
        toast({ title: "Error", description: `Could not save packing progress.`, variant: "destructive" });
    } finally {
        setIsUpdating(false);
    }
  };


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
                <TableHead>Status</TableHead>
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
                  <TableCell><Badge variant="outline">{doc.status}</Badge></TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground p-6">
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
            <PackingSlipDialogContent 
              doc={selectedDoc} 
              onStatusChange={handleStatusChange}
              onPartialPackSave={handlePartialPackSave}
              isUpdating={isUpdating}
            />
        </Dialog>
      )}
    </>
  );
}
