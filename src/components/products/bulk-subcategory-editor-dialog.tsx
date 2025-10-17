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

const subcategoryEditSchema = z.object({
  id: z.string(),
  name: z.string(),
  subcategory: z.string().optional(),
});

const bulkSubcategoryFormSchema = z.object({
  products: z.array(subcategoryEditSchema),
});

type BulkSubcategoryFormData = z.infer<typeof bulkSubcategoryFormSchema>;

interface BulkSubcategoryEditorDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  products: Product[];
  allSubcategories: string[];
  onAddNewSubcategory: (subcategory: string) => void;
  onSave: (updatedProducts: Pick<Product, 'id' | 'subcategory'>[]) => Promise<void>;
}

export function BulkSubcategoryEditorDialog({
  isOpen,
  onOpenChange,
  categoryName,
  products,
  onSave,
}: BulkSubcategoryEditorDialogProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<BulkSubcategoryFormData>({
    resolver: zodResolver(bulkSubcategoryFormSchema),
  });
  
  useEffect(() => {
    if (isOpen) {
      form.reset({
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          subcategory: p.subcategory || '',
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

  const handleSubmit = async (data: BulkSubcategoryFormData) => {
    setIsSaving(true);
    await onSave(data.products);
    setIsSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Edit Subcategories for: {categoryName}</DialogTitle>
          <DialogDescription>
            Assign or update the subcategory for products in this category.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <ScrollArea className="h-[60vh] mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Product Name</TableHead>
                    <TableHead>Subcategory</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell className="font-medium">{watchedProducts[index]?.name}</TableCell>
                      <TableCell>
                        <FormField
                          control={control}
                          name={`products.${index}.subcategory`}
                          render={({ field: subcategoryField }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  placeholder="Enter subcategory"
                                  {...subcategoryField}
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
