
"use client";

import React, { useState, useEffect } from 'react';
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
import type { Invoice, Customer, CustomerType, EmailContactType } from '@/types';
import { InvoiceDialog } from '@/components/invoices/invoice-dialog';
import { InvoiceTable } from '@/components/invoices/invoice-table';

// Initial mock data for customers
const initialMockCustomers: Customer[] = [
  { 
    id: 'cust_1', 
    firstName: 'John', 
    lastName: 'Doe', 
    companyName: 'Doe Fencing Co.', 
    phone: '555-1234', 
    emailContacts: [{ id: 'ec_1', type: 'Main Contact', email: 'john.doe@doefencing.com' }], 
    customerType: 'Fence Contractor',
  },
  { 
    id: 'cust_2', 
    firstName: 'Jane', 
    lastName: 'Smith', 
    companyName: 'J. Smith Landscaping',
    phone: '555-5678', 
    emailContacts: [{ id: 'ec_2', type: 'Main Contact', email: 'jane.smith@example.com' }], 
    customerType: 'Landscaper',
  },
];

// Initial mock data for invoices
const initialMockInvoices: Invoice[] = [
  { 
    id: 'inv_1', 
    invoiceNumber: 'INV-2024-001', 
    customerId: 'cust_1', 
    customerName: 'Doe Fencing Co.', 
    date: '2024-07-25', 
    total: 1850.50, 
    status: 'Sent', 
    dueDate: '2024-08-24', 
    lineItems: [
      { id: 'li_inv_1', productId: 'prod_1', productName: '6ft Cedar Picket', quantity: 100, unitPrice: 3.50, total: 350.00 },
      { id: 'li_inv_2', productId: 'prod_2', productName: '4x4x8 Pressure Treated Post', quantity: 20, unitPrice: 12.00, total: 240.00 },
    ], 
    subtotal: 1750.50, 
    taxAmount: 100.00, 
  },
  { 
    id: 'inv_2', 
    invoiceNumber: 'INV-2024-002', 
    customerId: 'cust_2', 
    customerName: 'J. Smith Landscaping', 
    date: '2024-07-28', 
    total: 975.00, 
    status: 'Paid', 
    dueDate: '2024-08-27', 
    lineItems: [
       { id: 'li_inv_3', productId: 'prod_3', productName: 'Vinyl Gate Kit', quantity:1, unitPrice: 150.00, total: 150.00 }
    ], 
    subtotal: 900.00, 
    taxAmount: 75.00,
  },
];


export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>(initialMockInvoices);
  const [customers, setCustomers] = useState<Customer[]>(initialMockCustomers);
  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<Invoice | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject?: string; body?: string } | null>(null);
  const [editableSubject, setEditableSubject] = useState<string>('');
  const [editableBody, setEditableBody] = useState<string>('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
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
        return [...prevInvoices, { ...invoiceToSave, id: invoiceToSave.id || crypto.randomUUID() }];
      }
    });
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
      const invoiceItemsDescription = invoice.lineItems.map(item => `${item.productName} (Qty: ${item.quantity})`).join(', ') || 'Services/Products as per invoice.';
      
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
          />
      </PageHeader>
      
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
