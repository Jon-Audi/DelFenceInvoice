
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
      const finalUnitPrice = parseFloat((typeof item.unitPrice === 'number' ? item.unitPrice : 0).toFixed(2));
      const quantity = item.quantity;
      const isReturn = item.isReturn || false;
      const itemBaseTotal = parseFloat((quantity * finalUnitPrice).toFixed(2));
      
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
      return lineItemForDb as LineItem;
    });

    const currentSubtotal = parseFloat(lineItems.reduce((acc, item) => acc + item.total, 0).toFixed(2)); 
    const currentTaxAmount = 0; // Assuming no tax for now, or would be calculated & rounded
    const currentTotal = parseFloat((currentSubtotal + currentTaxAmount).toFixed(2));

    let existingPayments: Payment[] = invoice?.payments ? [...invoice.payments] : [];
    
    if (formData.newPaymentAmount && formData.newPaymentAmount > 0 && formData.newPaymentDate && formData.newPaymentMethod) {
      const newPayment: Payment = {
        id: crypto.randomUUID(),
        date: formData.newPaymentDate.toISOString(),
        amount: parseFloat(formData.newPaymentAmount.toFixed(2)),
        method: formData.newPaymentMethod,
        notes: formData.newPaymentNotes,
      };
      existingPayments.push(newPayment);
    }

    const roundedTotalAmountPaid = parseFloat(existingPayments.reduce((acc, p) => acc + p.amount, 0).toFixed(2));
    const roundedBalanceDue = parseFloat((currentTotal - roundedTotalAmountPaid).toFixed(2));
    const EPSILON = 0.005; // Half a cent

    let determinedStatus: Invoice['status'];

    if (formData.status === 'Voided') {
      determinedStatus = 'Voided';
    } else if (currentTotal > EPSILON && roundedBalanceDue <= EPSILON) { // Positive total, fully paid
      determinedStatus = 'Paid';
    } else if (currentTotal > EPSILON && roundedTotalAmountPaid > 0 && roundedBalanceDue > EPSILON) { // Positive total, some payment made, but still a balance
      determinedStatus = 'Partially Paid';
    } else if (currentTotal <= EPSILON && roundedBalanceDue <= EPSILON) { // Zero or negative total (e.g. credit memo), considered paid/closed if balance is zero
      determinedStatus = 'Paid'; 
    } else {
      // Fallback to the status selected in the form if no payment-driven status applies
      // This handles 'Draft', 'Sent', or an invoice with no payments yet, or a $0 invoice with no payments.
      determinedStatus = formData.status;
    }

    const invoiceToSave: Invoice = {
      id: invoice?.id || initialData?.id || crypto.randomUUID(),
      invoiceNumber: formData.invoiceNumber,
      customerId: formData.customerId,
      customerName: customerName,
      date: formData.date.toISOString(),
      dueDate: formData.dueDate?.toISOString(),
      status: determinedStatus,
      poNumber: formData.poNumber,
      lineItems: lineItems,
      subtotal: currentSubtotal,
      taxAmount: currentTaxAmount,
      total: currentTotal,
      paymentTerms: formData.paymentTerms,
      notes: formData.notes,
      payments: existingPayments,
      amountPaid: roundedTotalAmountPaid,
      balanceDue: roundedBalanceDue,
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
