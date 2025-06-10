
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Order, DocumentStatus, Customer, Product } from '@/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Icon } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { ALL_CATEGORIES_MARKUP_KEY } from '@/lib/constants';

const ORDER_STATUSES: Extract<DocumentStatus, 'Draft' | 'Ordered' | 'Ready for pick up' | 'Picked up' | 'Invoiced' | 'Voided'>[] = ['Draft', 'Ordered', 'Ready for pick up', 'Picked up', 'Invoiced', 'Voided'];
const ORDER_STATES: Order['orderState'][] = ['Open', 'Closed'];
const ALL_CATEGORIES_VALUE = "_ALL_CATEGORIES_";

const lineItemSchema = z.object({
  id: z.string().optional(),
  isNonStock: z.boolean().optional().default(false),
  productId: z.string().optional(),
  productName: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative"),
  isReturn: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.isNonStock) {
    if (!data.productName || data.productName.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Product name is required for non-stock items.",
        path: ["productName"],
      });
    }
  } else {
    if (!data.productId || data.productId.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Product selection is required for stock items.",
        path: ["productId"],
      });
    }
  }
});

const orderFormSchema = z.object({
  id: z.string().optional(),
  orderNumber: z.string().min(1, "Order number is required"),
  customerId: z.string().min(1, "Customer is required"),
  date: z.date({ required_error: "Order date is required." }),
  status: z.enum(ORDER_STATUSES as [typeof ORDER_STATUSES[0], ...typeof ORDER_STATUSES]),
  orderState: z.enum(ORDER_STATES as [typeof ORDER_STATES[0], ...typeof ORDER_STATES]),
  poNumber: z.string().optional(),
  expectedDeliveryDate: z.date().optional(),
  readyForPickUpDate: z.date().optional(),
  pickedUpDate: z.date().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
  notes: z.string().optional(),
});

export type OrderFormData = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
  order?: Order;
  initialData?: OrderFormData | null;
  onSubmit: (data: OrderFormData) => void;
  onClose?: () => void;
  customers: Customer[];
  products: Product[];
  productCategories: string[];
}

