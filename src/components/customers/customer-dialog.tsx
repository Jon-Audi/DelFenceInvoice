
"use client";

import React from 'react';
import type { Customer, ProductCategory } from '@/types';
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
  onSave?: (customer: Omit<Customer, 'id'> & { id?: string }) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  productCategories: ProductCategory[]; // Added this prop
}

export function CustomerDialog({
  customer,
  triggerButton,
  onSave,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
  productCategories, // Destructure new prop
}: CustomerDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

  const handleSubmit = (data: any) => {
    if (onSave) {
      const customerToSave: Omit<Customer, 'id'> & { id?: string } = {
        ...data,
        id: customer?.id, // Let onSave logic handle new ID generation
        specificMarkups: data.specificMarkups || [],
        createdAt: data.createdAt ? data.createdAt.toISOString() : new Date().toISOString(),
      };
      onSave(customerToSave);
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
        productCategories={productCategories} // Pass productCategories to CustomerForm
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
