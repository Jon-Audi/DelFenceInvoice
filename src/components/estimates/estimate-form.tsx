
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Estimate, Product, DocumentStatus, Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Icon } from '@/components/icons';
import { Separator } from '@/components/ui/separator';

const ESTIMATE_STATUSES: Extract<DocumentStatus, 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Voided'>[] = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Voided'];
const ALL_CATEGORIES_VALUE = "_ALL_CATEGORIES_";

const lineItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "Product selection is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  cost: z.number().default(0), // Will be set from product
  unitPrice: z.number().default(0), // Effective unit price, will be calculated
  appliedMarkupPercentage: z.coerce.number().min(0, "Markup must be non-negative").optional(),
});

const estimateFormSchema = z.object({
  estimateNumber: z.string().min(1, "Estimate number is required"),
  customerId: z.string().min(1, "Customer is required"),
  customerName: z.string().optional(),
  date: z.date({ required_error: "Estimate date is required." }),
  validUntil: z.date().optional(),
  status: z.enum(ESTIMATE_STATUSES as [typeof ESTIMATE_STATUSES[0], ...typeof ESTIMATE_STATUSES]),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
  notes: z.string().optional(),
});

export type EstimateFormData = z.infer<typeof estimateFormSchema>;

interface EstimateFormProps {
  estimate?: Estimate;
  onSubmit: (data: EstimateFormData) => void;
  onClose?: () => void;
  products: Product[];
  customers: Customer[];
  productCategories: string[];
}

