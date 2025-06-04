
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

interface ProductDialogProps {
  product?: Product;
  triggerButton: React.ReactElement;
  onSave?: (product: Product) => void;
  productCategories: string[];
  onAddNewCategory: (category: string) => void;
}

export function ProductDialog({ product, triggerButton, onSave, productCategories, onAddNewCategory }: ProductDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (data: Omit<Product, 'id'>) => {
    if (onSave) {
      onSave({ ...data, id: product?.id || crypto.randomUUID() });
    }
    setOpen(false); 
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
        <ProductForm 
          product={product} 
          onSubmit={handleSubmit} 
          onClose={() => setOpen(false)}
          productCategories={productCategories}
          onAddNewCategory={onAddNewCategory} 
        />
      </DialogContent>
    </Dialog>
  );
}
