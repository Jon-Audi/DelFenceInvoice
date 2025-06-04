
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
  triggerButton?: React.ReactElement; // Make trigger optional
  onSave: (invoice: Invoice) => void;
  customers: Customer[];
  products: Product[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialData?: InvoiceFormData | null;
}

export function InvoiceDialog({ 
  invoice, 
  triggerButton, 
  onSave, 
  customers, 
  products,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
  initialData 
}: InvoiceDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  // Open dialog if initialData is provided and it's a new conversion
  React.useEffect(() => {
    if (initialData && controlledIsOpen === undefined) { // Only if not controlled externally for this specific case
        setInternalOpen(true);
    }
  }, [initialData, controlledIsOpen]);

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
      id: invoice?.id || initialData?.id || crypto.randomUUID(),
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

  const dialogTitle = invoice ? 'Edit Invoice' : (initialData ? 'Create New Invoice from Estimate' : 'New Invoice');
  const dialogDescription = invoice ? 'Update the details of this invoice.' : (initialData ? 'Review and confirm the details for this new invoice based on the estimate.' : 'Fill in the details for the new invoice.');

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <InvoiceForm 
          invoice={invoice} 
          initialData={initialData}
          onSubmit={handleSubmit} 
          onClose={() => setOpen(false)}
          customers={customers} 
          products={products}
        />
      </DialogContent>
    </Dialog>
  );
}

