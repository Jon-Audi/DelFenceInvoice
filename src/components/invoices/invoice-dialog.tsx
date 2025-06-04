
"use client";

import React from 'react';
import type { Invoice } from '@/types';
import { InvoiceForm } from './invoice-form';
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
}

export function InvoiceDialog({ invoice, triggerButton, onSave }: InvoiceDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (data: Omit<Invoice, 'id' | 'lineItems'> & { lineItemsDescription?: string }) => {
    const invoiceToSave: Invoice = {
      ...data,
      id: invoice?.id || crypto.randomUUID(),
      lineItems: data.lineItemsDescription ? [{ 
        id: crypto.randomUUID(), 
        productId: 'desc_prod_inv', 
        productName: data.lineItemsDescription.substring(0,50),
        quantity: 1, 
        unitPrice: data.total,
        total: data.total 
      }] : (invoice?.lineItems || []),
      subtotal: data.total, 
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
        <InvoiceForm invoice={invoice} onSubmit={handleSubmit} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
