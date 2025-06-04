
"use client";

import React from 'react';
import type { Invoice, Customer } from '@/types';
import { InvoiceForm, type InvoiceFormData } from './invoice-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface InvoiceDialogProps {
  invoice?: Invoice;
  triggerButton: React.ReactElement;
  onSave: (invoice: Invoice) => void;
  customers: Customer[];
}

export function InvoiceDialog({ invoice, triggerButton, onSave, customers }: InvoiceDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (formData: InvoiceFormData) => {
    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const customerName = selectedCustomer ? (selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`) : 'Unknown Customer';

    // For now, lineItems come from description. This will change with full line item editor.
    const lineItems = formData.lineItemsDescription ? [{ 
        id: crypto.randomUUID(), 
        productId: 'desc_prod_inv', 
        productName: formData.lineItemsDescription.substring(0,100), // Truncate
        quantity: 1, 
        unitPrice: formData.total, // Approximate
        total: formData.total 
      }] : (invoice?.lineItems || []);
      
    const invoiceToSave: Invoice = {
      id: invoice?.id || crypto.randomUUID(),
      invoiceNumber: formData.invoiceNumber,
      customerId: formData.customerId,
      customerName: customerName,
      date: formData.date.toISOString(),
      dueDate: formData.dueDate?.toISOString(),
      total: formData.total,
      status: formData.status,
      lineItems: lineItems,
      subtotal: formData.total, // Approximation until proper line items
      paymentTerms: formData.paymentTerms,
      notes: formData.notes,
    };
    onSave(invoiceToSave);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{invoice ? 'Edit Invoice' : 'New Invoice'}</DialogTitle>
          <DialogDescription>
            {invoice ? 'Update the details of this invoice.' : 'Fill in the details for the new invoice.'}
          </DialogDescription>
        </DialogHeader>
        <InvoiceForm 
          invoice={invoice} 
          onSubmit={handleSubmit} 
          onClose={() => setOpen(false)}
          customers={customers} 
        />
      </DialogContent>
    </Dialog>
  );
}
