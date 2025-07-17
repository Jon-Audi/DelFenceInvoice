
"use client";

import React from 'react';
import type { Invoice, Customer, Product, LineItem, Payment } from '@/types';
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
  initialData?: Partial<InvoiceFormData> & { lineItems: InvoiceFormData['lineItems'] } | null;
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

  const handleSubmit = (formDataFromForm: InvoiceFormData) => {
    const selectedCustomer = customers.find(c => c.id === formDataFromForm.customerId);
    const customerName = selectedCustomer ? (selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`) : 'Unknown Customer';

    const lineItems: LineItem[] = formDataFromForm.lineItems.map((item) => {
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
    const currentTaxAmount = 0; // Assuming no tax for now
    const currentTotal = parseFloat((currentSubtotal + currentTaxAmount).toFixed(2));

    const finalPayments: Payment[] = formDataFromForm.payments || [];
    const roundedTotalAmountPaid = parseFloat(finalPayments.reduce((acc, p) => acc + p.amount, 0).toFixed(2));
    const roundedBalanceDue = parseFloat((currentTotal - roundedTotalAmountPaid).toFixed(2));
    const EPSILON = 0.005;

    let determinedStatus: Invoice['status'];
    if (formDataFromForm.status === 'Voided') {
      determinedStatus = 'Voided';
    } else if (currentTotal > EPSILON && roundedBalanceDue <= EPSILON) {
      determinedStatus = 'Paid';
    } else if (currentTotal > EPSILON && roundedTotalAmountPaid > 0 && roundedBalanceDue > EPSILON) {
      determinedStatus = 'Partially Paid';
    } else if (currentTotal <= EPSILON && roundedBalanceDue <= EPSILON) {
      determinedStatus = 'Paid'; 
    } else {
      determinedStatus = formDataFromForm.status;
    }

    // Build the final, clean payload for Firestore
    const invoicePayload: Omit<Invoice, 'id'> & { id?: string } = {
        id: invoice?.id || initialData?.id || formDataFromForm.id, // Keep id for onSave logic
        invoiceNumber: formDataFromForm.invoiceNumber,
        customerId: formDataFromForm.customerId,
        customerName: customerName,
        date: formDataFromForm.date.toISOString(),
        status: determinedStatus,
        lineItems: lineItems,
        subtotal: currentSubtotal,
        taxAmount: currentTaxAmount,
        total: currentTotal,
        payments: finalPayments,
        amountPaid: roundedTotalAmountPaid,
        balanceDue: roundedBalanceDue,
    };

    // Only add optional fields if they have a truthy value
    if (formDataFromForm.dueDate) invoicePayload.dueDate = formDataFromForm.dueDate.toISOString();
    if (formDataFromForm.poNumber) invoicePayload.poNumber = formDataFromForm.poNumber;
    if (formDataFromForm.paymentTerms) invoicePayload.paymentTerms = formDataFromForm.paymentTerms;
    if (formDataFromForm.notes) invoicePayload.notes = formDataFromForm.notes;
    if (invoice?.internalNotes) invoicePayload.internalNotes = invoice.internalNotes;
    if (invoice?.orderId) invoicePayload.orderId = invoice.orderId;
    if (formDataFromForm.readyForPickUpDate) invoicePayload.readyForPickUpDate = formDataFromForm.readyForPickUpDate.toISOString();
    if (formDataFromForm.pickedUpDate) invoicePayload.pickedUpDate = formDataFromForm.pickedUpDate.toISOString();


    onSave(invoicePayload as Invoice); // Pass the clean object.
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
