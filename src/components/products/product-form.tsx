"use client";

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Product, ProductCategory } from '@/types';
import { PRODUCT_CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  category: z.enum(PRODUCT_CATEGORIES as [ProductCategory, ...ProductCategory[]], {
    errorMap: () => ({ message: "Please select a valid category." })
  }),
  unit: z.string().min(1, "Unit is required"),
  cost: z.coerce.number().min(0, "Cost must be non-negative"),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  markupPercentage: z.coerce.number().min(0, "Markup must be non-negative"),
  description: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: ProductFormData) => void;
  onClose?: () => void;
}

export function ProductForm({ product, onSubmit, onClose }: ProductFormProps) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      ...product,
      cost: product.cost || 0,
      price: product.price || 0,
      markupPercentage: product.markupPercentage || 0,
    } : {
      name: '',
      category: PRODUCT_CATEGORIES[0],
      unit: '',
      cost: 0,
      price: 0,
      markupPercentage: 0,
      description: '',
    },
  });

  const { watch, setValue, control } = form;
  const cost = watch('cost');
  const price = watch('price');
  const markupPercentage = watch('markupPercentage');

  // State to track which field was last manually edited for price calculation
  const [lastEditedField, setLastEditedField] = React.useState<'price' | 'markup' | null>(null);

  useEffect(() => {
    if (lastEditedField === 'markup' && cost > 0 && markupPercentage >= 0) {
      const calculatedPrice = cost * (1 + markupPercentage / 100);
      setValue('price', parseFloat(calculatedPrice.toFixed(2)), { shouldValidate: true });
    }
  }, [cost, markupPercentage, setValue, lastEditedField]);

  useEffect(() => {
    if (lastEditedField === 'price' && cost > 0 && price >= 0) {
      const calculatedMarkup = cost > 0 ? ((price / cost) - 1) * 100 : 0;
      setValue('markupPercentage', parseFloat(calculatedMarkup.toFixed(2)), { shouldValidate: true });
    }
  }, [cost, price, setValue, lastEditedField]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Product Name</FormLabel>
              <FormControl><Input placeholder="e.g., 6ft Cedar Picket" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit</FormLabel>
              <FormControl><Input placeholder="e.g., piece, ft, kit" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cost</FormLabel>
                <FormControl><Input type="number" step="0.01" {...field} onChange={(e) => { field.onChange(e); setLastEditedField(null); }} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="markupPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Markup (%)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setLastEditedField('markup');
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Selling Price</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setLastEditedField('price');
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl><Textarea placeholder="Optional product description" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end gap-2">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit">{product ? 'Save Changes' : 'Create Product'}</Button>
        </div>
      </form>
    </Form>
  );
}
