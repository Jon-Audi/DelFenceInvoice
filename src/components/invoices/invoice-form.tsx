
"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Invoice, DocumentStatus, Customer, Product, PaymentMethod, Payment } from '@/types';
import { PAYMENT_METHODS, ALL_CATEGORIES_MARKUP_KEY } from '@/lib/constants';
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
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Icon } from '@/components/icons';
import { Separator } from '@/components/ui/separator';
import { BulkAddProductsDialog } from '@/components/estimates/bulk-add-products-dialog';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
const INVOICE_STATUSES: Extract<DocumentStatus, 'Draft' | 'Sent' | 'Ordered' | 'Ready for pick up' | 'Picked up' | 'Partially Paid' | 'Paid' | 'Voided'>[] = ['Draft', 'Sent', 'Ordered', 'Ready for pick up', 'Picked up', 'Partially Paid', 'Paid', 'Voided'];
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

// Schema for individual payment objects within the form's payments array
const formPaymentSchema = z.object({
  id: z.string(),
  date: z.date(), // Store as Date object in form state, convert to ISO string on final submission
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]),
  notes: z.string().optional(),
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
  payments: z.array(formPaymentSchema).optional(), // Holds the array of all payments for the invoice
  readyForPickUpDate: z.date().optional(),
  pickedUpDate: z.date().optional(),

  // Fields for the "Add/Edit Payment" UI section
  currentPaymentAmount: z.coerce.number().positive("Amount must be positive").optional(),
  currentPaymentDate: z.date().optional(),
  currentPaymentMethod: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]).optional(),
  currentPaymentNotes: z.string().optional(),
}).refine(data => {
    // Validation for the current payment input section IF an amount is entered
    if (data.currentPaymentAmount && data.currentPaymentAmount > 0) {
        return !!data.currentPaymentDate && !!data.currentPaymentMethod;
    }
    return true;
}, {
    message: "Payment date and method are required if payment amount is entered for the current payment.",
    path: ["currentPaymentMethod"], // Or another relevant path like currentPaymentDate
});

export type InvoiceFormData = Omit<z.infer<typeof invoiceFormSchema>, 'payments'> & {
  // For submission, payments need to be in the format expected by the backend (ISO date string)
  payments?: Payment[];
};
export type FormPayment = z.infer<typeof formPaymentSchema>;


interface InvoiceFormProps {
  invoice?: Invoice;
  initialData?: Partial<InvoiceFormData> & { lineItems: InvoiceFormData['lineItems'] } | null; // Allow partial for conversion
  onSubmit: (data: InvoiceFormData) => void;
  onClose?: () => void;
  customers: Customer[];
  products: Product[];
  productCategories: string[];
}

