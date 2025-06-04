
"use client";

import type { Product } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { ProductDialog } from './product-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProductTableProps {
  groupedProducts: Map<string, Product[]>;
  onSave: (product: Product) => void;
  onDelete: (productId: string) => void;
  productCategories: string[];
  onAddNewCategory: (category: string) => void;
  isLoading: boolean;
  onApplyCategoryMarkup: (categoryName: string, markup: number) => void;
}

export function ProductTable({ 
  groupedProducts, 
  onSave, 
  onDelete, 
  productCategories, 
  onAddNewCategory,
  isLoading,
  onApplyCategoryMarkup
}: ProductTableProps) {
  const [productToDelete, setProductToDelete] = React.useState<Product | null>(null);
  const [selectedCategoryForMarkup, setSelectedCategoryForMarkup] = React.useState<string | null>(null);
  const [isMarkupDialogOpen, setIsMarkupDialogOpen] = React.useState(false);
  const [newMarkupValue, setNewMarkupValue] = React.useState<string>("");

  const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number' || isNaN(amount)) return 'N/A';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleOpenMarkupDialog = (category: string) => {
    setSelectedCategoryForMarkup(category);
    setNewMarkupValue(""); 
    setIsMarkupDialogOpen(true);
  };

  const handleApplyMarkup = () => {
    if (selectedCategoryForMarkup && newMarkupValue !== "") {
      const markupNum = parseFloat(newMarkupValue);
      if (!isNaN(markupNum) && markupNum >= 0) {
        onApplyCategoryMarkup(selectedCategoryForMarkup, markupNum);
        setIsMarkupDialogOpen(false);
        setSelectedCategoryForMarkup(null);
      } else {
        // This could be a toast in a real app
        alert("Please enter a valid non-negative markup percentage.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-lg border shadow-sm p-4">
            <Skeleton className="h-8 w-1/3 mb-4" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (groupedProducts.size === 0 && !isLoading) {
    return (
      <div className="rounded-lg border shadow-sm p-6 text-center">
        <p className="text-muted-foreground">No products found.</p>
        <p className="text-sm text-muted-foreground mt-2">
          Try adding a new product or importing from a CSV file.
        </p>
      </div>
    );
  }

  const defaultOpenValues = Array.from(groupedProducts.entries())
    .filter(([_, products]) => products.length > 0)
    .map(([category]) => category);

  return (
    <>
      <Accordion type="multiple" defaultValue={defaultOpenValues} className="w-full space-y-2">
        {Array.from(groupedProducts.entries()).map(([category, productsInCategory]) => (
          <AccordionItem value={category} key={category} className="border rounded-lg shadow-sm overflow-hidden bg-card">
            <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 data-[state=open]:border-b text-left hover:no-underline">
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-lg text-card-foreground">{category}</span>
                <div className="flex items-center">
                  <Badge variant="secondary" className="ml-2 mr-2">
                    {productsInCategory.length} product{productsInCategory.length === 1 ? '' : 's'}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 data-[state=open]:bg-accent/70">
                        <Icon name="MoreHorizontal" className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => handleOpenMarkupDialog(category)}>
                        <Icon name="TrendingUp" className="mr-2 h-4 w-4" />
                        Apply Markup to Category
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              {productsInCategory.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-card-foreground/80">Name</TableHead>
                        <TableHead className="text-card-foreground/80">Unit</TableHead>
                        <TableHead className="text-right text-card-foreground/80">Cost</TableHead>
                        <TableHead className="text-right text-card-foreground/80">Price</TableHead>
                        <TableHead className="text-right text-card-foreground/80">Markup</TableHead>
                        <TableHead className="w-[80px] text-center text-card-foreground/80">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productsInCategory.map((product) => (
                        <TableRow key={product.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium text-card-foreground">{product.name}</TableCell>
                          <TableCell className="text-card-foreground/90">{product.unit}</TableCell>
                          <TableCell className="text-right text-card-foreground/90">{formatCurrency(product.cost)}</TableCell>
                          <TableCell className="text-right text-card-foreground/90">{formatCurrency(product.price)}</TableCell>
                          <TableCell className="text-right text-card-foreground/90">
                            {typeof product.markupPercentage === 'number' && !isNaN(product.markupPercentage)
                              ? `${product.markupPercentage.toFixed(2)}%`
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-accent/50">
                                  <Icon name="MoreHorizontal" className="h-4 w-4 text-card-foreground/70" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <ProductDialog
                                  product={product}
                                  triggerButton={
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                      <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                  }
                                  onSave={onSave}
                                  productCategories={productCategories}
                                  onAddNewCategory={onAddNewCategory}
                                />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    setProductToDelete(product);
                                  }}
                                >
                                  <Icon name="Trash2" className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="p-6 text-muted-foreground text-sm">No products in this category.</p>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {productToDelete && (
        <AlertDialog open={!!productToDelete} onOpenChange={(isOpen) => !isOpen && setProductToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the product "{productToDelete?.name}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (productToDelete) {
                    onDelete(productToDelete.id);
                  }
                  setProductToDelete(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isMarkupDialogOpen && selectedCategoryForMarkup && (
        <Dialog open={isMarkupDialogOpen} onOpenChange={(open) => {
          setIsMarkupDialogOpen(open);
          if (!open) setSelectedCategoryForMarkup(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Apply Markup to Category: {selectedCategoryForMarkup}</DialogTitle>
              <DialogDescription>
                Enter the new markup percentage to apply to all products in this category.
                This will recalculate their selling price based on their cost and update their individual markup percentage.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="markupPercentageDialog" className="text-right col-span-1">Markup (%)</Label>
                <Input
                  id="markupPercentageDialog"
                  type="number"
                  value={newMarkupValue}
                  onChange={(e) => setNewMarkupValue(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., 50"
                  min="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsMarkupDialogOpen(false);
                setSelectedCategoryForMarkup(null);
              }}>Cancel</Button>
              <Button onClick={handleApplyMarkup}>Apply Markup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