export function EstimateForm({ estimate, onSubmit, onClose, products, customers, productCategories }: EstimateFormProps) {
  const defaultFormValues = useMemo((): EstimateFormData => {
    return estimate ? {
      ...estimate,
      date: new Date(estimate.date),
      validUntil: estimate.validUntil ? new Date(estimate.validUntil) : undefined,
      customerId: estimate.customerId || '',
      customerName: estimate.customerName || '',
      lineItems: estimate.lineItems.map(li => ({
        id: li.id,
        productId: li.productId,
        quantity: li.quantity,
        cost: li.cost,
        unitPrice: li.unitPrice,
        appliedMarkupPercentage: li.appliedMarkupPercentage,
      })),
      notes: estimate.notes || '',
    } : {
      estimateNumber: `EST-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100).padStart(3, '0')}`,
      customerId: '',
      customerName: '',
      date: new Date(),
      status: 'Draft',
      lineItems: [{ productId: '', quantity: 1, cost: 0, unitPrice: 0, appliedMarkupPercentage: 0 }],
      notes: '',
    };
  }, [estimate]);

  const form = useForm<EstimateFormData>({
    resolver: zodResolver(estimateFormSchema),
    defaultValues: defaultFormValues,
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const watchedLineItems = form.watch('lineItems');
  const [lineItemCategoryFilters, setLineItemCategoryFilters] = useState<(string | undefined)[]>([]);

  useEffect(() => {
    form.reset(defaultFormValues);
    const initialCategories = defaultFormValues.lineItems.map(item => {
      if (item.productId) {
        const product = products.find(p => p.id === item.productId);
        return product?.category;
      }
      return undefined;
    });
    setLineItemCategoryFilters(initialCategories);
  }, [defaultFormValues, products, form.reset]);


  useEffect(() => {
    if (watchedLineItems.length !== lineItemCategoryFilters.length) {
        const updatedFilters = watchedLineItems.map((item, index) => {
            if (lineItemCategoryFilters[index] !== undefined) return lineItemCategoryFilters[index];
            if (item.productId) {
                const product = products.find(p => p.id === item.productId);
                return product?.category;
            }
            return undefined;
        });
        setLineItemCategoryFilters(updatedFilters);
    }
  }, [watchedLineItems, products, lineItemCategoryFilters]);

  // Effect to recalculate unitPrice when cost or appliedMarkupPercentage changes for a line item
  useEffect(() => {
    watchedLineItems.forEach((item, index) => {
      const currentCost = item.cost;
      const currentMarkup = item.appliedMarkupPercentage;
      if (typeof currentCost === 'number' && typeof currentMarkup === 'number') {
        const newUnitPrice = parseFloat((currentCost * (1 + currentMarkup / 100)).toFixed(2));
        if (item.unitPrice !== newUnitPrice) {
          form.setValue(`lineItems.${index}.unitPrice`, newUnitPrice, { shouldValidate: true });
        }
      }
    });
  }, [watchedLineItems, form]);


  const handleCategoryFilterChange = (index: number, valueFromSelect: string | undefined) => {
    const newCategoryFilter = valueFromSelect === ALL_CATEGORIES_VALUE ? undefined : valueFromSelect;
    setLineItemCategoryFilters(prevFilters => {
      const newFilters = [...prevFilters];
      newFilters[index] = newCategoryFilter;
      return newFilters;
    });
    form.setValue(`lineItems.${index}.productId`, '', { shouldValidate: true });
    form.trigger(`lineItems.${index}.productId`);
  };

  const addLineItem = () => {
    append({ productId: '', quantity: 1, cost: 0, unitPrice: 0, appliedMarkupPercentage: 0 });
    setLineItemCategoryFilters(prev => [...prev, undefined]);
  };

  const removeLineItem = (index: number) => {
    remove(index);
    setLineItemCategoryFilters(prev => prev.filter((_, i) => i !== index));
  };

  const getFilteredProducts = (index: number) => {
    const selectedCategory = lineItemCategoryFilters[index];
    if (selectedCategory) {
      return products.filter(p => p.category === selectedCategory);
    }
    return products;
  };

  const currentSubtotal = useMemo(() => {
    return watchedLineItems.reduce((acc, item) => {
      const price = item.unitPrice || 0; // Use the potentially adjusted unitPrice
      return acc + (price * (item.quantity || 0));
    }, 0);
  }, [watchedLineItems]);

  const currentTotal = currentSubtotal; // Assuming no tax for now

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <FormField control={form.control} name="estimateNumber" render={({ field }) => (
          <FormItem><FormLabel>Estimate Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Customer</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                      {field.value
                        ? customers.find(c => c.id === field.value)?.companyName || `${customers.find(c => c.id === field.value)?.firstName} ${customers.find(c => c.id === field.value)?.lastName}`
                        : "Select customer"}
                      <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search customer..." />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        {customers.map((customer) => (
                          <CommandItem
                            value={customer.id}
                            key={customer.id}
                            onSelect={() => {
                              form.setValue("customerId", customer.id, { shouldValidate: true });
                              const displayName = customer.companyName || `${customer.firstName} ${customer.lastName}`;
                              form.setValue("customerName", displayName);
                            }}
                          >
                            <Icon name="Check" className={cn("mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")}/>
                            {customer.companyName ? `${customer.companyName} (${customer.firstName} ${customer.lastName})` : `${customer.firstName} ${customer.lastName}`}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Estimate Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="validUntil" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Valid Until (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
              <SelectContent>{ESTIMATE_STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <Separator />
        <h3 className="text-lg font-medium">Line Items</h3>
        {fields.map((fieldItem, index) => {
          const selectedProductDetails = products.find(p => p.id === watchedLineItems[index]?.productId);
          const lineCost = watchedLineItems[index]?.cost || 0;
          const lineUnitPrice = watchedLineItems[index]?.unitPrice || 0;
          const lineAppliedMarkup = watchedLineItems[index]?.appliedMarkupPercentage;
          const quantity = watchedLineItems[index]?.quantity || 0;
          const lineTotal = lineUnitPrice * quantity;
          const filteredProductsForLine = getFilteredProducts(index);

          return (
            <div key={fieldItem.id} className="space-y-3 p-4 border rounded-md relative">
              <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeLineItem(index)}>
                <Icon name="Trash2" className="h-4 w-4 text-destructive" />
              </Button>

              <FormItem>
                <FormLabel>Category Filter</FormLabel>
                <Select
                  value={lineItemCategoryFilters[index] || ALL_CATEGORIES_VALUE}
                  onValueChange={(value) => handleCategoryFilterChange(index, value)}
                >
                  <FormControl><SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value={ALL_CATEGORIES_VALUE}>All Categories</SelectItem>
                    {productCategories.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>

              <FormField
                control={form.control}
                name={`lineItems.${index}.productId`}
                render={({ field: controllerField }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Product</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" role="combobox" className={cn("w-full justify-between", !controllerField.value && "text-muted-foreground")}>
                            {controllerField.value ? products.find(p => p.id === controllerField.value)?.name : "Select product"}
                            <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search product..." />
                          <CommandList>
                            <CommandEmpty>No product found.</CommandEmpty>
                            <CommandGroup>
                              {filteredProductsForLine.map((product) => (
                                <CommandItem
                                  value={product.id}
                                  key={product.id}
                                  onSelect={() => {
                                    controllerField.onChange(product.id);
                                    form.setValue(`lineItems.${index}.cost`, product.cost);
                                    form.setValue(`lineItems.${index}.appliedMarkupPercentage`, product.markupPercentage);
                                    // Unit price will be set by the useEffect watching cost and markup
                                    form.trigger(`lineItems.${index}.productId`);
                                    const selectedProd = products.find(p => p.id === product.id);
                                    if (selectedProd) {
                                      setLineItemCategoryFilters(prevFilters => {
                                        const newFilters = [...prevFilters];
                                        newFilters[index] = selectedProd.category;
                                        return newFilters;
                                      });
                                    }
                                  }}
                                >
                                  <Icon name="Check" className={cn("mr-2 h-4 w-4", product.id === controllerField.value ? "opacity-100" : "opacity-0")}/>
                                  {product.name} ({product.unit}) - Cost: ${product.cost.toFixed(2)}, Price: ${product.price.toFixed(2)}
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <FormItem>
                  <FormLabel>Cost</FormLabel>
                  <Input type="text" readOnly value={lineCost > 0 ? `$${lineCost.toFixed(2)}` : '-'} className="bg-muted" />
                </FormItem>
                
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.appliedMarkupPercentage`}
                  render={({ field: markupField }) => (
                    <FormItem>
                      <FormLabel>Markup (%)</FormLabel>
                      <FormControl>
                         <Input
                          type="number"
                          step="0.01"
                          {...markupField}
                          value={markupField.value === undefined || markupField.value === null || isNaN(Number(markupField.value)) ? '' : String(markupField.value)}
                          onChange={(e) => {
                            const val = e.target.value;
                            const num = parseFloat(val);
                            markupField.onChange(isNaN(num) ? undefined : num);
                          }}
                          min="0"
                          disabled={!watchedLineItems[index]?.productId} // Disable if no product selected
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>Unit Price</FormLabel>
                  <Input type="text" readOnly value={lineUnitPrice > 0 ? `$${lineUnitPrice.toFixed(2)}` : '-'} className="bg-muted" />
                </FormItem>

                <FormField
                  control={form.control}
                  name={`lineItems.${index}.quantity`}
                  render={({ field: qtyField }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          ref={qtyField.ref}
                          name={qtyField.name}
                          onBlur={qtyField.onBlur}
                          value={qtyField.value === undefined || qtyField.value === null || isNaN(Number(qtyField.value)) ? '' : String(qtyField.value)}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              qtyField.onChange(undefined); 
                            } else {
                              const num = parseInt(val, 10);
                              qtyField.onChange(isNaN(num) ? undefined : num); 
                            }
                          }}
                          min="1"
                          disabled={!watchedLineItems[index]?.productId} // Disable if no product selected
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <FormItem className="mt-2">
                  <FormLabel>Line Total</FormLabel>
                  <Input type="text" readOnly value={lineTotal > 0 ? `$${lineTotal.toFixed(2)}` : '-'} className="bg-muted font-semibold" />
                </FormItem>
            </div>
          );
        })}
        <Button type="button" variant="outline" onClick={addLineItem}>
          <Icon name="PlusCircle" className="mr-2 h-4 w-4" /> Add Line Item
        </Button>
        {form.formState.errors.lineItems && !form.formState.errors.lineItems.root && !fields.length && (
             <p className="text-sm font-medium text-destructive">{form.formState.errors.lineItems.message}</p>
        )}

        <Separator />
        <div className="flex justify-end space-x-4 text-lg font-semibold">
          <span>Subtotal:</span>
          <span>${currentSubtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-end space-x-4 text-xl font-bold">
          <span>Total:</span>
          <span>${currentTotal.toFixed(2)}</span>
        </div>

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Additional notes for the estimate..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-4">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit">{estimate ? 'Save Changes' : 'Create Estimate'}</Button>
        </div>
      </form>
    </Form>
  );
}
