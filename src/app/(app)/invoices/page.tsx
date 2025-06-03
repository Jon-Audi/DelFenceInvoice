
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import type { Invoice, Customer } from '@/types';

const mockInvoices: Invoice[] = [
  { 
    id: 'inv_1', 
    invoiceNumber: 'INV-2024-001', 
    customerId: 'cust_1', 
    customerName: 'John Doe Fencing', 
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
    customerName: 'Jane Smith Landscaping', 
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

// Mock customer data for email generation if needed
const mockCustomers: Customer[] = [
  { 
    id: 'cust_1', 
    firstName: 'John', 
    lastName: 'Doe', 
    companyName: 'Doe Fencing Co.', 
    phone: '555-1234', 
    emailContacts: [{ id: 'ec_1', type: 'Main Contact', email: 'john.doe@doefencing.com' }], 
    customerType: 'Fence Contractor',
    address: { street: '123 Main St', city: 'Anytown', state: 'DE', zip: '19901' }
  },
  { 
    id: 'cust_2', 
    firstName: 'Jane', 
    lastName: 'Smith', 
    phone: '555-5678', 
    emailContacts: [
      { id: 'ec_2', type: 'Main Contact', email: 'jane.smith@example.com' },
      { id: 'ec_3', type: 'Billing', email: 'billing@jsmithscapes.com' }
    ], 
    customerType: 'Landscaper',
    companyName: 'J. Smith Landscaping',
    address: { street: '456 Oak Ave', city: 'Anycity', state: 'DE', zip: '19902' }
  },
];


export default function InvoicesPage() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject?: string; body?: string } | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    if (!isClient) return new Date(dateString).toISOString().split('T')[0]; // Fallback for SSR / pre-hydration
    return new Date(dateString).toLocaleDateString();
  };


  const handleGenerateEmail = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsEmailModalOpen(true);
    setIsLoadingEmail(true);
    setEmailDraft(null);

    try {
      const customer = mockCustomers.find(c => c.id === invoice.customerId);
      const invoiceItemsDescription = invoice.lineItems.map(item => `${item.productName} (Qty: ${item.quantity})`).join(', ') || 'Services/Products as per invoice.';
      
      const result = await generateInvoiceEmailDraft({
        customerName: invoice.customerName || (customer ? `${customer.firstName} ${customer.lastName}` : 'Valued Customer'),
        companyName: customer?.companyName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.date).toLocaleDateString(), // For Genkit, use consistent format
        invoiceTotal: invoice.total,
        invoiceItems: invoiceItemsDescription,
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : undefined, // For Genkit
        companyNameToDisplay: "Delaware Fence Pro",
      });
      
      setEmailDraft({ subject: result.subject, body: result.body });
    } catch (error) {
      console.error("Error generating email draft:", error);
      toast({
        title: "Error",
        description: "Failed to generate email draft.",
        variant: "destructive",
      });
      setEmailDraft({ subject: "Error", body: "Could not generate email content."});
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleSendEmail = () => {
    toast({
      title: "Email Sent (Simulation)",
      description: `Email for invoice ${selectedInvoice?.invoiceNumber} would be sent.`,
    });
    setIsEmailModalOpen(false);
  };

  return (
    <>
      <PageHeader title="Invoices" description="Create and manage customer invoices.">
        <Button>
          <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
          New Invoice
        </Button>
      </PageHeader>
      
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>A list of all invoices in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.invoiceNumber}</TableCell>
                  <TableCell>{invoice.customerName}</TableCell>
                  <TableCell>{formatDate(invoice.date)}</TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell>${invoice.total.toFixed(2)}</TableCell>
                  <TableCell>{invoice.status}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleGenerateEmail(invoice)}>
                      <Icon name="Mail" className="mr-2 h-4 w-4" />
                      Email Invoice
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedInvoice && (
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Email Draft for Invoice {selectedInvoice.invoiceNumber}</DialogTitle>
              <DialogDescription>
                Review and send the email to {selectedInvoice.customerName}.
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
                  <Label htmlFor="emailSubject">Subject</Label>
                  <Input id="emailSubject" value={emailDraft.subject || ''} readOnly />
                </div>
                <div>
                  <Label htmlFor="emailBody">Body</Label>
                  <Textarea id="emailBody" value={emailDraft.body || ''} readOnly rows={10} className="min-h-[200px]" />
                </div>
              </div>
            ) : (
               <p className="text-center py-4">Could not load email draft.</p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="button" onClick={handleSendEmail} disabled={isLoadingEmail || !emailDraft}>
                <Icon name="Send" className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
