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
  triggerButton?: React.ReactElement; // Make trigger optional
  onSave?: (customer: Customer) => void;
  isOpen?: boolean; // For controlled mode
  onOpenChange?: (open: boolean) => void; // For controlled mode
}

export function CustomerDialog({
  customer,
  triggerButton,
  onSave,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}: CustomerDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  // Determine if the dialog is controlled or uncontrolled
  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const handleSubmit = (data: any) => {
    console.log("Customer data submitted:", data);
    if (onSave) {
      onSave({ ...data, id: customer?.id || crypto.randomUUID() });
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
      <CustomerForm customer={customer} onSubmit={handleSubmit} onClose={() => setOpen(false)} />
    </DialogContent>
  );

  if (isControlled) {
    // If controlled, DialogTrigger is not needed, parent controls open state
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {dialogContent}
      </Dialog>
    );
  }

  // Uncontrolled mode with a trigger button
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      {dialogContent}
    </Dialog>
  );
}
