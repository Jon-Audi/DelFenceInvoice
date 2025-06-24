
"use client";

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Product, ProductCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Icon } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';

const productRowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  unit: z.string().min(1, "Unit is required"),
  cost: z.coerce.number().min(0, "Cost must be non-negative"),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  markupPercentage: z.coerce.number().min(0, "Markup must be non-negative"),
  description: z.string().optional(),
});

const bulkAddSchema = z.object({
  products: z.array(productRowSchema).min(1, "At least one product is required."),
});

type BulkAddFormData = z.infer<typeof bulkAddSchema>;

interface BulkAddProductFormProps {
  onSubmit: (data: BulkAddFormData) => void;
  onClose?: () => void;
  productCategories: ProductCategory[];
}

export function BulkAddProductForm({ onSubmit, onClose, productCategories }: BulkAddProductFormProps) {
  const form = useForm<BulkAddFormData>({
    resolver: zodResolver(bulkAddSchema),
    defaultValues: {
      products: [{
        name: '',
        category: productCategories[0] || '',
        unit: '',
        cost: 0,
        price: 0,
        markupPercentage: 0,
        description: '',
      }],
    },
  });

  const { control, handleSubmit, getValues, setValue } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "products",
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <ScrollArea className="max-h-[60vh] p-1">
          <div className="space-y-4 pr-4">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg relative space-y-4">
                {fields.length > 1 && (
                    <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => remove(index)}
                    >
                    <Icon name="Trash2" className="h-4 w-4 text-destructive" />
                    </Button>
                )}
                <FormField
                  control={control}
                  name={`products.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g., 6ft Cedar Picket" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <FormField
                    control={control}
                    name={`products.${index}.category`}
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                            <SelectContent>
                            {productCategories.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={control}
                    name={`products.${index}.unit`}
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g., piece, ft, kit" /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                        control={control}
                        name={`products.${index}.cost`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Cost</FormLabel>
                            <FormControl>
                            <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) => {
                                    const newCost = parseFloat(e.target.value) || 0;
                                    field.onChange(newCost);
                                    const currentPrice = getValues(`products.${index}.price`);
                                    if (newCost > 0 && currentPrice > 0) {
                                        const newMarkup = ((currentPrice / newCost) - 1) * 100;
                                        setValue(`products.${index}.markupPercentage`, parseFloat(newMarkup.toFixed(2)));
                                    }
                                }}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`products.${index}.markupPercentage`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Markup (%)</FormLabel>
                            <FormControl>
                            <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) => {
                                    const newMarkup = parseFloat(e.target.value) || 0;
                                    field.onChange(newMarkup);
                                    const currentCost = getValues(`products.${index}.cost`);
                                    if (currentCost > 0 && newMarkup >= 0) {
                                        const newPrice = currentCost * (1 + newMarkup / 100);
                                        setValue(`products.${index}.price`, parseFloat(newPrice.toFixed(2)));
                                    }
                                }}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name={`products.${index}.price`}
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl>
                            <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) => {
                                    const newPrice = parseFloat(e.target.value) || 0;
                                    field.onChange(newPrice);
                                    const currentCost = getValues(`products.${index}.cost`);
                                    if (currentCost > 0 && newPrice >= 0) {
                                        const newMarkup = ((newPrice / currentCost) - 1) * 100;
                                        setValue(`products.${index}.markupPercentage`, parseFloat(newMarkup.toFixed(2)));
                                    }
                                }}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
                <FormField
                  control={control}
                  name={`products.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl><Textarea placeholder="Optional product description" {...field} rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="flex justify-between items-center pt-4 mt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => append({ name: '', category: productCategories[0] || '', unit: '', cost: 0, price: 0, markupPercentage: 0, description: '' })}
          >
            <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
            Add Another Product
          </Button>
          <div className="flex gap-2">
            {onClose && <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>}
            <Button type="submit">Save All Products</Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
