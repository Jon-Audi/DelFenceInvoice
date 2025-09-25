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

const stockEditSchema = z.object({
  id: z.string(),
  name: z.string(),
  quantityInStock: z.coerce.number().min(0, "Stock cannot be negative."),
});

const bulkStockFormSchema = z.object({
  products: z.array(stockEditSchema),
});

type BulkStockFormData = z.infer<typeof bulkStockFormSchema>;

interface BulkStockEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  products: Product[];
  onSave: (updatedProducts: { id: string; quantityInStock: number }[]) => Promise<void>;
}

export function BulkStockEditorDialog({
  isOpen,
  onOpenChange,
  categoryName,
  products,
  onSave,
}: BulkStockEditorDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<BulkStockFormData>({
    resolver: zodResolver(bulkStockFormSchema),
    defaultValues: {
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        quantityInStock: p.quantityInStock || 0,
      })),
    },
  });
  
  useEffect(() => {
    if (isOpen) {
      form.reset({
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          quantityInStock: p.quantityInStock || 0,
        })),
      });
    }
  }, [isOpen, products, form]);

  const { control, watch } = form;

  const { fields } = useFieldArray({
    control,
    name: "products",
  });
  
  const watchedProducts = watch('products');

  const handleSubmit = async (data: BulkStockFormData) => {
    setIsSaving(true);
    await onSave(data.products);
    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Edit Stock for: {categoryName}</DialogTitle>
          <DialogDescription>
            Update the quantity in stock for products in this category.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <ScrollArea className="h-[60vh] mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60%]">Product Name</TableHead>
                    <TableHead className="text-right">New Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{watchedProducts[index]?.name}</TableCell>
                      <TableCell>
                        <FormField
                          control={control}
                          name={`products.${index}.quantityInStock`}
                          render={({ field: stockField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  type="number"
                                  className="text-right"
                                  {...stockField}
                                />
                              </FormControl>
                              <FormMessage />
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
