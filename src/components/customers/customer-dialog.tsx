
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
  triggerButton?: React.ReactElement;
  onSave?: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'searchIndex'> & { id?: string }) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CustomerDialog({
  customer,
  triggerButton,
  onSave,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}: CustomerDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const handleSubmit = (data: any) => {
    if (onSave) {
      onSave({ id: customer?.id, ...data });
    }
    setOpen(false);
  };

  const dialogContent = (
    <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{customer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
        <DialogDescription>
          {customer ? 'Update the details for this customer.' : 'Fill in the details for the new customer.'}
        </DialogDescription>
      </DialogHeader>
      <CustomerForm
        customer={customer}
        onSubmit={handleSubmit}
        onClose={() => setOpen(false)}
      />
    </DialogContent>
  );

  if (isControlled) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      {dialogContent}
    </Dialog>
  );
}
