
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, getDocs, addDoc, orderBy } from 'firebase/firestore';
import type { Customer, Estimate, Order, Invoice, Note } from '@/types';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/auth-context';

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(true);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  
  useEffect(() => {
    if (!customerId) return;

    setIsLoadingCustomer(true);
    const unsubCustomer = onSnapshot(doc(db, "customers", customerId), (docSnap) => {
      if (docSnap.exists()) {
        setCustomer({ id: docSnap.id, ...docSnap.data() } as Customer);
      } else {
        toast({ title: "Not Found", description: "Customer could not be found.", variant: "destructive" });
        setCustomer(null);
      }
      setIsLoadingCustomer(false);
    });

    return () => unsubCustomer();
  }, [customerId, toast]);

  useEffect(() => {
    if (!customerId) return;

    setIsLoadingDocs(true);
    const fetchDocs = async () => {
      try {
        const estimatesQuery = query(collection(db, "estimates"), where("customerId", "==", customerId), orderBy("date", "desc"));
        const ordersQuery = query(collection(db, "orders"), where("customerId", "==", customerId), orderBy("date", "desc"));
        const invoicesQuery = query(collection(db, "invoices"), where("customerId", "==", customerId), orderBy("date", "desc"));
        const notesQuery = query(collection(db, "customers", customerId, "notes"), orderBy("createdAt", "desc"));

        const [estSnap, ordSnap, invSnap, notesSnap] = await Promise.all([
          getDocs(estimatesQuery),
          getDocs(ordersQuery),
          getDocs(invoicesQuery),
          getDocs(notesQuery),
        ]);

        setEstimates(estSnap.docs.map(d => ({ id: d.id, ...d.data() } as Estimate)));
        setOrders(ordSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
        setInvoices(invSnap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)));
        setNotes(notesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Note)));

      } catch (error) {
        console.error("Error fetching customer documents:", error);
        toast({ title: "Error", description: "Could not load associated documents.", variant: "destructive" });
      } finally {
        setIsLoadingDocs(false);
      }
    };
    fetchDocs();
    
    // Also set up listeners for real-time updates if desired
    const unsubNotes = onSnapshot(query(collection(db, "customers", customerId, "notes"), orderBy("createdAt", "desc")), (snap) => {
        setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Note)))
    });
    
    return () => unsubNotes();

  }, [customerId, toast]);
  
  const handleCreateDocument = (type: 'estimate' | 'invoice' | 'order') => {
    if (!customer) return;

    const conversionData = {
        customerId: customer.id,
        customerName: customer.companyName || `${customer.firstName} ${customer.lastName}`,
        lineItems: [],
        date: new Date(),
    };
    
    localStorage.setItem(`customerToConvert_${type}`, JSON.stringify(conversionData));
    router.push(`/${type}s`);
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !user || !customerId) return;
    setIsAddingNote(true);

    try {
        const noteData: Omit<Note, 'id'> = {
            text: newNote,
            authorId: user.uid,
            authorName: user.displayName || user.email || "Unknown User",
            createdAt: new Date().toISOString(),
        };
        await addDoc(collection(db, "customers", customerId, "notes"), noteData);
        setNewNote("");
        toast({ title: "Note Added", description: "The note has been saved." });
    } catch(error) {
        console.error("Error adding note:", error);
        toast({ title: "Error", description: "Could not add the note.", variant: "destructive" });
    } finally {
        setIsAddingNote(false);
    }
  };

  const customerMetrics = useMemo(() => {
    const totalSales = invoices.reduce((sum, inv) => inv.status !== 'Voided' ? sum + inv.total : sum, 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const outstandingBalance = totalSales - totalPaid;
    return { totalSales, outstandingBalance };
  }, [invoices]);


  if (isLoadingCustomer) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="Loader2" className="h-10 w-10 animate-spin" />
        <p className="ml-4 text-muted-foreground">Loading customer details...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <PageHeader title="Customer Not Found" description="The requested customer could not be found." />
    );
  }

  return (
    <>
      <PageHeader title={customer.companyName || `${customer.firstName} ${customer.lastName}` || 'Customer'} description={customer.email || 'Customer Profile'}>
        <div className="flex gap-2">
            <Button onClick={() => handleCreateDocument('estimate')} variant="outline"><Icon name="FileText" className="mr-2"/> New Estimate</Button>
            <Button onClick={() => handleCreateDocument('invoice')}><Icon name="FileDigit" className="mr-2"/> New Invoice</Button>
        </div>
      </PageHeader>
      
      <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 space-y-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Customer Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                      <p><strong>Contact:</strong> {customer.firstName} {customer.lastName || 'N/A'}</p>
                      <p><strong>Email:</strong> {customer.email || 'N/A'}</p>
                      <p><strong>Phone:</strong> {customer.phone || 'N/A'}</p>
                      <Separator />
                      <div>
                          <p><strong>Address:</strong></p>
                          <p>{customer.address?.line1 || 'N/A'}</p>
                          {customer.address?.line2 && <p>{customer.address.line2}</p>}
                          <p>{customer.address?.city}, {customer.address?.state} {customer.address?.zip}</p>
                      </div>
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader>
                      <CardTitle>Financials</CardTitle>
                  </CardHeader>
                   <CardContent className="space-y-3 text-sm">
                      <div className="flex justify-between"><span>Total Sales:</span> <span className="font-semibold">${customerMetrics.totalSales.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Outstanding Balance:</span> <span className="font-semibold text-destructive">${customerMetrics.outstandingBalance.toFixed(2)}</span></div>
                       <Separator />
                       <div className="flex justify-between"><span>Credit Terms:</span> <span>{customer.credit?.terms || 'N/A'}</span></div>
                       <div className="flex justify-between"><span>Credit Limit:</span> <span>${(customer.credit?.limit || 0).toFixed(2)}</span></div>
                       <div className="flex justify-between"><span>On Hold:</span> <Badge variant={customer.credit?.onHold ? "destructive" : "outline"}>{customer.credit?.onHold ? 'Yes' : 'No'}</Badge></div>
                  </CardContent>
              </Card>

              <Card>
                  <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                  <CardContent>
                      <div className="space-y-2">
                          <Textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a new note..."/>
                          <Button onClick={handleAddNote} disabled={isAddingNote || !newNote.trim()}>
                              {isAddingNote && <Icon name="Loader2" className="mr-2 animate-spin"/>} Add Note
                          </Button>
                      </div>
                      <Separator className="my-4"/>
                       <div className="max-h-60 overflow-y-auto space-y-3">
                        {notes.map(note => (
                            <div key={note.id} className="text-sm p-2 bg-muted/50 rounded-md">
                                <p className="whitespace-pre-wrap">{note.text}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    - {note.authorName} on {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                                </p>
                            </div>
                        ))}
                        {notes.length === 0 && <p className="text-sm text-muted-foreground text-center">No notes yet.</p>}
                      </div>
                  </CardContent>
              </Card>

          </div>
          <div className="md:col-span-2">
              <Tabs defaultValue="invoices">
                  <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
                      <TabsTrigger value="orders">Orders ({orders.length})</TabsTrigger>
                      <TabsTrigger value="estimates">Estimates ({estimates.length})</TabsTrigger>
                  </TabsList>
                  <TabsContent value="invoices">
                      <DataTable title="Invoices" data={invoices} type="invoice" />
                  </TabsContent>
                  <TabsContent value="orders">
                       <DataTable title="Orders" data={orders} type="order" />
                  </TabsContent>
                  <TabsContent value="estimates">
                      <DataTable title="Estimates" data={estimates} type="estimate" />
                  </TabsContent>
              </Tabs>
          </div>
      </div>
    </>
  );
}


function DataTable({ title, data, type }: { title: string, data: any[], type: 'invoice' | 'order' | 'estimate' }) {
    const router = useRouter();

    if (data.length === 0) {
        return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent><p className="text-muted-foreground">No {title.toLowerCase()} found for this customer.</p></CardContent></Card>
    }
    
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Number</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item) => (
                            <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/${type}s`)}>
                                <TableCell>{item.invoiceNumber || item.orderNumber || item.estimateNumber}</TableCell>
                                <TableCell>{format(new Date(item.date), 'PP')}</TableCell>
                                <TableCell><Badge variant="outline">{item.status}</Badge></TableCell>
                                <TableCell className="text-right">${item.total.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

    