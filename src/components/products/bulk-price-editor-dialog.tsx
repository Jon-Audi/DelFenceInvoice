
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Icon } from '@/components/icons';

const priceEditSchema = z.object({
  id: z.string(),
  name: z.string(),
  cost: z.coerce.number().min(0, "Cost must be non-negative"),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  markupPercentage: z.coerce.number().min(0, "Markup must be non-negative"),
});

const bulkPriceFormSchema = z.object({
  products: z.array(priceEditSchema),
});

type BulkPriceFormData = z.infer<typeof bulkPriceFormSchema>;

interface BulkPriceEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  products: Product[];
  onSave: (updatedProducts: Product[]) => Promise<void>;
}

export function BulkPriceEditorDialog({
  isOpen,
  onOpenChange,
  categoryName,
  products,
  onSave,
}: BulkPriceEditorDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<BulkPriceFormData>({
    resolver: zodResolver(bulkPriceFormSchema),
    defaultValues: {
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        cost: p.cost,
        price: p.price,
        markupPercentage: p.markupPercentage,
      })),
    },
  });
  
  useEffect(() => {
    form.reset({
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        cost: p.cost,
        price: p.price,
        markupPercentage: p.markupPercentage,
      })),
    })
  }, [products, form.reset, form]);

  const { control, getValues, setValue, watch } = form;

  const { fields } = useFieldArray({
    control,
    name: "products",
  });
  
  const watchedProducts = watch('products');

  const handlePriceChange = (index: number, newPrice: number) => {
    const cost = getValues(`products.${index}.cost`);
    setValue(`products.${index}.price`, newPrice, { shouldValidate: true });
    if (cost > 0) {
      const markup = ((newPrice / cost) - 1) * 100;
      setValue(`products.${index}.markupPercentage`, parseFloat(markup.toFixed(2)), { shouldValidate: true });
    }
  };

  const handleMarkupChange = (index: number, newMarkup: number) => {
    const cost = getValues(`products.${index}.cost`);
    setValue(`products.${index}.markupPercentage`, newMarkup, { shouldValidate: true });
    if (cost > 0) {
      const price = cost * (1 + newMarkup / 100);
      setValue(`products.${index}.price`, parseFloat(price.toFixed(2)), { shouldValidate: true });
    }
  };
  
  const handleCostChange = (index: number, newCost: number) => {
    const markup = getValues(`products.${index}.markupPercentage`);
    setValue(`products.${index}.cost`, newCost, { shouldValidate: true });
    if (markup >= 0) {
      const price = newCost * (1 + markup / 100);
      setValue(`products.${index}.price`, parseFloat(price.toFixed(2)), { shouldValidate: true });
    }
  };


  const handleSubmit = async (data: BulkPriceFormData) => {
    setIsSaving(true);
    // Find original products to merge other data
    const updatedProducts = data.products.map(formProduct => {
        const originalProduct = products.find(p => p.id === formProduct.id);
        return {
            ...originalProduct,
            ...formProduct,
        } as Product;
    });
    
    await onSave(updatedProducts);
    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk Edit Prices for: {categoryName}</DialogTitle>
          <DialogDescription>
            Adjust cost, price, or markup for products in this category. All changes will be saved at once.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <ScrollArea className="h-[60vh] mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Product Name</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Markup (%)</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{watchedProducts[index]?.name}</TableCell>
                      <TableCell>
                        <FormField
                          control={control}
                          name={`products.${index}.cost`}
                          render={({ field: costField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number" step="0.01"
                                  className="text-right"
                                  {...costField}
                                  onChange={e => handleCostChange(index, parseFloat(e.target.value) || 0)}
                                />
                              </FormControl><FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                         <FormField
                          control={control}
                          name={`products.${index}.markupPercentage`}
                          render={({ field: markupField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number" step="0.01"
                                  className="text-right"
                                  {...markupField}
                                  onChange={e => handleMarkupChange(index, parseFloat(e.target.value) || 0)}
                                />
                              </FormControl><FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                         <FormField
                          control={control}
                          name={`products.${index}.price`}
                          render={({ field: priceField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number" step="0.01"
                                  className="text-right"
                                  {...priceField}
                                  onChange={e => handlePriceChange(index, parseFloat(e.target.value) || 0)}
                                />
                              </FormControl><FormMessage />
                            </FormItem>
                          )}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            <DialogFooter className="mt-4">
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
                Save All Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

