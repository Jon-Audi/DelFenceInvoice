
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
import type { Invoice, Customer, Product, Estimate, Order, CompanySettings } from '@/types';
import { InvoiceDialog } from '@/components/invoices/invoice-dialog';
import type { InvoiceFormData } from '@/components/invoices/invoice-form';
import { InvoiceTable } from '@/components/invoices/invoice-table';
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { PrintableInvoice } from '@/components/invoices/printable-invoice';

const COMPANY_SETTINGS_DOC_ID = "main";

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

  const [invoiceForPrinting, setInvoiceForPrinting] = useState<Invoice | null>(null);
  const [companySettingsForPrinting, setCompanySettingsForPrinting] = useState<CompanySettings | null>(null);
  const [isLoadingCompanySettings, setIsLoadingCompanySettings] = useState(false);

  useEffect(() => {
    setIsClient(true); // For date formatting
  }, []);

  useEffect(() => {
    const pendingEstimateRaw = localStorage.getItem('estimateToConvert_invoice');
    const pendingOrderRaw = localStorage.getItem('orderToConvert_invoice');
    let newInvoiceData: InvoiceFormData | null = null;

    if (pendingEstimateRaw) {
      localStorage.removeItem('estimateToConvert_invoice');
      try {
        const estimateToConvert = JSON.parse(pendingEstimateRaw) as Estimate;
        newInvoiceData = {
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
          customerId: estimateToConvert.customerId,
          date: new Date(),
          status: 'Draft',
          lineItems: estimateToConvert.lineItems.map(li => ({
            productId: li.productId,
            quantity: li.quantity,
          })),
          notes: estimateToConvert.notes || '',
          paymentTerms: 'Due upon receipt',
          dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
          newPaymentAmount: undefined,
          newPaymentDate: undefined,
          newPaymentMethod: undefined,
          newPaymentNotes: undefined,
        };
      } catch (error) {
        console.error("Error processing estimate for invoice conversion:", error);
        toast({ title: "Conversion Error", description: "Could not process estimate data for invoice.", variant: "destructive" });
      }
    } else if (pendingOrderRaw) {
      localStorage.removeItem('orderToConvert_invoice');
      try {
        const orderToConvert = JSON.parse(pendingOrderRaw) as Order;
         newInvoiceData = {
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
          customerId: orderToConvert.customerId,
          date: new Date(), 
          status: 'Draft',
          lineItems: orderToConvert.lineItems.map(li => ({
            productId: li.productId,
            quantity: li.quantity,
          })),
          notes: `Converted from Order #${orderToConvert.orderNumber}. ${orderToConvert.notes || ''}`.trim(),
          paymentTerms: 'Due upon receipt', 
          dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), 
          newPaymentAmount: undefined,
          newPaymentDate: undefined,
          newPaymentMethod: undefined,
          newPaymentNotes: undefined,
        };
      } catch (error) {
        console.error("Error processing order for invoice conversion:", error);
        toast({ title: "Conversion Error", description: "Could not process order data for invoice.", variant: "destructive" });
      }
    }

    setConversionInvoiceData(newInvoiceData); 
  }, [toast]);

  useEffect(() => {
    if (conversionInvoiceData && !isLoadingProducts && !isLoadingCustomers) {
      setIsConvertingInvoice(true);
    }
  }, [conversionInvoiceData, isLoadingProducts, isLoadingCustomers]);


  useEffect(() => {
    setIsLoadingInvoices(true);
    const unsubscribe = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      const fetchedInvoices: Invoice[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedInvoices.push({
             ...data as Omit<Invoice, 'id' | 'total' | 'amountPaid' | 'balanceDue'>, 
             id: docSnap.id,
             total: data.total || 0,
             amountPaid: data.amountPaid || 0,
             balanceDue: data.balanceDue !== undefined ? data.balanceDue : (data.total || 0) - (data.amountPaid || 0),
             payments: data.payments || [],
           });
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
    const dataToSave = {
        ...invoiceData,
        payments: invoiceData.payments || [],
        amountPaid: invoiceData.amountPaid || 0,
        balanceDue: invoiceData.balanceDue !== undefined ? invoiceData.balanceDue : (invoiceData.total - (invoiceData.amountPaid || 0)),
    };

    try {
      if (id && invoices.some(i => i.id === id)) {
        const invoiceRef = doc(db, 'invoices', id);
        await setDoc(invoiceRef, dataToSave, { merge: true });
        toast({ title: "Invoice Updated", description: `Invoice ${invoiceToSave.invoiceNumber} has been updated.` });
      } else {
        const docRef = await addDoc(collection(db, 'invoices'), dataToSave);
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

  const handlePrintInvoice = async (invoice: Invoice) => {
    const settings = await fetchCompanySettings();
    if (settings) {
      setCompanySettingsForPrinting(settings);
      setInvoiceForPrinting(invoice);
    } else {
      toast({ title: "Cannot Print", description: "Company settings are required for printing.", variant: "destructive"});
    }
  };

  const handlePrinted = () => {
    // Reset state after printing is initiated by PrintableInvoice
    setInvoiceForPrinting(null);
    setCompanySettingsForPrinting(null);
  };


  const handleGenerateEmail = async (invoice: Invoice) => {
    setSelectedInvoiceForEmail(invoice);
    setIsEmailModalOpen(true);
    setIsLoadingEmail(true);
    setEmailDraft(null);
    setEditableSubject('');
    setEditableBody('');

    try {
      const customer = customers.find(c => c.id === invoice.customerId);
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
            onPrint={handlePrintInvoice}
            formatDate={formatDate}
            customers={customers}
            products={products}
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

      {/* Container for the printable invoice, hidden by default */}
      <div className="print-only-container">
        {(invoiceForPrinting && companySettingsForPrinting && !isLoadingCompanySettings) && (
          <PrintableInvoice 
            invoice={invoiceForPrinting} 
            companySettings={companySettingsForPrinting}
            onPrinted={handlePrinted} 
          />
        )}
      </div>
       {isLoadingCompanySettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <Icon name="Loader2" className="h-10 w-10 animate-spin text-white" />
            <p className="ml-2 text-white">Preparing printable invoice...</p>
        </div>
      )}
    </>
  );
}
