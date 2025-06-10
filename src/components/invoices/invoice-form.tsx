
"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Invoice, DocumentStatus, Customer, Product, PaymentMethod } from '@/types';
import { PAYMENT_METHODS } from '@/lib/constants';
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

const INVOICE_STATUSES: Extract<DocumentStatus, 'Draft' | 'Sent' | 'Partially Paid' | 'Paid' | 'Voided'>[] = ['Draft', 'Sent', 'Partially Paid', 'Paid', 'Voided'];
const ALL_CATEGORIES_VALUE = "_ALL_CATEGORIES_";

const lineItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "Product selection is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative").optional(),
});

const invoiceFormSchema = z.object({
  id: z.string().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  customerId: z.string().min(1, "Customer is required"),
  date: z.date({ required_error: "Invoice date is required." }),
  dueDate: z.date().optional(),
  status: z.enum(INVOICE_STATUSES as [typeof INVOICE_STATUSES[0], ...typeof INVOICE_STATUSES]),
  poNumber: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  newPaymentAmount: z.coerce.number().positive("Amount must be positive").optional(),
  newPaymentDate: z.date().optional(),
  newPaymentMethod: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]).optional(),
  newPaymentNotes: z.string().optional(),
}).refine(data => {
    if (data.newPaymentAmount && data.newPaymentAmount > 0) {
        return !!data.newPaymentDate && !!data.newPaymentMethod;
    }
    return true;
}, {
    message: "Payment date and method are required if payment amount is entered.",
    path: ["newPaymentMethod"], 
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  invoice?: Invoice;
  initialData?: InvoiceFormData | null;
  onSubmit: (data: InvoiceFormData) => void;
  onClose?: () => void;
  customers: Customer[];
  products: Product[];
  productCategories: string[];
}

export function InvoiceForm({ invoice, initialData, onSubmit, onClose, customers, products, productCategories = [] }: InvoiceFormProps) {
  const defaultFormValues = useMemo((): InvoiceFormData => {
    let baseValues: Omit<InvoiceFormData, 'newPaymentAmount' | 'newPaymentDate' | 'newPaymentMethod' | 'newPaymentNotes'>;

    if (invoice) {
      baseValues = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        date: new Date(invoice.date),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
        status: invoice.status,
        poNumber: invoice.poNumber ?? '', 
        lineItems: invoice.lineItems.map(li => ({ 
            id: li.id, 
            productId: li.productId, 
            quantity: li.quantity,
            unitPrice: li.unitPrice, 
        })),
        paymentTerms: invoice.paymentTerms || 'Due on receipt',
        notes: invoice.notes || '',
      };
    } else if (initialData) {
      baseValues = {
        ...initialData, 
        poNumber: initialData.poNumber ?? '', 
        date: initialData.date instanceof Date ? initialData.date : new Date(initialData.date),
        dueDate: initialData.dueDate ? (initialData.dueDate instanceof Date ? initialData.dueDate : new Date(initialData.dueDate)) : undefined,
        lineItems: initialData.lineItems.map(li => ({
            productId: li.productId,
            quantity: li.quantity,
            unitPrice: li.unitPrice ?? products.find(p => p.id === li.productId)?.price ?? 0,
        })),
      };
    } else {
      baseValues = {
        id: undefined,
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000).padStart(4, '0')}`,
        customerId: '',
        date: new Date(),
        status: 'Draft',
        poNumber: '',
        lineItems: [{ productId: '', quantity: 1, unitPrice: 0 }],
        paymentTerms: 'Due on receipt',
        notes: '',
        dueDate: undefined,
      };
    }

    return {
      ...baseValues,
      newPaymentAmount: undefined,
      newPaymentDate: undefined,
      newPaymentMethod: undefined,
      newPaymentNotes: undefined,
    };
  }, [invoice, initialData, products]);

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: defaultFormValues,
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const watchedLineItems = form.watch('lineItems');
  const [lineItemCategoryFilters, setLineItemCategoryFilters] = useState<(string | undefined)[]>(
    defaultFormValues.lineItems.map(item => {
        if (item.productId) {
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
            if (item.productId) {
                const product = products.find(p => p.id === item.productId);
                return product?.category;
            }
            return undefined;
        })
     );
  }, [defaultFormValues, form, products]);


  const currentInvoiceTotal = useMemo(() => {
    return watchedLineItems.reduce((acc, item) => {
      const price = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
      return acc + (price * (item.quantity || 0));
    }, 0);
  }, [watchedLineItems]);

  const amountAlreadyPaid = invoice?.amountPaid || 0;
  const newPaymentAmount = form.watch("newPaymentAmount") || 0;
  const totalPaidDisplay = amountAlreadyPaid + newPaymentAmount;
  const balanceDueDisplay = currentInvoiceTotal - totalPaidDisplay;

  const handleCategoryFilterChange = (index: number, valueFromSelect: string | undefined) => {
    const newCategoryFilter = valueFromSelect === ALL_CATEGORIES_VALUE ? undefined : valueFromSelect;
    setLineItemCategoryFilters(prevFilters => {
      const newFilters = [...prevFilters];
      newFilters[index] = newCategoryFilter;
      return newFilters;
    });
    form.setValue(`lineItems.${index}.productId`, '', { shouldValidate: true });
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
    if (selectedProd) {
      form.setValue(`lineItems.${index}.productId`, selectedProd.id, { shouldValidate: true });
      form.setValue(`lineItems.${index}.unitPrice`, selectedProd.price, { shouldValidate: true }); 
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
    append({ productId: '', quantity: 1, unitPrice: 0 });
    setLineItemCategoryFilters(prev => [...prev, undefined]);
  };

  const removeLineItem = (index: number) => {
    remove(index);
    setLineItemCategoryFilters(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleFormSubmit = (data: InvoiceFormData) => {
    onSubmit(data);
    if (!invoice && !initialData) {
        form.reset({ 
            ...data, 
            newPaymentAmount: undefined,
            newPaymentDate: undefined,
            newPaymentMethod: undefined,
            newPaymentNotes: undefined,
        });
    } else {
        form.setValue('newPaymentAmount', undefined);
        form.setValue('newPaymentDate', undefined);
        form.setValue('newPaymentMethod', undefined);
        form.setValue('newPaymentNotes', '');
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
          <FormItem><FormLabel>Invoice Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
                             allEmails
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Invoice Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      <Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
              </Popover><FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="dueDate" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date (Optional)</FormLabel>
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
        </div>

        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
              <SelectContent>{INVOICE_STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        
        <FormField control={form.control} name="paymentTerms" render={({ field }) => (
          <FormItem><FormLabel>Payment Terms (Optional)</FormLabel><FormControl><Input {...field} placeholder="e.g., Due on receipt, NET 30" /></FormControl><FormMessage /></FormItem>
        )} />

        <Separator />
        <h3 className="text-lg font-medium">Line Items</h3>
        {fields.map((fieldItem, index) => {
          const currentLineItem = watchedLineItems[index];
          const quantity = currentLineItem?.quantity || 0;
          const unitPrice = typeof currentLineItem?.unitPrice === 'number' ? currentLineItem.unitPrice : 0;
          const lineTotal = unitPrice * quantity;
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
                    {(productCategories || []).map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormItem>

              <FormField
                control={form.control}
                name={`lineItems.${index}.productId`}
                render={({ field: controllerField }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Product</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl>
                          <Button variant="outline" role="combobox" className={cn("w-full justify-between", !controllerField.value && "text-muted-foreground")}>
                            {controllerField.value ? products.find(p => p.id === controllerField.value)?.name : "Select product"}
                            <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                    </FormControl></PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                        <CommandInput placeholder="Search product..." /><CommandList><CommandEmpty>No product found.</CommandEmpty>
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
                                {product.name} ({product.unit}) - Price: ${product.price.toFixed(2)}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup></CommandList>
                    </Command></PopoverContent></Popover><FormMessage />
                  </FormItem>
                )}
              />
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
                          disabled={!watchedLineItems[index]?.productId}
                          placeholder="0.00"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field: qtyField }) => (
                    <FormItem><FormLabel>Quantity</FormLabel><FormControl>
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
                            disabled={!watchedLineItems[index]?.productId}
                        />
                    </FormControl><FormMessage /></FormItem>
                )}/>
                <FormItem><FormLabel>Line Total</FormLabel><Input type="text" readOnly value={lineTotal > 0 ? `$${lineTotal.toFixed(2)}` : '-'} className="bg-muted font-semibold" /></FormItem>
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
        <div className="space-y-2 text-right font-medium">
            <div>Invoice Total: <span className="font-semibold">${currentInvoiceTotal.toFixed(2)}</span></div>
            {invoice && amountAlreadyPaid > 0 && (
                 <div>Previously Paid: <span className="text-green-600">(${amountAlreadyPaid.toFixed(2)})</span></div>
            )}
            {newPaymentAmount > 0 && (
                 <div>New Payment: <span className="text-green-600">(${newPaymentAmount.toFixed(2)})</span></div>
            )}
            <div className="text-lg">Balance Due: <span className="font-bold">${balanceDueDisplay.toFixed(2)}</span></div>
        </div>
        
        <Separator />
        <h3 className="text-lg font-medium">Record New Payment (Optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="newPaymentAmount" render={({ field }) => (
                <FormItem><FormLabel>Payment Amount</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || undefined)} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="newPaymentDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                <FormLabel>Payment Date</FormLabel>
                <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                </FormControl></PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                </Popover><FormMessage />
                </FormItem>
            )} />
        </div>
        <FormField control={form.control} name="newPaymentMethod" render={({ field }) => (
            <FormItem>
                <FormLabel>Payment Method</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""} >
                <FormControl><SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger></FormControl>
                <SelectContent>{PAYMENT_METHODS.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="newPaymentNotes" render={({ field }) => (
          <FormItem><FormLabel>Payment Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Check #123" {...field} rows={2} /></FormControl><FormMessage /></FormItem>
        )} />
        {(form.formState.errors.newPaymentMethod || (form.formState.errors.newPaymentDate && form.getValues("newPaymentAmount"))) && (
             <p className="text-sm font-medium text-destructive">{form.formState.errors.newPaymentMethod?.message || form.formState.errors.newPaymentDate?.message}</p>
        )}


        <Separator />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Invoice Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Thank you for your business!" {...field} rows={3} /></FormControl><FormMessage /></FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-4">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit">{invoice || initialData ? 'Save Changes' : 'Create Invoice'}</Button>
        </div>
      </form>
    </Form>
  );
}
