
"use client";

import React from 'react';
import type { Product, ProductCategory } from '@/types';
import { BulkAddProductForm } from './bulk-add-product-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BulkAddProductsDialogProps {
  triggerButton: React.ReactElement;
  onSave: (products: Omit<Product, 'id'>[]) => void;
  productCategories: ProductCategory[];
}

export function BulkAddProductsDialog({ triggerButton, onSave, productCategories }: BulkAddProductsDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (data: { products: Omit<Product, 'id'>[] }) => {
    onSave(data.products);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Add Products</DialogTitle>
          <DialogDescription>
            Add multiple products at once. You can add more rows as needed.
          </DialogDescription>
        </DialogHeader>
        <BulkAddProductForm
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
          productCategories={productCategories}
        />
      </DialogContent>
    </Dialog>
  );
}
