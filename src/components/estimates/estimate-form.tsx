
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Estimate, Product, DocumentStatus, Customer, LineItem as LineItemType } from '@/types';
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
import { CustomerDialog } from '@/components/customers/customer-dialog';
import { BulkAddProductsDialog } from './bulk-add-products-dialog';
import { ALL_CATEGORIES_MARKUP_KEY } from '@/lib/constants';


const ESTIMATE_STATUSES: Extract<DocumentStatus, 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Voided'>[] = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Voided'];
const ALL_CATEGORIES_VALUE = "_ALL_CATEGORIES_";

const lineItemSchema = z.object({
  id: z.string().optional(),
  isNonStock: z.boolean().optional().default(false),
  productId: z.string().optional(),
  productName: z.string().optional(), // For non-stock items, name is entered directly
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
    // unitPrice is already required to be a number by its own zod type, and min(0)
  } else { // Is a stock item
    if (!data.productId || data.productId.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Product selection is required for stock items.",
        path: ["productId"],
      });
    }
  }
});

const estimateFormSchema = z.object({
  estimateNumber: z.string().min(1, "Estimate number is required"),
  customerId: z.string().min(1, "Customer is required"),
  customerName: z.string().optional(),
  date: z.date({ required_error: "Estimate date is required." }),
  validUntil: z.date().optional(),
  status: z.enum(ESTIMATE_STATUSES as [typeof ESTIMATE_STATUSES[0], ...typeof ESTIMATE_STATUSES]),
  poNumber: z.string().optional(),
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
  onSaveCustomer: (customerToSave: Customer) => Promise<string | void>;
}

export function EstimateForm({ estimate, onSubmit, onClose, products, customers: initialCustomers, productCategories, onSaveCustomer }: EstimateFormProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [isNewCustomerDialogOpen, setIsNewCustomerDialogOpen] = useState(false);
  const [isBulkAddDialogOpen, setIsBulkAddDialogOpen] = useState(false);

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
      poNumber: estimate.poNumber || '',
      lineItems: estimate.lineItems.map(li => ({
        id: li.id,
        productId: li.productId,
        productName: li.productName, // Will be present if non-stock, or derived for stock
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        isReturn: li.isReturn || false,
        isNonStock: li.isNonStock || false,
      })),
      notes: estimate.notes || '',
    } : {
      estimateNumber: `EST-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100).padStart(3, '0')}`,
      customerId: '',
      customerName: '',
      date: new Date(),
      status: 'Draft',
      poNumber: '',
      lineItems: [{ productId: '', productName: '', quantity: 1, unitPrice: 0, isReturn: false, isNonStock: false }],
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
      if (item.isNonStock || !item.productId) return item; // Skip non-stock or items without product ID

      const product = products.find(p => p.id === item.productId);
      if (!product) return item;

      const newUnitPrice = calculateUnitPrice(product, currentCustomer);
      
      // Only update if the price would change based on customer/product logic
      // This preserves manual overrides if the underlying logic doesn't necessitate a change
      if (item.unitPrice !== newUnitPrice) { 
        // This check might be too simple. If a user manually changed the price,
        // and then changes customer, should it revert to new customer-specific logic?
        // For now, yes. If they want to preserve a manual price, they'd re-enter.
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


  const handleSaveNewCustomerFromEstimateForm = async (newCustomerData: Customer) => {
    const newCustomerId = await onSaveCustomer(newCustomerData);
    if (newCustomerId && typeof newCustomerId === 'string') {
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
    form.setValue(`lineItems.${index}.productName`, ''); // Clear manual name if category changes
    form.setValue(`lineItems.${index}.unitPrice`, 0, { shouldValidate: true });
    form.trigger(`lineItems.${index}.productId`);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const selectedProd = products.find(p => p.id === productId);
    const currentCustomerId = form.getValues('customerId');
    const currentCustomer = customers.find(c => c.id === currentCustomerId);

    if (selectedProd) {
      const finalPrice = calculateUnitPrice(selectedProd, currentCustomer);
      form.setValue(`lineItems.${index}.productId`, selectedProd.id, { shouldValidate: true });
      form.setValue(`lineItems.${index}.productName`, selectedProd.name); // Store denormalized name
      form.setValue(`lineItems.${index}.unitPrice`, finalPrice, { shouldValidate: true });
      // form.setValue(`lineItems.${index}.isNonStock`, false); // Ensure it's marked as stock
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

  const handleBulkAddItems = (itemsToAdd: Array<{ productId: string; quantity: number }>) => {
    const newFilterEntries: (string | undefined)[] = [];
    const currentCustomerId = form.getValues('customerId');
    const currentCustomer = customers.find(c => c.id === currentCustomerId);

    itemsToAdd.forEach(item => {
      const productDetails = products.find(p => p.id === item.productId);
      if (!productDetails) return;

      const finalPrice = calculateUnitPrice(productDetails, currentCustomer);

      append({
        productId: item.productId,
        productName: productDetails.name, // Store denormalized name
        quantity: item.quantity,
        unitPrice: finalPrice,
        isReturn: false,
        isNonStock: false,
      });
      newFilterEntries.push(productDetails?.category);
    });
    setLineItemCategoryFilters(prev => [...prev, ...newFilterEntries]);
    setIsBulkAddDialogOpen(false);
  };

  const getFilteredProducts = (index: number) => {
    const selectedCategory = lineItemCategoryFilters[index];
    if (selectedCategory && selectedCategory !== ALL_CATEGORIES_VALUE) {
      return products.filter(p => p.category === selectedCategory);
    }
    return products;
  };
  
  const handleNonStockToggle = (index: number, checked: boolean) => {
    form.setValue(`lineItems.${index}.isNonStock`, checked);
    if (checked) {
      form.setValue(`lineItems.${index}.productId`, undefined); // Clear productId if non-stock
      form.setValue(`lineItems.${index}.unitPrice`, 0); // Reset unit price for manual entry
      form.trigger(`lineItems.${index}.productName`); // Trigger validation if needed
      form.trigger(`lineItems.${index}.unitPrice`);
    } else {
      form.setValue(`lineItems.${index}.productName`, ''); // Clear manual name if stock
      // Let product selection repopulate unit price
    }
  };

  const currentSubtotal = useMemo(() => {
    return watchedLineItems.reduce((acc, item) => {
      const price = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
      const quantity = item.quantity || 0;
      const itemTotal = price * quantity;
      return acc + (item.isReturn ? -itemTotal : itemTotal);
    }, 0);
  }, [watchedLineItems]);

  const currentTotal = currentSubtotal; // Assuming no tax for estimates for now

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
                                  form.setValue("customerName", customer.companyName || `${customer.firstName} ${customer.lastName}`);
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
                <Button type="button" variant="outline" size="icon" onClick={() => setIsNewCustomerDialogOpen(true)} title="Add New Customer">
                  <Icon name="PlusCircle" className="h-4 w-4" />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField control={form.control} name="poNumber" render={({ field }) => (
          <FormItem><FormLabel>P.O. Number (Optional)</FormLabel><FormControl><Input {...field} placeholder="Customer PO" /></FormControl><FormMessage /></FormItem>
        )} />

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
        <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={addLineItem}>
              <Icon name="PlusCircle" className="mr-2 h-4 w-4" /> Add Item
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsBulkAddDialogOpen(true)}>
                <Icon name="Layers" className="mr-2 h-4 w-4" /> Bulk Add Stock Items
            </Button>
        </div>
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
          <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Additional notes for the estimate..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-4">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit">{estimate ? 'Save Changes' : 'Create Estimate'}</Button>
        </div>
      </form>

      {isNewCustomerDialogOpen && (
        <CustomerDialog
          isOpen={isNewCustomerDialogOpen}
          onOpenChange={setIsNewCustomerDialogOpen}
          onSave={handleSaveNewCustomerFromEstimateForm}
          productCategories={productCategories}
        />
      )}
      {isBulkAddDialogOpen && (
        <BulkAddProductsDialog
          isOpen={isBulkAddDialogOpen}
          onOpenChange={setIsBulkAddDialogOpen}
          products={products}
          productCategories={productCategories}
          onAddItems={handleBulkAddItems}
        />
      )}
    </Form>
  );
}
