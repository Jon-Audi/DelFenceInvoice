
"use client";

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Invoice, DocumentStatus, Customer, Product } from '@/types';
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

const INVOICE_STATUSES: Extract<DocumentStatus, 'Draft' | 'Sent' | 'Paid' | 'Voided'>[] = ['Draft', 'Sent', 'Paid', 'Voided'];

const lineItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, "Product selection is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
});

const invoiceFormSchema = z.object({
  id: z.string().optional(), // For initialData from conversion
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  customerId: z.string().min(1, "Customer is required"),
  date: z.date({ required_error: "Invoice date is required." }),
  dueDate: z.date().optional(),
  status: z.enum(INVOICE_STATUSES as [typeof INVOICE_STATUSES[0], ...typeof INVOICE_STATUSES]),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  invoice?: Invoice;
  initialData?: InvoiceFormData | null; // For pre-filling from conversion
  onSubmit: (data: InvoiceFormData) => void;
  onClose?: () => void;
  customers: Customer[];
  products: Product[];
}

export function InvoiceForm({ invoice, initialData, onSubmit, onClose, customers, products }: InvoiceFormProps) {
  const defaultFormValues: InvoiceFormData = invoice
  ? { // Editing existing invoice
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      date: new Date(invoice.date),
      dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
      status: invoice.status,
      lineItems: invoice.lineItems.map(li => ({
        id: li.id,
        productId: li.productId,
        quantity: li.quantity,
      })),
      paymentTerms: invoice.paymentTerms || 'Due on receipt',
      notes: invoice.notes || '',
    }
  : initialData
  ? { // Pre-filling from conversion
      ...initialData,
      date: initialData.date instanceof Date ? initialData.date : new Date(initialData.date),
      dueDate: initialData.dueDate ? (initialData.dueDate instanceof Date ? initialData.dueDate : new Date(initialData.dueDate)) : undefined,
    }
  : { // Creating a new invoice from scratch
      id: undefined,
      invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000).padStart(4, '0')}`,
      customerId: '',
      date: new Date(),
      status: 'Draft',
      lineItems: [],
      paymentTerms: 'Due on receipt',
      notes: '',
      dueDate: undefined,
    };

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: defaultFormValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  useEffect(() => {
    if (initialData && !invoice) { // Only apply if not editing and initialData is present
        form.reset(defaultFormValues);
    }
  }, [initialData, invoice, form, defaultFormValues]);

  const watchedLineItems = form.watch('lineItems');

  const calculateSubtotal = React.useCallback(() => {
    return watchedLineItems.reduce((acc, item) => {
      const product = products.find(p => p.id === item.productId);
      const price = product ? product.price : 0;
      return acc + (price * (item.quantity || 0));
    }, 0);
  }, [watchedLineItems, products]);

  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0); 

  useEffect(() => {
    const newSubtotal = calculateSubtotal();
    setSubtotal(newSubtotal);
    setTotal(newSubtotal); 
  }, [watchedLineItems, calculateSubtotal]);

  const handleProductSelect = (index: number, productId: string) => {
    form.setValue(`lineItems.${index}.productId`, productId, { shouldValidate: true });
    form.trigger(`lineItems.${index}.productId`);
  };
  
  const handleQuantityChange = (index: number, quantity: number) => {
     form.setValue(`lineItems.${index}.quantity`, quantity, { shouldValidate: true });
     form.trigger(`lineItems.${index}.quantity`);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
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
                        {customers.map((customer) => (
                          <CommandItem
                            value={customer.id}
                            key={customer.id}
                            onSelect={() => {
                              form.setValue("customerId", customer.id, { shouldValidate: true });
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

        <Separator />
        <h3 className="text-lg font-medium">Line Items</h3>
        {fields.map((field, index) => {
          const selectedProduct = products.find(p => p.id === watchedLineItems[index]?.productId);
          const unitPrice = selectedProduct ? selectedProduct.price : 0;
          const quantity = watchedLineItems[index]?.quantity || 0;
          const lineTotal = unitPrice * quantity;

          return (
            <div key={field.id} className="space-y-3 p-4 border rounded-md relative">
              <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(index)}>
                <Icon name="Trash2" className="h-4 w-4 text-destructive" />
              </Button>
              
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
                              {products.map((product) => (
                                <CommandItem
                                  value={product.id}
                                  key={product.id}
                                  onSelect={() => {
                                    handleProductSelect(index, product.id);
                                  }}
                                >
                                  <Icon name="Check" className={cn("mr-2 h-4 w-4", product.id === controllerField.value ? "opacity-100" : "opacity-0")}/>
                                  {product.name}
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
                  <Input type="text" readOnly value={unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : '-'} className="bg-muted" />
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
                          {...qtyField} 
                          onChange={(e) => handleQuantityChange(index, parseInt(e.target.value, 10) || 0)}
                          min="1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Line Total</FormLabel>
                  <Input type="text" readOnly value={lineTotal > 0 ? `$${lineTotal.toFixed(2)}` : '-'} className="bg-muted" />
                </FormItem>
              </div>
            </div>
          );
        })}
        <Button type="button" variant="outline" onClick={() => append({ productId: '', quantity: 1 })}>
          <Icon name="PlusCircle" className="mr-2 h-4 w-4" /> Add Line Item
        </Button>
        {form.formState.errors.lineItems && !form.formState.errors.lineItems.root && !fields.length && (
             <p className="text-sm font-medium text-destructive">{form.formState.errors.lineItems.message}</p>
        )}

        <Separator />
        <div className="flex justify-end space-x-4 text-lg font-semibold">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-end space-x-4 text-xl font-bold">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
        
        <FormField control={form.control} name="paymentTerms" render={({ field }) => (
          <FormItem><FormLabel>Payment Terms (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Additional notes for the invoice..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end gap-2 pt-4">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit">{invoice || initialData ? 'Save Changes' : 'Create Invoice'}</Button>
        </div>
      </form>
    </Form>
  );
}

