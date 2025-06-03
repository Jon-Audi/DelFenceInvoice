"use client";

import React from 'react';
import type { Customer } from '@/types';
import { CustomerForm } from './customer-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CustomerDialogProps {
  customer?: Customer;
  triggerButton: React.ReactElement;
  onSave?: (customer: Customer) => void;
}

export function CustomerDialog({ customer, triggerButton, onSave }: CustomerDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (data: any) => {
    console.log("Customer data submitted:", data);
    if (onSave) {
      onSave({ ...data, id: customer?.id || crypto.randomUUID() });
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
          <DialogDescription>
            {customer ? 'Update the details for this customer.' : 'Fill in the details for the new customer.'}
          </DialogDescription>
        </DialogHeader>
        <CustomerForm customer={customer} onSubmit={handleSubmit} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
