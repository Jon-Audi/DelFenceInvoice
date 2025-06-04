
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Added for consistency, though not directly used in this diff for conversion
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { useToast } from "@/hooks/use-toast";
import { generateInvoiceEmailDraft } from '@/ai/flows/invoice-email-draft';
import type { Invoice, Customer, Product, Estimate } from '@/types';
import { InvoiceDialog, type InvoiceFormData } from '@/components/invoices/invoice-dialog';
import { InvoiceTable } from '@/components/invoices/invoice-table';
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc } from 'firebase/firestore';


export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<Invoice | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject?: string; body?: string } | null>(null);
  const [editableSubject, setEditableSubject] = useState<string>('');
  const [editableBody, setEditableBody] = useState<string>('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  const [isConvertingInvoice, setIsConvertingInvoice] = useState(false);
  const [conversionInvoiceData, setConversionInvoiceData] = useState<InvoiceFormData | null>(null);

  useEffect(() => {
    setIsClient(true); // Ensures localStorage is only accessed on the client
    const pendingInvoiceRaw = localStorage.getItem('estimateToConvert_invoice');
    if (pendingInvoiceRaw) {
      localStorage.removeItem('estimateToConvert_invoice');
      try {
        const estimateToConvert = JSON.parse(pendingInvoiceRaw) as Estimate;
        const newInvoiceData: InvoiceFormData = {
          id: crypto.randomUUID(), // Generate new ID for the invoice client-side for form key, Firestore will generate its own
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
          customerId: estimateToConvert.customerId,
          date: new Date(),
          status: 'Draft',
          lineItems: estimateToConvert.lineItems.map(li => ({
            productId: li.productId,
            quantity: li.quantity,
            // id for line item itself will be generated in InvoiceDialog or Form
          })),
          notes: estimateToConvert.notes || '',
          paymentTerms: 'Due upon receipt', // Default payment terms
          dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // Default due date
        };
        setConversionInvoiceData(newInvoiceData);
        setIsConvertingInvoice(true);
      } catch (error) {
        console.error("Error processing estimate for invoice conversion:", error);
        toast({ title: "Conversion Error", description: "Could not process estimate data for invoice.", variant: "destructive" });
      }
    }
  }, []);

  // Fetch Invoices
  useEffect(() => {
    setIsLoadingInvoices(true);
    const unsubscribe = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      const fetchedInvoices: Invoice[] = [];
      snapshot.forEach((docSnap) => {
        fetchedInvoices.push({ ...docSnap.data() as Omit<Invoice, 'id'>, id: docSnap.id });
      });
      setInvoices(fetchedInvoices.sort((a, b) => a.invoiceNumber.localeCompare(b.invoiceNumber)));
      setIsLoadingInvoices(false);
    }, (error) => {
      console.error("Error fetching invoices:", error);
      toast({ title: "Error", description: "Could not fetch invoices.", variant: "destructive" });
      setIsLoadingInvoices(false);
    });
    return () => unsubscribe();
  }, [toast]);

  // Fetch Customers
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
      toast({ title: "Error", description: "Could not fetch customers for invoices.", variant: "destructive" });
      setIsLoadingCustomers(false);
    });
    return () => unsubscribe();
  }, [toast]);

  // Fetch Products
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
      toast({ title: "Error", description: "Could not fetch products for invoices.", variant: "destructive" });
      setIsLoadingProducts(false);
    });
    return () => unsubscribe();
  }, [toast]);

  const handleSaveInvoice = async (invoiceToSave: Invoice) => {
    const { id, ...invoiceData } = invoiceToSave;
    try {
      if (id && invoices.some(i => i.id === id)) { // Check if ID exists and is in current local list (implies edit)
        // Edit existing invoice
        const invoiceRef = doc(db, 'invoices', id);
        await setDoc(invoiceRef, invoiceData, { merge: true }); // Use merge for updates
        toast({ title: "Invoice Updated", description: `Invoice ${invoiceToSave.invoiceNumber} has been updated.` });
      } else {
        // Add new invoice
        const docRef = await addDoc(collection(db, 'invoices'), invoiceData);
        toast({ title: "Invoice Added", description: `Invoice ${invoiceToSave.invoiceNumber} has been added with ID: ${docRef.id}.` });
      }
    } catch (error) {
        console.error("Error saving invoice:", error);
        toast({ title: "Error", description: "Could not save invoice to database.", variant: "destructive" });
    }

    if (isConvertingInvoice) {
        setIsConvertingInvoice(false);
        setConversionInvoiceData(null);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await deleteDoc(doc(db, 'invoices', invoiceId));
      toast({ title: "Invoice Deleted", description: "The invoice has been removed." });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({ title: "Error", description: "Could not delete invoice.", variant: "destructive" });
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    if (!isClient) return new Date(dateString).toISOString().split('T')[0]; 
    return new Date(dateString).toLocaleDateString();
  };

  const handleGenerateEmail = async (invoice: Invoice) => {
    setSelectedInvoiceForEmail(invoice);
    setIsEmailModalOpen(true);
    setIsLoadingEmail(true);
    setEmailDraft(null);
    setEditableSubject('');
    setEditableBody('');

    try {
      const customer = customers.find(c => c.id === invoice.customerId); // Use customers from Firestore state
      const customerDisplayName = customer ? (customer.companyName || `${customer.firstName} ${customer.lastName}`) : (invoice.customerName || 'Valued Customer');
      const customerCompanyName = customer?.companyName;
      
      const invoiceItemsDescription = invoice.lineItems.map(item => 
        `- ${item.productName} (Qty: ${item.quantity}, Unit Price: $${item.unitPrice.toFixed(2)}, Total: $${item.total.toFixed(2)})`
      ).join('\n') || 'Services/Products as per invoice.';
      
      const result = await generateInvoiceEmailDraft({
        customerName: customerDisplayName,
        companyName: customerCompanyName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.date).toLocaleDateString(), 
        invoiceTotal: invoice.total,
        invoiceItems: invoiceItemsDescription,
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : undefined, 
        companyNameToDisplay: "Delaware Fence Solutions",
      });
      
      setEmailDraft({ subject: result.subject, body: result.body });
      setEditableSubject(result.subject);
      setEditableBody(result.body);
    } catch (error) {
      console.error("Error generating email draft:", error);
      toast({ title: "Error", description: "Failed to generate email draft.", variant: "destructive" });
      setEmailDraft({ subject: "Error generating subject", body: "Could not generate email content."});
      setEditableSubject("Error generating subject");
      setEditableBody("Could not generate email content.");
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleSendEmail = () => {
    toast({
      title: "Email Sent (Simulation)",
      description: `Email with subject "${editableSubject}" for invoice ${selectedInvoiceForEmail?.invoiceNumber} would be sent.`,
    });
    setIsEmailModalOpen(false);
  };

  if (isLoadingInvoices || isLoadingCustomers || isLoadingProducts) {
    return (
      <PageHeader title="Invoices" description="Loading invoices database...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="Invoices" description="Create and manage customer invoices.">
        <InvoiceDialog
            triggerButton={
              <Button>
                <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            }
            onSave={handleSaveInvoice}
            customers={customers}
            products={products}
          />
      </PageHeader>

      {isConvertingInvoice && conversionInvoiceData && (
        <InvoiceDialog
            isOpen={isConvertingInvoice}
            onOpenChange={(open) => {
                setIsConvertingInvoice(open);
                if (!open) setConversionInvoiceData(null);
            }}
            initialData={conversionInvoiceData}
            onSave={handleSaveInvoice}
            customers={customers}
            products={products}
        />
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>A list of all invoices in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceTable 
            invoices={invoices} 
            onSave={handleSaveInvoice}
            onDelete={handleDeleteInvoice}
            onGenerateEmail={handleGenerateEmail}
            formatDate={formatDate}
            customers={customers} // Pass fetched customers
            products={products}   // Pass fetched products
          />
           {invoices.length === 0 && !isLoadingInvoices && (
            <p className="p-4 text-center text-muted-foreground">No invoices found.</p>
          )}
        </CardContent>
      </Card>

      {selectedInvoiceForEmail && (
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Email Draft for Invoice {selectedInvoiceForEmail.invoiceNumber}</DialogTitle>
              <DialogDescription>
                Review and send the email to {selectedInvoiceForEmail.customerName}.
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
                  <Label htmlFor="emailSubjectInvoice">Subject</Label>
                  <Input id="emailSubjectInvoice" value={editableSubject} onChange={(e) => setEditableSubject(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="emailBodyInvoice">Body</Label>
                  <Textarea id="emailBodyInvoice" value={editableBody} onChange={(e) => setEditableBody(e.target.value)} rows={10} className="min-h-[200px]" />
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
    </>
  );
}
