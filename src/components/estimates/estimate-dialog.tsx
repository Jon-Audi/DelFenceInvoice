
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
  triggerButton: React.ReactElement;
  onSave: (estimate: Estimate) => void;
  onSaveCustomer: (customer: Customer) => Promise<string | void>;
  products: Product[];
  customers: Customer[];
  productCategories: string[];
}

export function EstimateDialog({ estimate, triggerButton, onSave, onSaveCustomer, products, customers, productCategories }: EstimateDialogProps) {
  const [open, setOpen] = React.useState(false);

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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{estimate ? 'Edit Estimate' : 'New Estimate'}</DialogTitle>
          <DialogDescription>
            {estimate ? 'Update the details of this estimate.' : 'Fill in the details for the new estimate.'}
          </DialogDescription>
        </DialogHeader>
        <EstimateForm
          estimate={estimate}
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