export function OrderForm({ order, initialData, onSubmit, onClose, customers, products, productCategories }: OrderFormProps) {
  const defaultFormValues = useMemo((): OrderFormData => {
    if (order) {
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        date: new Date(order.date),
        status: order.status,
        orderState: order.orderState,
        poNumber: order.poNumber || '',
        expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : undefined,
        readyForPickUpDate: order.readyForPickUpDate ? new Date(order.readyForPickUpDate) : undefined,
        pickedUpDate: order.pickedUpDate ? new Date(order.pickedUpDate) : undefined,
        lineItems: order.lineItems.map(li => ({
          id: li.id,
          productId: li.productId,
          productName: li.productName,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          isReturn: li.isReturn || false,
          isNonStock: li.isNonStock || false,
        })),
        notes: order.notes || '',
      };
    } else if (initialData) {
      return {
        ...initialData,
        id: initialData.id,
        poNumber: initialData.poNumber ?? '',
        date: initialData.date instanceof Date ? initialData.date : new Date(initialData.date),
        expectedDeliveryDate: initialData.expectedDeliveryDate ? (initialData.expectedDeliveryDate instanceof Date ? initialData.expectedDeliveryDate : new Date(initialData.expectedDeliveryDate)) : undefined,
        readyForPickUpDate: initialData.readyForPickUpDate ? (initialData.readyForPickUpDate instanceof Date ? initialData.readyForPickUpDate : new Date(initialData.readyForPickUpDate)) : undefined,
        pickedUpDate: initialData.pickedUpDate ? (initialData.pickedUpDate instanceof Date ? initialData.pickedUpDate : new Date(initialData.pickedUpDate)) : undefined,
        lineItems: initialData.lineItems.map(li => ({
            productId: li.productId,
            productName: li.productName || products.find(p => p.id === li.productId)?.name || '',
            quantity: li.quantity,
            unitPrice: li.unitPrice ?? products.find(p => p.id === li.productId)?.price ?? 0,
            isReturn: li.isReturn || false,
            isNonStock: li.isNonStock || !li.productId,
        })),
      };
    } else {
      return {
        id: undefined,
        orderNumber: `ORD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
        customerId: '',
        date: new Date(),
        status: 'Draft',
        orderState: 'Open',
        poNumber: '',
        lineItems: [{ productId: '', productName: '', quantity: 1, unitPrice: 0, isReturn: false, isNonStock: false }],
        notes: '',
        expectedDeliveryDate: undefined,
        readyForPickUpDate: undefined,
        pickedUpDate: undefined,
      };
    }
  }, [order, initialData, products]);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: defaultFormValues,
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const watchedLineItems = form.watch('lineItems');
  const watchedCustomerId = form.watch('customerId');

  const [lineItemCategoryFilters, setLineItemCategoryFilters] = useState<(string | undefined)[]>(
    defaultFormValues.lineItems.map(item => {
        if (!item.isNonStock && item.productId) {
            const product = products.find(p => p.id === item.productId);
            return product?.category;
        }
        return undefined;
    })
  );

  useEffect(() => {
    form.reset(defaultFormValues);
    setLineItemCategoryFilters(
        defaultFormValues.lineItems.map(item => {
            if (!item.isNonStock && item.productId) {
                const product = products.find(p => p.id === item.productId);
                return product?.category;
            }
            return undefined;
        })
     );
  }, [defaultFormValues, form, products]);

  const calculateUnitPrice = (product: Product, customer?: Customer): number => {
    let finalPrice = product.price; 
    if (customer && customer.specificMarkups && customer.specificMarkups.length > 0) {
      const specificRule = customer.specificMarkups.find(m => m.categoryName === product.category);
      const allCategoriesRule = customer.specificMarkups.find(m => m.categoryName === ALL_CATEGORIES_MARKUP_KEY);

      if (specificRule) {
        finalPrice = product.cost * (1 + specificRule.markupPercentage / 100);
      } else if (allCategoriesRule) {
        finalPrice = product.cost * (1 + allCategoriesRule.markupPercentage / 100);
      }
    }
    return parseFloat(finalPrice.toFixed(2));
  };

  useEffect(() => {
    if (!watchedCustomerId) return;
    const currentCustomer = customers.find(c => c.id === watchedCustomerId);

    const updatedLineItems = watchedLineItems.map((item) => {
      if (item.isNonStock || !item.productId) return item;

      const product = products.find(p => p.id === item.productId);
      if (!product) return item;

      const newUnitPrice = calculateUnitPrice(product, currentCustomer);
      
      if (item.unitPrice !== newUnitPrice) {
        return { ...item, unitPrice: newUnitPrice };
      }
      return item;
    });
    
    if (JSON.stringify(updatedLineItems) !== JSON.stringify(watchedLineItems)) {
        updatedLineItems.forEach((item, index) => {
            update(index, item);
        });
    }
  }, [watchedCustomerId, customers, products, watchedLineItems, update]);


  const currentSubtotal = useMemo(() => {
    return watchedLineItems.reduce((acc, item) => {
      const price = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
      const quantity = item.quantity || 0;
      const itemTotal = price * quantity;
      return acc + (item.isReturn ? -itemTotal : itemTotal);
    }, 0);
  }, [watchedLineItems]);

  const currentTotal = currentSubtotal;

  const handleCategoryFilterChange = (index: number, valueFromSelect: string | undefined) => {
    const newCategoryFilter = valueFromSelect === ALL_CATEGORIES_VALUE ? undefined : valueFromSelect;
    setLineItemCategoryFilters(prevFilters => {
      const newFilters = [...prevFilters];
      newFilters[index] = newCategoryFilter;
      return newFilters;
    });
    form.setValue(`lineItems.${index}.productId`, '', { shouldValidate: true });
    form.setValue(`lineItems.${index}.productName`, '');
    form.setValue(`lineItems.${index}.unitPrice`, 0, { shouldValidate: true });
    form.trigger(`lineItems.${index}.productId`);
  };

  const getFilteredProducts = (index: number) => {
    const selectedCategory = lineItemCategoryFilters[index];
    if (selectedCategory && selectedCategory !== ALL_CATEGORIES_VALUE) {
      return products.filter(p => p.category === selectedCategory);
    }
    return products;
  };

  const handleProductSelect = (index: number, productId: string) => {
    const selectedProd = products.find(p => p.id === productId);
    const currentCustomerId = form.getValues('customerId');
    const currentCustomer = customers.find(c => c.id === currentCustomerId);

    if (selectedProd) {
      const finalPrice = calculateUnitPrice(selectedProd, currentCustomer);
      form.setValue(`lineItems.${index}.productId`, selectedProd.id, { shouldValidate: true });
      form.setValue(`lineItems.${index}.productName`, selectedProd.name);
      form.setValue(`lineItems.${index}.unitPrice`, finalPrice, { shouldValidate: true });
      // form.setValue(`lineItems.${index}.isNonStock`, false);
      setLineItemCategoryFilters(prevFilters => {
        const newFilters = [...prevFilters];
        newFilters[index] = selectedProd.category;
        return newFilters;
      });
    }
    form.trigger(`lineItems.${index}.productId`);
    form.trigger(`lineItems.${index}.unitPrice`);
  };

  const addLineItem = () => {
    append({ productId: '', productName: '', quantity: 1, unitPrice: 0, isReturn: false, isNonStock: false });
    setLineItemCategoryFilters(prev => [...prev, undefined]);
  };

  const removeLineItem = (index: number) => {
    remove(index);
    setLineItemCategoryFilters(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleNonStockToggle = (index: number, checked: boolean) => {
    form.setValue(`lineItems.${index}.isNonStock`, checked);
    if (checked) {
      form.setValue(`lineItems.${index}.productId`, undefined); 
      form.setValue(`lineItems.${index}.unitPrice`, 0); 
      form.trigger(`lineItems.${index}.productName`); 
      form.trigger(`lineItems.${index}.unitPrice`);
    } else {
      form.setValue(`lineItems.${index}.productName`, ''); 
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <FormField control={form.control} name="orderNumber" render={({ field }) => (
          <FormItem><FormLabel>Order Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
                        {customers.map((customer) => {
                           const displayName = customer.companyName ? 
                               `${customer.companyName} (${customer.firstName} ${customer.lastName})` : 
                               `${customer.firstName} ${customer.lastName}`;
                           const allEmails = customer.emailContacts?.map(ec => ec.email).join(' ') || '';
                           const searchableValue = [
                             customer.firstName,
                             customer.lastName,
                             customer.companyName,
                             customer.phone,
                             allEmails,
                             ...(customer.specificMarkups?.map(sm => `${sm.categoryName} ${sm.markupPercentage}%`) || [])
                           ].filter(Boolean).join(' ').toLowerCase();

                          return (
                            <CommandItem
                              value={searchableValue}
                              key={customer.id}
                              onSelect={() => {
                                form.setValue("customerId", customer.id, { shouldValidate: true });
                              }}
                            >
                              <Icon name="Check" className={cn("mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")}/>
                              {displayName}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField control={form.control} name="poNumber" render={({ field }) => (
          <FormItem><FormLabel>P.O. Number (Optional)</FormLabel><FormControl><Input {...field} placeholder="Customer PO" /></FormControl><FormMessage /></FormItem>
        )} />

        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Order Date</FormLabel>
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                    <Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Order Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                <SelectContent>{ORDER_STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="orderState" render={({ field }) => (
            <FormItem>
              <FormLabel>Order State</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger></FormControl>
                <SelectContent>{ORDER_STATES.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="expectedDeliveryDate" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Expected Delivery (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
              </Popover><FormMessage />
            </FormItem>
        )} />
         <FormField control={form.control} name="readyForPickUpDate" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Ready for Pickup (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
              </Popover><FormMessage />
            </FormItem>
        )} />
         <FormField control={form.control} name="pickedUpDate" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Picked Up Date (Optional)</FormLabel>
              <Popover>
                <PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
              </Popover><FormMessage />
            </FormItem>
        )} />

        <Separator />
        <h3 className="text-lg font-medium">Line Items</h3>
        {fields.map((fieldItem, index) => {
          const currentLineItem = watchedLineItems[index];
          const quantity = currentLineItem?.quantity || 0;
          const unitPrice = typeof currentLineItem?.unitPrice === 'number' ? currentLineItem.unitPrice : 0;
          const isReturn = currentLineItem?.isReturn || false;
          const isNonStock = currentLineItem?.isNonStock || false;
          const lineTotal = isReturn ? -(quantity * unitPrice) : (quantity * unitPrice);
          const filteredProductsForLine = getFilteredProducts(index);

          return (
            <div key={fieldItem.id} className="space-y-3 p-4 border rounded-md relative">
              <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeLineItem(index)}>
                <Icon name="Trash2" className="h-4 w-4 text-destructive" />
              </Button>

              <div className="flex items-center space-x-4">
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.isReturn`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal">Return Item?</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.isNonStock`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => handleNonStockToggle(index, !!checked)} /></FormControl>
                      <FormLabel className="font-normal">Non-Stock Item?</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              {isNonStock ? (
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.productName`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product/Service Name</FormLabel>
                      <FormControl><Input {...field} placeholder="Enter item name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
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
                                  {filteredProductsForLine.map((product) => {
                                    const searchableValue = [product.name, product.category, product.unit]
                                      .filter(Boolean)
                                      .join(' ')
                                      .toLowerCase();
                                    return (
                                      <CommandItem
                                        value={searchableValue}
                                        key={product.id}
                                        onSelect={() => handleProductSelect(index, product.id)}
                                      >
                                        <Icon name="Check" className={cn("mr-2 h-4 w-4", product.id === controllerField.value ? "opacity-100" : "opacity-0")}/>
                                        {product.name} ({product.unit}) - Cost: ${product.cost.toFixed(2)}
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <div className="grid grid-cols-3 gap-4 items-end">
                 <FormField
                  control={form.control}
                  name={`lineItems.${index}.unitPrice`}
                  render={({ field: priceField }) => (
                    <FormItem>
                      <FormLabel>Unit Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...priceField}
                           value={priceField.value === undefined || priceField.value === null || isNaN(Number(priceField.value)) ? '' : String(priceField.value)}
                           onChange={(e) => {
                            const val = e.target.value;
                            const num = parseFloat(val);
                            priceField.onChange(isNaN(num) ? undefined : num);
                           }}
                          disabled={!isNonStock && !watchedLineItems[index]?.productId}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`lineItems.${index}.quantity`}
                  render={({ field: qtyField }) => (
                    <FormItem>
                      <FormLabel>Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...qtyField}
                           value={qtyField.value === undefined || qtyField.value === null || isNaN(Number(qtyField.value)) ? '' : String(qtyField.value)}
                           onChange={(e) => {
                            const val = e.target.value;
                            const num = parseInt(val, 10);
                            qtyField.onChange(isNaN(num) ? undefined : num);
                           }}
                          min="1"
                          disabled={!isNonStock && !watchedLineItems[index]?.productId}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Line Total</FormLabel>
                  <Input type="text" readOnly value={lineTotal !== 0 ? `${isReturn ? '-' : ''}$${Math.abs(lineTotal).toFixed(2)}` : '$0.00'} className={cn("bg-muted font-semibold", isReturn && "text-destructive")} />
                </FormItem>
              </div>
            </div>
          );
        })}
        <Button type="button" variant="outline" onClick={addLineItem}>
          <Icon name="PlusCircle" className="mr-2 h-4 w-4" /> Add Item
        </Button>
        {form.formState.errors.lineItems && !form.formState.errors.lineItems.root && !fields.length && (
             <p className="text-sm font-medium text-destructive">{form.formState.errors.lineItems.message}</p>
        )}
        {form.formState.errors.lineItems?.root?.message && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.lineItems.root.message}</p>
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
          <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Additional notes for the order..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end gap-2 pt-4">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit">{order || initialData ? 'Save Changes' : 'Create Order'}</Button>
        </div>
      </form>
    </Form>
  );
}
