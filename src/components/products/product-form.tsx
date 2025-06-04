
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  const { watch, setValue, control, handleSubmit: formHandleSubmit, trigger, formState: { errors }, getValues } = form;
  const cost = watch('cost');
  const price = watch('price');
  const markupPercentage = watch('markupPercentage');
  const formCategoryValue = watch('category'); // Watch the form's category value

  const [lastEditedField, setLastEditedField] = React.useState<'price' | 'markup' | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  // inputValue is for the CommandInput, formCategoryValue is the actual form state
  const [inputValue, setInputValue] = useState(formCategoryValue || "");


  useEffect(() => {
    // When editing an existing product, or form is reset, initialize inputValue
    const initialCategory = product?.category || (productCategories.length > 0 ? productCategories[0] : '');
    if (getValues('category') !== initialCategory) { // Check if form value is different from expected initial
        setValue('category', initialCategory, { shouldValidate: true });
    }
    setInputValue(initialCategory);
  }, [product, productCategories, setValue, getValues]);

  useEffect(() => {
    // Sync inputValue with the form's category value if it changes externally (e.g., by reset or initial load)
    if (formCategoryValue !== inputValue) {
      setInputValue(formCategoryValue);
    }
  }, [formCategoryValue]);


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
    } else if (cost === 0 && price >= 0) {
      setValue('markupPercentage', 0, { shouldValidate: true });
    }
  }, [cost, price, setValue, lastEditedField]);

  const processAndSubmit = (data: ProductFormData) => {
    // Use the form's 'category' value, which should be up-to-date.
    const finalCategory = data.category.trim(); 
    
    if (!finalCategory) {
      form.setError("category", { type: "manual", message: "Category cannot be empty." });
      return;
    }
    
    const existingCategory = productCategories.find(pc => pc.toLowerCase() === finalCategory.toLowerCase());
    const categoryToSave = existingCategory || finalCategory;

    if (!existingCategory && !productCategories.some(pc => pc === finalCategory)) { // check exact match too
      onAddNewCategory(finalCategory); 
    }
    const dataToSubmit = { ...data, category: categoryToSave };
    onSubmit(dataToSubmit);
  };
  
  const handleCategorySelect = (selectedCategoryValue: string) => {
    setValue("category", selectedCategoryValue, { shouldValidate: true }); // This is the primary update point
    setInputValue(selectedCategoryValue); // Sync input field
    setComboboxOpen(false);
    trigger("category"); 
  };

  const handleComboboxOpenChange = (open: boolean) => {
    if (!open) {
      // When popover closes, if inputValue is different from form value and valid, update form value.
      const currentFormCategory = getValues("category");
      const trimmedInputValue = inputValue.trim();
      if (trimmedInputValue && trimmedInputValue !== currentFormCategory) {
        // Check if it's an existing category (case-insensitive) or a new one
        const existingCat = productCategories.find(pc => pc.toLowerCase() === trimmedInputValue.toLowerCase());
        if (existingCat) {
          setValue("category", existingCat, { shouldValidate: true });
          setInputValue(existingCat); // Standardize casing
        } else {
          setValue("category", trimmedInputValue, { shouldValidate: true });
          // onAddNewCategory will be called during submission if it's truly new
        }
      } else if (!trimmedInputValue && currentFormCategory) {
        // If input is cleared, revert to last valid form category or set error if required
        // This depends on desired behavior. For now, assume category is required so user must select/type.
        setInputValue(currentFormCategory); // Revert input to what's in the form
      } else if (trimmedInputValue && trimmedInputValue === currentFormCategory) {
        // No change needed, just close
      }
       trigger("category");
    }
    setComboboxOpen(open);
  };


  return (
    <Form {...form}>
      <form onSubmit={formHandleSubmit(processAndSubmit)} className="space-y-6">
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
              <Popover open={comboboxOpen} onOpenChange={handleComboboxOpenChange}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={comboboxOpen}
                      className={cn("w-full justify-between", !field.value && "text-muted-foreground", errors.category && "border-destructive")}
                    >
                      {field.value || "Select or type category..."}
                      <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search or add category..."
                      value={inputValue} // Use local inputValue for typing
                      onValueChange={(search) => {
                        setInputValue(search); // Update local input value as user types
                      }}
                    />
                     <CommandList>
                      <CommandEmpty
                        onMouseDown={(e) => { 
                          e.preventDefault(); 
                          const newCat = inputValue.trim();
                          if (newCat) {
                            handleCategorySelect(newCat); 
                          } else {
                            setComboboxOpen(false); 
                          }
                        }}
                        className="cursor-pointer p-2 text-sm hover:bg-accent"
                      >
                        {inputValue.trim() ? `Add "${inputValue.trim()}"` : "Type to search or add"}
                      </CommandEmpty>
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
                <FormControl><Input type="number" step="0.01" {...field} 
                  onChange={(e) => { 
                    field.onChange(parseFloat(e.target.value) || 0); 
                    setLastEditedField(null); 
                  }} 
                  onBlur={()=> trigger(["price", "markupPercentage"])} 
                /></FormControl>
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
                      field.onChange(parseFloat(e.target.value) || 0);
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
                      field.onChange(parseFloat(e.target.value) || 0);
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
              <FormLabel>Description (Optional)</FormLabel>
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