export function InvoiceForm({ invoice, initialData, onSubmit, onClose, customers, products, productCategories = [] }: InvoiceFormProps) {
  const [isBulkAddDialogOpen, setIsBulkAddDialogOpen] = useState(false);
  const [lineItemCategoryFilters, setLineItemCategoryFilters] = useState<(string | undefined)[]>([]);
  const [editingPayment, setEditingPayment] = useState<FormPayment | null>(null);
  
  // Local state for managing the list of payments displayed and manipulated in the form
  const [localPayments, setLocalPayments] = useState<FormPayment[]>([]);
  const prevCustomerIdRef = useRef<string | undefined>();

  const form = useForm<z.infer<typeof invoiceFormSchema>>({
    resolver: zodResolver(invoiceFormSchema),
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const watchedStatus = form.watch('status');

  // Initialize localPayments and form when invoice or initialData props change
  useEffect(() => {
    let defaultValues: z.infer<typeof invoiceFormSchema>;
    let initialLocalPayments: FormPayment[] = [];

    if (invoice) {
      defaultValues = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        date: new Date(invoice.date),
        dueDate: invoice.dueDate ? new Date(invoice.dueDate) : undefined,
        status: invoice.status,
        poNumber: invoice.poNumber ?? '',
        lineItems: invoice.lineItems.map(li => ({
            id: li.id, productId: li.productId, productName: li.productName,
            quantity: li.quantity, unitPrice: li.unitPrice,
            isReturn: li.isReturn || false, isNonStock: li.isNonStock || false,
        })),
        paymentTerms: invoice.paymentTerms || 'Due on receipt',
        notes: invoice.notes || '',
        payments: invoice.payments?.map(p => ({...p, date: parseISO(p.date)})) || [], // Convert ISO string to Date
        readyForPickUpDate: invoice.readyForPickUpDate ? new Date(invoice.readyForPickUpDate) : undefined,
        pickedUpDate: invoice.pickedUpDate ? new Date(invoice.pickedUpDate) : undefined,
      };
      initialLocalPayments = defaultValues.payments || [];
    } else if (initialData) {
      defaultValues = {
        ...initialData,
        id: initialData.id,
        invoiceNumber: initialData.invoiceNumber || `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000).padStart(4, '0')}`,
        customerId: initialData.customerId || '',
        date: initialData.date instanceof Date ? initialData.date : new Date(initialData.date || Date.now()),
        dueDate: initialData.dueDate ? (initialData.dueDate instanceof Date ? initialData.dueDate : new Date(initialData.dueDate)) : undefined,
        status: initialData.status || 'Draft',
        poNumber: initialData.poNumber ?? '',
        lineItems: (initialData.lineItems || [{ id: crypto.randomUUID(), productId: '', productName: '', quantity: 1, unitPrice: 0, isReturn: false, isNonStock: false }]).map(li => ({
            ...li, id: li.id || crypto.randomUUID()
        })),
        paymentTerms: initialData.paymentTerms || 'Due on receipt',
        notes: initialData.notes || '',
        payments: initialData.payments?.map(p => ({...p, date: typeof p.date === 'string' ? parseISO(p.date as string) : p.date})) || [],
      };
      initialLocalPayments = defaultValues.payments || [];
    } else {
      defaultValues = {
        id: undefined,
        invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random()*9000)+1000).padStart(4, '0')}`,
        customerId: '', date: new Date(), status: 'Draft', poNumber: '',
        lineItems: [{ id: crypto.randomUUID(), productId: '', productName: '', quantity: 1, unitPrice: 0, isReturn: false, isNonStock: false }],
        paymentTerms: 'Due on receipt', notes: '', dueDate: undefined, payments: [],
      };
    }
    // Explicitly set undefined for currentPayment fields if not editing
    defaultValues.currentPaymentAmount = undefined;
    defaultValues.currentPaymentDate = undefined;
    defaultValues.currentPaymentMethod = undefined;
    defaultValues.currentPaymentNotes = undefined;

    form.reset(defaultValues);
    setLocalPayments(initialLocalPayments);
    setEditingPayment(null); 

    const formLineItemsAfterReset = form.getValues('lineItems') || [];
    const newCategoryFilters = formLineItemsAfterReset.map(item => {
        if (!item.isNonStock && item.productId && products && products.length > 0) {
            const product = products.find(p => p.id === item.productId);
            return product?.category;
        }
        return undefined;
    });
    setLineItemCategoryFilters(newCategoryFilters);
  }, [invoice, initialData, form, products]);


  const watchedLineItems = form.watch('lineItems') || [];
  const watchedCustomerId = form.watch('customerId');
  
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
    const customer = customers.find(c => c.id === watchedCustomerId);
    if (!watchedCustomerId || !customer || !products || products.length === 0) return;
  
    const currentLineItems = form.getValues('lineItems');
    let hasChanged = false;
  
    const updatedLineItems = currentLineItems.map(item => {
      if (item.isNonStock || !item.productId) {
        return item;
      }
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        return item;
      }
      const newUnitPrice = calculateUnitPrice(product, customer);
      if (Math.abs(item.unitPrice - newUnitPrice) > 0.001) { // Compare with tolerance
        hasChanged = true;
        return { ...item, unitPrice: newUnitPrice };
      }
      return item;
    });
  
    if (hasChanged) {
      form.setValue('lineItems', updatedLineItems, { shouldValidate: true });
    }
  
    prevCustomerIdRef.current = watchedCustomerId;
  }, [watchedCustomerId, customers, products, form]);
  
  const currentInvoiceTotal = useMemo(() => {
    return (watchedLineItems || []).reduce((acc, item) => {
      const price = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
      const quantity = item.quantity || 0;
      const itemTotal = price * quantity;
      return acc + (item.isReturn ? -itemTotal : itemTotal);
    }, 0);
  }, [watchedLineItems]);

  const totalPaidFromLocalPayments = useMemo(() => {
    return localPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [localPayments]);

  const balanceDueDisplay = currentInvoiceTotal - totalPaidFromLocalPayments;

  const handleAddOrUpdatePayment = () => {
    const amount = form.getValues("currentPaymentAmount");
    const date = form.getValues("currentPaymentDate");
    const method = form.getValues("currentPaymentMethod");
    const notes = form.getValues("currentPaymentNotes");

    if (amount && amount > 0 && date && method) {
      if (editingPayment) { // Update existing payment
        setLocalPayments(prev => prev.map(p => p.id === editingPayment.id ? { ...editingPayment, date, amount, method, notes } : p));
        setEditingPayment(null);
      } else { // Add new payment
        const newPayment: FormPayment = { id: crypto.randomUUID(), date, amount, method, notes };
        setLocalPayments(prev => [...prev, newPayment]);
      }
      // Reset current payment input fields
      form.reset({
        ...form.getValues(),
        currentPaymentAmount: undefined,
        currentPaymentDate: undefined,
        currentPaymentMethod: undefined,
        currentPaymentNotes: '',
      });
      form.clearErrors(["currentPaymentAmount", "currentPaymentDate", "currentPaymentMethod"]);
    } else {
        // Trigger validation for current payment fields if trying to add/update with incomplete info
        form.trigger(["currentPaymentAmount", "currentPaymentDate", "currentPaymentMethod"]);
    }
  };

  const handleEditPayment = (paymentToEdit: FormPayment) => {
    setEditingPayment(paymentToEdit);
    form.setValue("currentPaymentAmount", paymentToEdit.amount);
    form.setValue("currentPaymentDate", paymentToEdit.date); // date is already a Date object
    form.setValue("currentPaymentMethod", paymentToEdit.method);
    form.setValue("currentPaymentNotes", paymentToEdit.notes || '');
  };

  const handleDeletePayment = (paymentId: string) => {
    setLocalPayments(prev => prev.filter(p => p.id !== paymentId));
    if (editingPayment && editingPayment.id === paymentId) {
      setEditingPayment(null);
      form.reset({
        ...form.getValues(),
        currentPaymentAmount: undefined, currentPaymentDate: undefined,
        currentPaymentMethod: undefined, currentPaymentNotes: '',
      });
    }
  };

  const handleCancelEditPayment = () => {
    setEditingPayment(null);
    form.reset({
        ...form.getValues(),
        currentPaymentAmount: undefined, currentPaymentDate: undefined,
        currentPaymentMethod: undefined, currentPaymentNotes: '',
    });
    form.clearErrors(["currentPaymentAmount", "currentPaymentDate", "currentPaymentMethod"]);
  };

  const handleFormSubmit = (data: z.infer<typeof invoiceFormSchema>) => {
    // Convert payment dates from Date objects back to ISO strings for submission
    const paymentsForSubmission: Payment[] = localPayments.map(p => ({
      ...p,
      date: p.date.toISOString(),
    }));

    const formDataForSubmission: InvoiceFormData = {
      ...data,
      payments: paymentsForSubmission,
    };
    // Remove the temporary currentPayment fields before submitting
    delete (formDataForSubmission as any).currentPaymentAmount;
    delete (formDataForSubmission as any).currentPaymentDate;
    delete (formDataForSubmission as any).currentPaymentMethod;
    delete (formDataForSubmission as any).currentPaymentNotes;

    onSubmit(formDataForSubmission);
  };

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
    return (products || []);
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
    append({ id: crypto.randomUUID(), productId: '', productName: '', quantity: 1, unitPrice: 0, isReturn: false, isNonStock: false });
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

  const handleBulkAddItems = (itemsToAdd: Array<{ productId: string; quantity: number }>) => {
    const newFilterEntries: (string | undefined)[] = [];
    const currentCustomerId = form.getValues('customerId');
    const currentCustomer = customers.find(c => c.id === currentCustomerId);

    itemsToAdd.forEach(item => {
      const productDetails = products.find(p => p.id === item.productId);
      if (!productDetails) return;

      const finalPrice = calculateUnitPrice(productDetails, currentCustomer);

      append({
        id: crypto.randomUUID(),
        productId: item.productId,
        productName: productDetails.name,
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        {/* Invoice Header Fields: Number, Customer, PO, Dates, Status, Terms */}
        <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
          <FormItem><FormLabel>Invoice Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="customerId" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Customer</FormLabel>
              <Popover>
                <PopoverTrigger asChild><FormControl>
                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                      {field.value ? customers.find(c => c.id === field.value)?.companyName || `${customers.find(c => c.id === field.value)?.firstName} ${customers.find(c => c.id === field.value)?.lastName}` : "Select customer"}
                      <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </FormControl></PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                    <CommandInput placeholder="Search customer..." />
                    <CommandList><CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                      {customers.map((customer) => {
                           const displayName = customer.companyName ? `${customer.companyName} (${customer.firstName} ${customer.lastName})` : `${customer.firstName} ${customer.lastName}`;
                           const allEmails = customer.emailContacts?.map(ec => ec.email).join(' ') || '';
                           const searchableValue = [customer.firstName, customer.lastName, customer.companyName, customer.phone, allEmails, ...(customer.specificMarkups?.map(sm => `${sm.categoryName} ${sm.markupPercentage}%`) || [])].filter(Boolean).join(' ').toLowerCase();
                          return (
                            <CommandItem value={searchableValue} key={customer.id} onSelect={() => form.setValue("customerId", customer.id, { shouldValidate: true })}>
                              <Icon name="Check" className={cn("mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")}/>
                              {displayName}
                            </CommandItem>
                          );
                        })}
                    </CommandGroup></CommandList>
                </Command></PopoverContent>
              </Popover><FormMessage />
            </FormItem>
        )} />
        <FormField control={form.control} name="poNumber" render={({ field }) => (
          <FormItem><FormLabel>P.O. Number (Optional)</FormLabel><FormControl><Input {...field} placeholder="Customer PO" /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Invoice Date</FormLabel>
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
          <FormField control={form.control} name="dueDate" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date (Optional)</FormLabel>
              <Popover><PopoverTrigger asChild><FormControl>
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
            </Select><FormMessage />
          </FormItem>
        )} />

        {watchedStatus === 'Ready for pick up' && (
             <FormField control={form.control} name="readyForPickUpDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Ready for Pickup Date</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                    </Popover><FormMessage />
                </FormItem>
            )} />
        )}
         {watchedStatus === 'Picked up' && (
             <FormField control={form.control} name="pickedUpDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Picked Up Date</FormLabel>
                    <Popover><PopoverTrigger asChild><FormControl>
                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                    </FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                    </Popover><FormMessage />
                </FormItem>
            )} />
        )}


        <FormField control={form.control} name="paymentTerms" render={({ field }) => (
          <FormItem><FormLabel>Payment Terms (Optional)</FormLabel><FormControl><Input {...field} placeholder="e.g., Due on receipt, NET 30" /></FormControl><FormMessage /></FormItem>
        )} />

        {/* Line Items Section */}
        <Separator /><h3 className="text-lg font-medium">Line Items</h3>
        {fields.map((fieldItem, index) => {
          const currentLineItem = watchedLineItems?.[index];
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
                <FormField control={form.control} name={`lineItems.${index}.isReturn`} render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      <FormLabel className="font-normal">Return Item?</FormLabel>
                    </FormItem>
                )} />
                <FormField control={form.control} name={`lineItems.${index}.isNonStock`} render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2">
                      <FormControl><Checkbox checked={field.value} onCheckedChange={(checked) => handleNonStockToggle(index, !!checked)} /></FormControl>
                      <FormLabel className="font-normal">Non-Stock Item?</FormLabel>
                    </FormItem>
                )} />
              </div>
              {isNonStock ? (
                 <FormField control={form.control} name={`lineItems.${index}.productName`} render={({ field }) => (
                    <FormItem><FormLabel>Product/Service Name</FormLabel><FormControl><Input {...field} placeholder="Enter item name" /></FormControl><FormMessage /></FormItem>
                  )} />
              ) : ( <>
                  <FormItem><FormLabel>Category Filter</FormLabel>
                    <Select value={lineItemCategoryFilters[index] || ALL_CATEGORIES_VALUE} onValueChange={(value) => handleCategoryFilterChange(index, value)}>
                      <FormControl><SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value={ALL_CATEGORIES_VALUE}>All Categories</SelectItem>
                        {(productCategories || []).map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                  <FormField control={form.control} name={`lineItems.${index}.productId`} render={({ field: controllerField }) => (
                      <FormItem className="flex flex-col"><FormLabel>Product</FormLabel>
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
                                const searchableValue = [product.name, product.category, product.unit].filter(Boolean).join(' ').toLowerCase();
                                return (<CommandItem value={searchableValue} key={product.id} onSelect={() => handleProductSelect(index, product.id)}>
                                    <Icon name="Check" className={cn("mr-2 h-4 w-4", product.id === controllerField.value ? "opacity-100" : "opacity-0")}/>
                                    {product.name} ({product.unit}) - Cost: ${product.cost.toFixed(2)}
                                  </CommandItem>); })}
                            </CommandGroup></CommandList>
                        </Command></PopoverContent></Popover><FormMessage />
                      </FormItem>
                  )} /> </>
              )}
              <div className="grid grid-cols-3 gap-4 items-end">
                <FormField control={form.control} name={`lineItems.${index}.unitPrice`} render={({ field: priceField }) => (
                    <FormItem><FormLabel>Unit Price</FormLabel><FormControl>
                        <Input type="number" step="0.01" {...priceField} value={priceField.value === undefined || priceField.value === null || isNaN(Number(priceField.value)) ? '' : String(priceField.value)}
                           onChange={(e) => { const val = e.target.value; const num = parseFloat(val); priceField.onChange(isNaN(num) ? undefined : num); }}
                          disabled={!isNonStock && !watchedLineItems?.[index]?.productId} placeholder="0.00" />
                    </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field: qtyField }) => (
                    <FormItem><FormLabel>Quantity</FormLabel><FormControl>
                        <Input type="number" {...qtyField} value={qtyField.value === undefined || qtyField.value === null || isNaN(Number(qtyField.value)) ? '' : String(qtyField.value)}
                            onChange={(e) => { const val = e.target.value; const num = parseInt(val, 10); qtyField.onChange(isNaN(num) ? undefined : num); }}
                            min="1" disabled={!isNonStock && !watchedLineItems?.[index]?.productId} />
                    </FormControl><FormMessage /></FormItem>
                )}/>
                <FormItem><FormLabel>Line Total</FormLabel>
                  <Input type="text" readOnly value={lineTotal !== 0 ? `${isReturn ? '-' : ''}$${Math.abs(lineTotal).toFixed(2)}` : '$0.00'} className={cn("bg-muted font-semibold", isReturn && "text-destructive")} />
                </FormItem>
              </div>
            </div>
          );
        })}
        <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={addLineItem}><Icon name="PlusCircle" className="mr-2 h-4 w-4" /> Add Item</Button>
            <Button type="button" variant="outline" onClick={() => setIsBulkAddDialogOpen(true)}><Icon name="Layers" className="mr-2 h-4 w-4" /> Bulk Add Stock Items</Button>
        </div>
        {form.formState.errors.lineItems && !form.formState.errors.lineItems.root && !fields.length && (
             <p className="text-sm font-medium text-destructive">{form.formState.errors.lineItems.message}</p>
        )}
         {form.formState.errors.lineItems?.root?.message && (
            <p className="text-sm font-medium text-destructive">{form.formState.errors.lineItems.root.message}</p>
        )}

        {/* Payments Management Section */}
        <Separator />
        <h3 className="text-lg font-medium">Payments</h3>
        {localPayments.length > 0 && (
          <div className="space-y-2 mb-4">
            <Label>Recorded Payments:</Label>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Amount</TableHead><TableHead>Method</TableHead><TableHead>Notes</TableHead><TableHead className="w-[100px]">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {localPayments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{format(p.date, "PPP")}</TableCell>
                    <TableCell>${p.amount.toFixed(2)}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell>{p.notes || 'N/A'}</TableCell>
                    <TableCell className="space-x-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleEditPayment(p)} className="h-7 w-7"><Icon name="Edit" className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleDeletePayment(p.id)} className="h-7 w-7"><Icon name="Trash2" className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="p-4 border rounded-md space-y-3">
            <h4 className="text-md font-medium">{editingPayment ? "Edit Payment" : "Record New Payment"}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="currentPaymentAmount" render={({ field }) => (
                    <FormItem><FormLabel>Payment Amount</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="currentPaymentDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Payment Date</FormLabel>
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
            <FormField control={form.control} name="currentPaymentMethod" render={({ field }) => (
                <FormItem><FormLabel>Payment Method</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger></FormControl>
                <SelectContent>{PAYMENT_METHODS.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent>
                </Select><FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="currentPaymentNotes" render={({ field }) => (
              <FormItem><FormLabel>Payment Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Check #123" {...field} rows={2} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex gap-2">
                <Button type="button" onClick={handleAddOrUpdatePayment}>
                    {editingPayment ? <><Icon name="Check" className="mr-2 h-4 w-4" />Update Payment</> : <><Icon name="PlusCircle" className="mr-2 h-4 w-4" />Add Payment</>}
                </Button>
                {editingPayment && <Button type="button" variant="outline" onClick={handleCancelEditPayment}>Cancel Edit</Button>}
            </div>
            {(form.formState.errors.currentPaymentMethod || (form.formState.errors.currentPaymentDate && form.getValues("currentPaymentAmount"))) && (
                 <p className="text-sm font-medium text-destructive">{form.formState.errors.currentPaymentMethod?.message || form.formState.errors.currentPaymentDate?.message}</p>
            )}
        </div>

        {/* Invoice Totals and Notes */}
        <Separator />
        <div className="space-y-2 text-right font-medium">
            <div>Invoice Total: <span className="font-semibold">${currentInvoiceTotal.toFixed(2)}</span></div>
            {totalPaidFromLocalPayments > 0 && (
                 <div>Total Paid: <span className="text-green-600">(${totalPaidFromLocalPayments.toFixed(2)})</span></div>
            )}
            <div className="text-lg">Balance Due: <span className="font-bold">${balanceDueDisplay.toFixed(2)}</span></div>
        </div>
        <Separator />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Invoice Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Thank you for your business!" {...field} rows={3} /></FormControl><FormMessage /></FormItem>
        )} />

        {/* Submit and Cancel Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit">{invoice || initialData ? 'Save Changes' : 'Create Invoice'}</Button>
        </div>
      </form>
      {isBulkAddDialogOpen && (
        <BulkAddProductsDialog isOpen={isBulkAddDialogOpen} onOpenChange={setIsBulkAddDialogOpen} products={products} productCategories={productCategories} onAddItems={handleBulkAddItems} />
      )}
    </Form>
  );
}
