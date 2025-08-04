
"use client";

import React from 'react';
import type { Estimate, Product, LineItem, Customer } from '@/types';
import { EstimateForm, type EstimateFormData } from './estimate-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EstimateDialogProps {
  estimate?: Estimate;
  triggerButton?: React.ReactElement;
  onSave: (estimate: Estimate) => void;
  onSaveCustomer: (customer: Customer) => Promise<string | void>;
  products: Product[];
  customers: Customer[];
  productCategories: string[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialData?: Partial<EstimateFormData>;
}

export function EstimateDialog({ 
    estimate, 
    triggerButton, 
    onSave, 
    onSaveCustomer, 
    products, 
    customers, 
    productCategories,
    isOpen: controlledIsOpen,
    onOpenChange: controlledOnOpenChange,
    initialData,
}: EstimateDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;
  
  React.useEffect(() => {
    if (initialData && controlledIsOpen === undefined) {
      setInternalOpen(true);
    }
  }, [initialData, controlledIsOpen]);


  const handleSubmit = (formData: EstimateFormData) => {
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

    const subtotal = lineItems.reduce((acc, item) => acc + item.total, 0);
    const taxAmount = 0; 
    const total = subtotal + taxAmount;

    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const customerName = selectedCustomer ? (selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`) : (formData.customerName || 'Unknown Customer');


    const estimateToSave: Estimate = {
      id: estimate?.id || crypto.randomUUID(),
      estimateNumber: formData.estimateNumber,
      customerId: formData.customerId,
      customerName: customerName,
      date: formData.date.toISOString(),
      validUntil: formData.validUntil ? formData.validUntil.toISOString() : undefined,
      status: formData.status,
      poNumber: formData.poNumber,
      lineItems: lineItems,
      subtotal: subtotal,
      taxAmount: taxAmount,
      total: total,
      notes: formData.notes,
      internalNotes: estimate?.internalNotes,
    };
    onSave(estimateToSave);
    setOpen(false);
  };
  
  const dialogTitle = estimate ? 'Edit Estimate' : (initialData ? 'Clone Estimate' : 'New Estimate');
  const dialogDescription = estimate ? 'Update the details of this estimate.' : (initialData ? 'Review the cloned details and select a new customer.' : 'Fill in the details for the new estimate.');


  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <EstimateForm
          estimate={estimate}
          initialData={initialData}
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
          products={products}
          customers={customers}
          productCategories={productCategories}
          onSaveCustomer={onSaveCustomer}
        />
      </DialogContent>
    </Dialog>
  );
}
