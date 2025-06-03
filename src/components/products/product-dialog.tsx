"use client";

import React from 'react';
import type { Product } from '@/types';
import { ProductForm } from './product-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';

interface ProductDialogProps {
  product?: Product;
  triggerButton: React.ReactElement; // Expect a button-like element to trigger the dialog
  onSave?: (product: Product) => void;
}

export function ProductDialog({ product, triggerButton, onSave }: ProductDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (data: any) => {
    // Here you would typically call an API to save the product
    console.log("Product data submitted:", data);
    if (onSave) {
      onSave({ ...data, id: product?.id || crypto.randomUUID() });
    }
    setOpen(false); // Close dialog on submit
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          <DialogDescription>
            {product ? 'Update the details of this product.' : 'Fill in the details for the new product.'}
          </DialogDescription>
        </DialogHeader>
        <ProductForm product={product} onSubmit={handleSubmit} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
