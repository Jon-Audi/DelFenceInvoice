
"use client";

import React from 'react';
import type { Estimate } from '@/types';
import { EstimateForm } from './estimate-form';
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
}

export function EstimateDialog({ estimate, triggerButton, onSave }: EstimateDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (data: Omit<Estimate, 'id' | 'lineItems'> & { lineItemsDescription?: string }) => {
    // For now, we'll use a simplified lineItems structure or just the description
    const estimateToSave: Estimate = {
      ...data,
      id: estimate?.id || crypto.randomUUID(),
      // Simulate line items from description if actual line item editing isn't implemented yet
      lineItems: data.lineItemsDescription ? [{ 
        id: crypto.randomUUID(), 
        productId: 'desc_prod', 
        productName: data.lineItemsDescription.substring(0,50), // Truncate for name
        quantity: 1, 
        unitPrice: data.total, // Approximation
        total: data.total 
      }] : (estimate?.lineItems || []),
      subtotal: data.total, // Assuming total includes tax for simplicity in this form version
      taxAmount: 0, // Defaulting tax for simplicity
    };
    onSave(estimateToSave);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{estimate ? 'Edit Estimate' : 'New Estimate'}</DialogTitle>
          <DialogDescription>
            {estimate ? 'Update the details of this estimate.' : 'Fill in the details for the new estimate.'}
          </DialogDescription>
        </DialogHeader>
        <EstimateForm estimate={estimate} onSubmit={handleSubmit} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
