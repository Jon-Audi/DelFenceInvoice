
"use client";

import React from 'react';
import type { Invoice, Customer, Product, LineItem } from '@/types';
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
  products: Product[];
}

export function InvoiceDialog({ invoice, triggerButton, onSave, customers, products }: InvoiceDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (formData: InvoiceFormData) => {
    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const customerName = selectedCustomer ? (selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`) : 'Unknown Customer';

    const lineItems: LineItem[] = formData.lineItems.map((item) => {
      const product = products.find(p => p.id === item.productId);
      const unitPrice = product ? product.price : 0;
      return {
        id: item.id || crypto.randomUUID(),
        productId: item.productId,
        productName: product?.name || 'Unknown Product',
        quantity: item.quantity,
        unitPrice: unitPrice,
        total: item.quantity * unitPrice,
      };
    });

    const subtotal = lineItems.reduce((acc, item) => acc + item.total, 0);
    const taxAmount = 0; // Simplified for now
    const total = subtotal + taxAmount;
      
    const invoiceToSave: Invoice = {
      id: invoice?.id || crypto.randomUUID(),
      invoiceNumber: formData.invoiceNumber,
      customerId: formData.customerId,
      customerName: customerName,
      date: formData.date.toISOString(),
      dueDate: formData.dueDate?.toISOString(),
      status: formData.status,
      lineItems: lineItems,
      subtotal: subtotal,
      taxAmount: taxAmount,
      total: total,
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
          products={products}
        />
      </DialogContent>
    </Dialog>
  );
}
