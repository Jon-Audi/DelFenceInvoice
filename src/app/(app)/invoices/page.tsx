
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { MOCK_CUSTOMERS, MOCK_PRODUCTS, MOCK_INVOICES } from '@/lib/mock-data';


export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<Invoice | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject?: string; body?: string } | null>(null);
  const [editableSubject, setEditableSubject] = useState<string>('');
  const [editableBody, setEditableBody] = useState<string>('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  const [isConvertingInvoice, setIsConvertingInvoice] = useState(false);
  const [conversionInvoiceData, setConversionInvoiceData] = useState<InvoiceFormData | null>(null);

  useEffect(() => {
    setIsClient(true);
    const pendingInvoiceRaw = localStorage.getItem('estimateToConvert_invoice');
    if (pendingInvoiceRaw) {
      localStorage.removeItem('estimateToConvert_invoice');
      try {
        const estimateToConvert = JSON.parse(pendingInvoiceRaw) as Estimate;
        const newInvoiceData: InvoiceFormData = {
          id: crypto.randomUUID(), // Generate new ID for the invoice
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
          customerId: estimateToConvert.customerId,
          date: new Date(),
          status: 'Draft',
          lineItems: estimateToConvert.lineItems.map(li => ({
            productId: li.productId,
            quantity: li.quantity,
          })),
          notes: estimateToConvert.notes || '',
          paymentTerms: 'Due upon receipt', // Default payment terms
          dueDate: new Date(new Date().setDate(new Date().getDate() + 30)), // Default due date (e.g., 30 days from now)
        };
        setConversionInvoiceData(newInvoiceData);
        setIsConvertingInvoice(true);
      } catch (error) {
        console.error("Error processing estimate for invoice conversion:", error);
        toast({ title: "Conversion Error", description: "Could not process estimate data for invoice.", variant: "destructive" });
      }
    }
  }, []);


  const handleSaveInvoice = (invoiceToSave: Invoice) => {
    setInvoices(prevInvoices => {
      const index = prevInvoices.findIndex(i => i.id === invoiceToSave.id);
      if (index !== -1) {
        const updatedInvoices = [...prevInvoices];
        updatedInvoices[index] = invoiceToSave;
        toast({ title: "Invoice Updated", description: `Invoice ${invoiceToSave.invoiceNumber} has been updated.` });
        return updatedInvoices;
      } else {
        toast({ title: "Invoice Added", description: `Invoice ${invoiceToSave.invoiceNumber} has been added.` });
        return [...prevInvoices, invoiceToSave];
      }
    });
    if (isConvertingInvoice) {
        setIsConvertingInvoice(false);
        setConversionInvoiceData(null);
    }
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    setInvoices(prevInvoices => prevInvoices.filter(i => i.id !== invoiceId));
    toast({ title: "Invoice Deleted", description: "The invoice has been removed." });
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
            customers={customers}
            products={products}
          />
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
