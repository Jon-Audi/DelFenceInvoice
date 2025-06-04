
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
  products: Product[];
  customers: Customer[];
}

export function EstimateDialog({ estimate, triggerButton, onSave, products, customers }: EstimateDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (formData: EstimateFormData) => {
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

    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const customerName = selectedCustomer ? (selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`) : 'Unknown Customer';

    const estimateToSave: Estimate = {
      id: estimate?.id || crypto.randomUUID(),
      estimateNumber: formData.estimateNumber,
      customerId: formData.customerId,
      customerName: customerName,
      date: formData.date.toISOString(),
      validUntil: formData.validUntil ? formData.validUntil.toISOString() : undefined,
      status: formData.status,
      lineItems: lineItems,
      subtotal: subtotal,
      taxAmount: taxAmount,
      total: total,
      notes: formData.notes,
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
        />
      </DialogContent>
    </Dialog>
  );
}
