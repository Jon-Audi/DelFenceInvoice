
"use client";

import React from 'react';
import type { Invoice, Customer, Product, LineItem, Payment, DocumentStatus } from '@/types';
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
  triggerButton?: React.ReactElement;
  onSave: (invoice: Invoice) => void;
  customers: Customer[];
  products: Product[];
  productCategories: string[];
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
  productCategories,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
  initialData
}: InvoiceDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  React.useEffect(() => {
    if (initialData && controlledIsOpen === undefined) {
        setInternalOpen(true);
    }
  }, [initialData, controlledIsOpen]);

  const handleSubmit = (formData: InvoiceFormData) => {
    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const customerName = selectedCustomer ? (selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`) : 'Unknown Customer';

    const lineItems: LineItem[] = formData.lineItems.map((item) => {
      const product = !item.isNonStock && item.productId ? products.find(p => p.id === item.productId) : undefined;
      const finalUnitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
      const quantity = item.quantity;
      const isReturn = item.isReturn || false;
      const itemBaseTotal = quantity * finalUnitPrice;
      
      const itemName = item.isNonStock 
                       ? (item.productName || 'Non-Stock Item') 
                       : (product?.name || 'Unknown Product');
      
      const lineItemForDb: Partial<LineItem> & Pick<LineItem, 'id'|'productName'|'quantity'|'unitPrice'|'total'|'isReturn'|'isNonStock'> = {
          id: item.id || crypto.randomUUID(),
          productName: itemName,
          quantity: quantity,
          unitPrice: finalUnitPrice,
          isReturn: isReturn,
          total: isReturn ? -itemBaseTotal : itemBaseTotal,
          isNonStock: item.isNonStock || false,
      };

      if (!item.isNonStock && item.productId) {
          lineItemForDb.productId = item.productId;
      }
      // For non-stock items, productId field is omitted

      return lineItemForDb as LineItem;
    });

    const currentSubtotal = lineItems.reduce((acc, item) => acc + item.total, 0); 
    const currentTaxAmount = 0; 
    const currentTotal = currentSubtotal + currentTaxAmount;

    let existingPayments: Payment[] = invoice?.payments ? [...invoice.payments] : [];
    let newStatus = formData.status;

    if (formData.newPaymentAmount && formData.newPaymentAmount > 0 && formData.newPaymentDate && formData.newPaymentMethod) {
      const newPayment: Payment = {
        id: crypto.randomUUID(),
        date: formData.newPaymentDate.toISOString(),
        amount: formData.newPaymentAmount,
        method: formData.newPaymentMethod,
        notes: formData.newPaymentNotes,
      };
      existingPayments.push(newPayment);
    }

    const totalAmountPaid = existingPayments.reduce((acc, p) => acc + p.amount, 0);
    const balanceDue = currentTotal - totalAmountPaid;

    if (newStatus !== 'Voided') {
        if (balanceDue <= 0 && totalAmountPaid >= currentTotal && currentTotal > 0) {
            newStatus = 'Paid';
        } else if (totalAmountPaid > 0 && balanceDue > 0) {
            newStatus = 'Partially Paid';
        } else if (totalAmountPaid === 0 && formData.status !== 'Draft' && formData.status !== 'Sent') {
             newStatus = (invoice?.status === 'Sent' && formData.status !== 'Voided' && !formData.newPaymentAmount) ? 'Sent' : 'Draft';
        }
        if (formData.status === 'Draft' || formData.status === 'Sent' || formData.status === 'Voided') {
            if (newStatus !== 'Paid' && newStatus !== 'Partially Paid') { 
                newStatus = formData.status;
            }
        }
    }


    const invoiceToSave: Invoice = {
      id: invoice?.id || initialData?.id || crypto.randomUUID(),
      invoiceNumber: formData.invoiceNumber,
      customerId: formData.customerId,
      customerName: customerName,
      date: formData.date.toISOString(),
      dueDate: formData.dueDate?.toISOString(),
      status: newStatus,
      poNumber: formData.poNumber,
      lineItems: lineItems,
      subtotal: currentSubtotal,
      taxAmount: currentTaxAmount,
      total: currentTotal,
      paymentTerms: formData.paymentTerms,
      notes: formData.notes,
      payments: existingPayments,
      amountPaid: totalAmountPaid,
      balanceDue: balanceDue,
    };
    onSave(invoiceToSave);
    setOpen(false);
  };

  const dialogTitle = invoice ? 'Edit Invoice' : (initialData ? 'Create New Invoice from Conversion' : 'New Invoice');
  const dialogDescription = invoice ? 'Update the details of this invoice.' : (initialData ? 'Review and confirm the details for this new invoice.' : 'Fill in the details for the new invoice.');

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
          productCategories={productCategories}
        />
      </DialogContent>
    </Dialog>
  );
}
