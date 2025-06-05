
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
import { CustomerDialog } from '@/components/customers/customer-dialog'; // Import CustomerDialog

const ESTIMATE_STATUSES: Extract<DocumentStatus, 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Voided'>[] = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Voided'];
const ALL_CATEGORIES_VALUE = "_ALL_CATEGORIES_";

const lineItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "Product selection is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  unitPrice: z.number().optional(), // Not directly edited, but useful for schema context
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

interface FormLineItemUIData extends z.infer<typeof lineItemSchema> {
  unitPriceForDisplay?: number; 
}

interface EstimateFormProps {
  estimate?: Estimate;
  onSubmit: (data: EstimateFormData) => void;
  onClose?: () => void;
  products: Product[];
  customers: Customer[];
  productCategories: string[];
  onSaveCustomer: (customerToSave: Customer) => Promise<string | void>; // Prop for saving a new customer
}

export function EstimateForm({ estimate, onSubmit, onClose, products, customers: initialCustomers, productCategories, onSaveCustomer }: EstimateFormProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);

  useEffect(() => {
    setCustomers(initialCustomers);
  }, [initialCustomers]);
  
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
        unitPrice: li.unitPrice,
      })),
      notes: estimate.notes || '',
    } : {
      estimateNumber: `EST-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100).padStart(3, '0')}`,
      customerId: '',
      customerName: '',
      date: new Date(),
      status: 'Draft',
      lineItems: [{ productId: '', quantity: 1, unitPrice: 0 }],
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
    const initialCategories = watchedLineItems.map(item => {
      if (item.productId) {
        const product = products.find(p => p.id === item.productId);
        return product?.category;
      }
      return undefined;
    });
    if (JSON.stringify(initialCategories) !== JSON.stringify(lineItemCategoryFilters)) {
      setLineItemCategoryFilters(initialCategories);
    }
  }, [watchedLineItems, products, lineItemCategoryFilters]);

  useEffect(() => {
    form.reset(defaultFormValues);
  }, [defaultFormValues, form]);

  const handleSaveNewCustomerFromEstimateForm = async (newCustomerData: Customer) => {
    const newCustomerId = await onSaveCustomer(newCustomerData);
    if (newCustomerId && typeof newCustomerId === 'string') {
      // The `customers` list in `EstimatesPage` will update via onSnapshot.
      // We might need to manually add to the local `customers` state here for immediate reflection
      // or rely on the parent re-rendering with the updated list.
      // For now, let's assume the parent's onSnapshot handles updating the `customers` prop.
      // We also need to update the local `customers` state if it's not directly tied to the prop for the combobox.
      const customerToSelect = { ...newCustomerData, id: newCustomerId };
      setCustomers(prev => [...prev, customerToSelect].sort((a,b) => (a.companyName || `${a.firstName} ${a.lastName}`).localeCompare(b.companyName || `${b.firstName} ${b.lastName}`)));
      
      form.setValue("customerId", newCustomerId, { shouldValidate: true });
      const displayName = newCustomerData.companyName || `${newCustomerData.firstName} ${newCustomerData.lastName}`;
      form.setValue("customerName", displayName);
      setIsNewCustomerDialogOpen(false);
    }
  };


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
    append({ productId: '', quantity: 1, unitPrice: 0 });
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
      const product = products.find(p => p.id === item.productId);
      const price = product ? product.price : 0;
      return acc + (price * (item.quantity || 0));
    }, 0);
  }, [watchedLineItems, products]);

  const currentTotal = currentSubtotal; 

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
              <div className="flex items-center gap-2">
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
                <Button type="button" variant="outline" size="icon" onClick={() => setIsNewCustomerDialogOpen(true)} title="Add New Customer">
                  <Icon name="PlusCircle" className="h-4 w-4" />
                </Button>
              </div>
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
          const currentLineItem = watchedLineItems[index];
          const selectedProductDetails = currentLineItem ? products.find(p => p.id === currentLineItem.productId) : undefined;
          const unitPriceForDisplay = selectedProductDetails ? selectedProductDetails.price : 0;
          const quantity = currentLineItem?.quantity || 0;
          const lineTotal = unitPriceForDisplay * quantity;
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
                                    const selectedProd = products.find(p => p.id === product.id);
                                    if (selectedProd) {
                                      setLineItemCategoryFilters(prevFilters => {
                                        const newFilters = [...prevFilters];
                                        newFilters[index] = selectedProd.category;
                                        return newFilters;
                                      });
                                      form.setValue(`lineItems.${index}.unitPrice`, selectedProd.price);
                                    }
                                    form.trigger(`lineItems.${index}.productId`); 
                                  }}
                                >
                                  <Icon name="Check" className={cn("mr-2 h-4 w-4", product.id === controllerField.value ? "opacity-100" : "opacity-0")}/>
                                  {product.name} ({product.unit}) - Price: ${product.price.toFixed(2)}
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
              <div className="grid grid-cols-3 gap-4 items-end">
                <FormItem>
                  <FormLabel>Unit Price</FormLabel>
                  <Input type="text" readOnly value={unitPriceForDisplay > 0 ? `$${unitPriceForDisplay.toFixed(2)}` : '-'} className="bg-muted" />
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
                          disabled={!watchedLineItems[index]?.productId} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormItem>
                  <FormLabel>Line Total</FormLabel>
                  <Input type="text" readOnly value={lineTotal > 0 ? `$${lineTotal.toFixed(2)}` : '-'} className="bg-muted font-semibold" />
                </FormItem>
              </div>
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

      {isNewCustomerDialogOpen && (
        <CustomerDialog
          triggerButton={<></>} // Dialog is controlled externally, trigger is not used here
          onSave={handleSaveNewCustomerFromEstimateForm}
        />
      )}
    </Form>
  );
}
