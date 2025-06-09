
"use client";

import React, { useState, useEffect } from 'react';
import type { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Icon } from '@/components/icons';

interface BulkAddProductsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  productCategories: string[];
  onAddItems: (items: Array<{ productId: string; quantity: number }>) => void;
}

interface SelectedProductInfo {
  selected: boolean;
  quantity: number;
}

export function BulkAddProductsDialog({
  isOpen,
  onOpenChange,
  products,
  productCategories,
  onAddItems,
}: BulkAddProductsDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(productCategories[0] || undefined);
  const [productsInView, setProductsInView] = useState<Product[]>([]);
  const [selectedProductsMap, setSelectedProductsMap] = useState<Map<string, SelectedProductInfo>>(new Map());

  useEffect(() => {
    if (selectedCategory) {
      const filtered = products.filter(p => p.category === selectedCategory);
      setProductsInView(filtered);
      // Reset selections when category changes, or merge if preferred
      const newMap = new Map<string, SelectedProductInfo>();
      filtered.forEach(p => {
        const existing = selectedProductsMap.get(p.id);
        newMap.set(p.id, existing || { selected: false, quantity: 1 });
      });
      setSelectedProductsMap(newMap);
    } else {
      setProductsInView(products); // Show all if no category selected (or handle as needed)
      const newMap = new Map<string, SelectedProductInfo>();
      products.forEach(p => {
         const existing = selectedProductsMap.get(p.id);
        newMap.set(p.id, existing || { selected: false, quantity: 1 });
      });
      setSelectedProductsMap(newMap);
    }
  }, [selectedCategory, products]);

  const handleProductSelectionChange = (productId: string, checked: boolean) => {
    setSelectedProductsMap(prevMap => {
      const newMap = new Map(prevMap);
      const current = newMap.get(productId) || { selected: false, quantity: 1 };
      newMap.set(productId, { ...current, selected: checked });
      return newMap;
    });
  };

  const handleQuantityChange = (productId: string, quantityStr: string) => {
    const quantity = parseInt(quantityStr, 10);
    setSelectedProductsMap(prevMap => {
      const newMap = new Map(prevMap);
      const current = newMap.get(productId) || { selected: false, quantity: 1 };
      newMap.set(productId, { ...current, quantity: isNaN(quantity) || quantity < 1 ? 1 : quantity });
      return newMap;
    });
  };

  const handleAddSelected = () => {
    const itemsToAdd: Array<{ productId: string; quantity: number }> = [];
    selectedProductsMap.forEach((info, productId) => {
      if (info.selected && info.quantity > 0) {
        itemsToAdd.push({ productId, quantity: info.quantity });
      }
    });
    if (itemsToAdd.length > 0) {
      onAddItems(itemsToAdd);
    }
    onOpenChange(false); // Close dialog after adding
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Bulk Add Products to Estimate</DialogTitle>
          <DialogDescription>
            Select a category, then check products and specify quantities to add.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div>
            <Label htmlFor="bulk-category-select">Filter by Category</Label>
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value === 'all' ? undefined : value)}
            >
              <SelectTrigger id="bulk-category-select">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {productCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {productsInView.length > 0 ? (
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <div className="space-y-3">
                {productsInView.map((product) => {
                  const selectionInfo = selectedProductsMap.get(product.id) || { selected: false, quantity: 1 };
                  return (
                    <div key={product.id} className="flex items-center justify-between gap-2 p-2 border-b last:border-b-0">
                      <div className="flex items-center gap-2 flex-grow">
                        <Checkbox
                          id={`bulk-product-${product.id}`}
                          checked={selectionInfo.selected}
                          onCheckedChange={(checked) => handleProductSelectionChange(product.id, !!checked)}
                        />
                        <Label htmlFor={`bulk-product-${product.id}`} className="flex-grow cursor-pointer">
                          {product.name} <span className="text-xs text-muted-foreground">(${product.price.toFixed(2)}/{product.unit})</span>
                        </Label>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={selectionInfo.quantity}
                        onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                        className="w-20 h-8 text-sm"
                        disabled={!selectionInfo.selected}
                      />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              {selectedCategory ? "No products found in this category." : "Select a category to see products."}
            </p>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleAddSelected} disabled={productsInView.length === 0 || !Array.from(selectedProductsMap.values()).some(p => p.selected)}>
            <Icon name="PlusCircle" className="mr-2 h-4 w-4" /> Add Selected Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    