
"use client";

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Icon } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
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
  productCategories: string[];
  onAddNewCategory: (category: string) => void;
}

export function ProductForm({ product, onSubmit, onClose, productCategories, onAddNewCategory }: ProductFormProps) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? {
      ...product,
      cost: product.cost || 0,
      price: product.price || 0,
      markupPercentage: product.markupPercentage || 0,
    } : {
      name: '',
      category: productCategories.length > 0 ? productCategories[0] : '',
      unit: '',
      cost: 0,
      price: 0,
      markupPercentage: 0,
      description: '',
    },
  });

  const { watch, setValue, control, handleSubmit: formHandleSubmit } = form;
  const cost = watch('cost');
  const price = watch('price');
  const markupPercentage = watch('markupPercentage');
  const currentCategoryValue = watch('category');

  const [lastEditedField, setLastEditedField] = React.useState<'price' | 'markup' | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [inputValue, setInputValue] = useState(currentCategoryValue || "");


  useEffect(() => {
    if (product?.category) {
      setInputValue(product.category);
    } else if (productCategories.length > 0 && !product) {
       setValue('category', productCategories[0]);
       setInputValue(productCategories[0]);
    }
  }, [product, productCategories, setValue]);
  
  useEffect(() => {
    setInputValue(currentCategoryValue);
  }, [currentCategoryValue]);


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

  const processSubmit = (data: ProductFormData) => {
    // If user typed a new category directly in combobox input that wasn't formally selected
    // ensure it's added.
    const finalCategory = data.category.trim();
    if (finalCategory && !productCategories.find(pc => pc.toLowerCase() === finalCategory.toLowerCase())) {
      onAddNewCategory(finalCategory);
    }
    onSubmit(data);
  };
  
  const handleCategorySelect = (selectedCategory: string) => {
    setValue("category", selectedCategory, { shouldValidate: true });
    setInputValue(selectedCategory);
    setComboboxOpen(false);
    // Check if this newly selected/typed category is actually new
    if (!productCategories.find(pc => pc.toLowerCase() === selectedCategory.toLowerCase())) {
      onAddNewCategory(selectedCategory); // Add it to the main list
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={formHandleSubmit(processSubmit)} className="space-y-6">
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
            <FormItem className="flex flex-col">
              <FormLabel>Category</FormLabel>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                    >
                      {field.value
                        ? productCategories.find(cat => cat.toLowerCase() === field.value.toLowerCase()) || field.value
                        : "Select or type category..."}
                      <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command shouldFilter={false}> {/* Custom filtering below */}
                    <CommandInput 
                      placeholder="Search or add category..."
                      value={inputValue}
                      onValueChange={(search) => {
                        setInputValue(search);
                        // If typing directly, update form value as well
                        // This allows submitting typed value even if not in list yet
                        setValue("category", search, {shouldValidate: true});
                      }}
                    />
                    <CommandEmpty
                      onMouseDown={(e) => { // Use onMouseDown to prevent Popover from closing due to blur
                        e.preventDefault();
                        const newCat = inputValue.trim();
                        if (newCat) {
                         handleCategorySelect(newCat);
                        }
                      }}
                      className="cursor-pointer p-2 text-sm"
                    >
                      Add "{inputValue}"
                    </CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {productCategories
                          .filter(cat => cat.toLowerCase().includes(inputValue.toLowerCase()))
                          .map((cat) => (
                          <CommandItem
                            value={cat}
                            key={cat}
                            onSelect={() => {
                              handleCategorySelect(cat);
                            }}
                          >
                            <Icon
                              name="Check"
                              className={cn(
                                "mr-2 h-4 w-4",
                                cat.toLowerCase() === field.value?.toLowerCase() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {cat}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
