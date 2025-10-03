
"use client";

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Order, DocumentStatus, Customer, Product, PaymentMethod, Payment } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ALL_CATEGORIES_MARKUP_KEY, PAYMENT_METHODS } from '@/lib/constants';
import { BulkAddProductsDialog } from '@/components/estimates/bulk-add-products-dialog';

const ORDER_STATUSES: Extract<DocumentStatus, 'Draft' | 'Ordered' | 'Ready for pick up' | 'Picked up' | 'Invoiced' | 'Voided' | 'Packed' | 'Partial Packed'>[] = ['Draft', 'Ordered', 'Ready for pick up', 'Picked up', 'Invoiced', 'Voided', 'Packed', 'Partial Packed'];
const ORDER_STATES: Order['orderState'][] = ['Open', 'Closed'];
const ALL_CATEGORIES_VALUE = "_ALL_CATEGORIES_";

const lineItemSchema = z.object({
  id: z.string().optional(),
  isNonStock: z.boolean().optional().default(false),
  productId: z.string().optional(),
  productName: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  unitPrice: z.coerce.number().min(0, "Unit price must be non-negative"),
  cost: z.coerce.number().optional(),
  markupPercentage: z.coerce.number().optional(),
  isReturn: z.boolean().optional(),
  addToProductList: z.boolean().optional().default(false),
  newProductCategory: z.string().optional(),
  unit: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.isNonStock) {
    if (!data.productName || data.productName.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Product name is required for non-stock items.",
        path: ["productName"],
      });
    }
     if (data.addToProductList && (!data.newProductCategory || data.newProductCategory.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Category is required to add this item to the product list.",
        path: ["newProductCategory"],
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

const formPaymentSchema = z.object({
  id: z.string(),
  date: z.date(),
  amount: z.coerce.number().positive("Amount must be positive"),
  method: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]),
  notes: z.string().optional(),
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
  payments: z.array(formPaymentSchema).optional(),
  currentPaymentAmount: z.coerce.number().positive("Amount must be positive").optional(),
  currentPaymentDate: z.date().optional(),
  currentPaymentMethod: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]).optional(),
  currentPaymentNotes: z.string().optional(),
}).refine(data => {
    if (data.currentPaymentAmount && data.currentPaymentAmount > 0) {
        return !!data.currentPaymentDate && !!data.currentPaymentMethod;
    }
    return true;
}, {
    message: "Payment date and method are required if payment amount is entered.",
    path: ["currentPaymentMethod"],
});

export type OrderFormData = Omit<z.infer<typeof orderFormSchema>, 'payments'> & {
  payments?: Payment[];
};
export type FormPayment = z.infer<typeof formPaymentSchema>;


interface OrderFormProps {
  order?: Order;
  initialData?: Partial<OrderFormData> & { lineItems: NonNullable<OrderFormData['lineItems']> } | null;
  onSubmit: (data: OrderFormData) => void;
  onClose?: () => void;
  customers: Customer[];
  products: Product[];
  productCategories: string[];
  onViewCustomer: (customer: Customer) => void;
  onSaveCustomer: (customer: Customer) => Promise<string | void>;
}

export function OrderForm({ order, initialData, onSubmit, onClose, customers, products, productCategories, onViewCustomer, onSaveCustomer }: OrderFormProps) {
  const [lineItemCategoryFilters, setLineItemCategoryFilters] = useState<(string | undefined)[]>([]);
  const [isBulkAddDialogOpen, setIsBulkAddDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<FormPayment | null>(null);
  const [localPayments, setLocalPayments] = useState<FormPayment[]>([]);
  const prevCustomerIdRef = useRef<string | undefined>();

  const form = useForm<z.infer<typeof orderFormSchema>>({
    resolver: zodResolver(orderFormSchema),
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  useEffect(() => {
    let defaultValues: z.infer<typeof orderFormSchema>;
    let initialLocalPayments: FormPayment[] = [];

    if (order) {
        defaultValues = {
            id: order.id, orderNumber: order.orderNumber, customerId: order.customerId,
            date: new Date(order.date), status: order.status, orderState: order.orderState,
            poNumber: order.poNumber || '',
            expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : undefined,
            readyForPickUpDate: order.readyForPickUpDate ? new Date(order.readyForPickUpDate) : undefined,
            pickedUpDate: order.pickedUpDate ? new Date(order.pickedUpDate) : undefined,
            lineItems: order.lineItems.map(li => ({
                id: li.id, productId: li.productId, productName: li.productName,
                quantity: li.quantity, unitPrice: li.unitPrice,
                isReturn: li.isReturn || false, isNonStock: li.isNonStock || false,
                cost: li.cost, markupPercentage: li.markupPercentage,
                addToProductList: li.addToProductList ?? false,
            })),
            notes: order.notes || '',
            payments: order.payments?.map(p => ({...p, date: parseISO(p.date)})) || [],
        };
        initialLocalPayments = defaultValues.payments || [];
    } else if (initialData) {
        defaultValues = {
            ...initialData, id: initialData.id,
            orderNumber: initialData.orderNumber || `ORD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
            customerId: initialData.customerId || '',
            date: initialData.date instanceof Date ? initialData.date : new Date(initialData.date || Date.now()),
            status: initialData.status || 'Draft', orderState: initialData.orderState || 'Open',
            poNumber: initialData.poNumber ?? '',
            expectedDeliveryDate: initialData.expectedDeliveryDate ? (initialData.expectedDeliveryDate instanceof Date ? initialData.expectedDeliveryDate : new Date(initialData.expectedDeliveryDate)) : undefined,
            readyForPickUpDate: initialData.readyForPickUpDate ? (initialData.readyForPickUpDate instanceof Date ? initialData.readyForPickUpDate : new Date(initialData.readyForPickUpDate)) : undefined,
            pickedUpDate: initialData.pickedUpDate ? (initialData.pickedUpDate instanceof Date ? initialData.pickedUpDate : new Date(initialData.pickedUpDate)) : undefined,
            lineItems: (initialData.lineItems || [{ id: crypto.randomUUID(), productId: '', productName: '', quantity: 1, unitPrice: 0, isReturn: false, isNonStock: false }]).map(li => ({ ...li, id: li.id || crypto.randomUUID() })),
            notes: initialData.notes || '', // Cast to any because initialData might have date strings
            payments: initialData.payments?.map((p: any) => ({...p, date: typeof p.date === 'string' ? parseISO(p.date) : p.date})) || [],
        };
        initialLocalPayments = defaultValues.payments || [];
    } else {
        defaultValues = {
            id: undefined, orderNumber: `ORD-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
            customerId: '', date: new Date(), status: 'Draft', orderState: 'Open', poNumber: '',
            lineItems: [{ id: crypto.randomUUID(), productId: '', productName: '', quantity: 1, unitPrice: 0, isReturn: false, isNonStock: false, addToProductList: false }],
            notes: '', expectedDeliveryDate: undefined, readyForPickUpDate: undefined, pickedUpDate: undefined, payments: [],
        };
    }
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
  }, [order, initialData, form, products]);

  const watchedLineItems = form.watch('lineItems') || [];
  const watchedCustomerId = form.watch('customerId');

  const calculateUnitPrice = (product: Product, customer?: Customer): number => {
    let finalPrice = product.price;
    if (customer?.specificMarkups?.length) {
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
    if (watchedCustomerId && watchedCustomerId !== prevCustomerIdRef.current) {
      const currentCustomer = customers.find(c => c.id === watchedCustomerId);
      const currentItems = form.getValues('lineItems');
      
      currentItems.forEach((item, index) => {
          if (!item.isNonStock && item.productId) {
              const product = products.find(p => p.id === item.productId);
              if (product) {
                  const newUnitPrice = calculateUnitPrice(product, currentCustomer);
                  form.setValue(`lineItems.${index}.unitPrice`, newUnitPrice, { shouldValidate: true });
              }
          }
      });
    }
    prevCustomerIdRef.current = watchedCustomerId;
  }, [watchedCustomerId, customers, products, form]);

  const currentOrderTotal = useMemo(() => {
    return watchedLineItems.reduce((acc, item) => {
      const price = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
      const quantity = item.quantity || 0;
      return acc + (item.isReturn ? -(price * quantity) : (price * quantity));
    }, 0);
  }, [watchedLineItems]);

  const totalPaidFromLocalPayments = useMemo(() => {
    return localPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  }, [localPayments]);

  const balanceDueDisplay = currentOrderTotal - totalPaidFromLocalPayments;

  const handleAddOrUpdatePayment = () => {
    const amount = form.getValues("currentPaymentAmount");
    const date = form.getValues("currentPaymentDate");
    const method = form.getValues("currentPaymentMethod");
    const notes = form.getValues("currentPaymentNotes");

    if (amount && amount > 0 && date && method) {
      if (editingPayment) {
        setLocalPayments(prev => prev.map(p => p.id === editingPayment.id ? { ...editingPayment, date, amount, method, notes } : p));
        setEditingPayment(null);
      } else {
        const newPayment: FormPayment = { id: crypto.randomUUID(), date, amount, method, notes };
        setLocalPayments(prev => [...prev, newPayment]);
      }
      form.reset({
        ...form.getValues(),
        currentPaymentAmount: undefined, currentPaymentDate: undefined,
        currentPaymentMethod: undefined, currentPaymentNotes: '',
      });
      form.clearErrors(["currentPaymentAmount", "currentPaymentDate", "currentPaymentMethod"]);
    } else {
      form.trigger(["currentPaymentAmount", "currentPaymentDate", "currentPaymentMethod"]);
    }
  };

  const handleEditPayment = (paymentToEdit: FormPayment) => {
    setEditingPayment(paymentToEdit);
    form.setValue("currentPaymentAmount", paymentToEdit.amount);
    form.setValue("currentPaymentDate", paymentToEdit.date);
    form.setValue("currentPaymentMethod", paymentToEdit.method);
    form.setValue("currentPaymentNotes", paymentToEdit.notes || '');
  };

  const handleDeletePayment = (paymentId: string) => {
    setLocalPayments(prev => prev.filter(p => p.id !== paymentId));
    if (editingPayment?.id === paymentId) {
      handleCancelEditPayment();
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

  const handleFormSubmit = (data: z.infer<typeof orderFormSchema>) => {
    const paymentsForSubmission: Payment[] = localPayments.map(p => ({
      ...p,
      date: p.date.toISOString(),
    }));

    const formDataForSubmission: OrderFormData = { ...data, payments: paymentsForSubmission };
    delete (formDataForSubmission as any).currentPaymentAmount;
    delete (formDataForSubmission as any).currentPaymentDate;
    delete (formDataForSubmission as any).currentPaymentMethod;
    delete (formDataForSubmission as any).currentPaymentNotes;

    onSubmit(formDataForSubmission);
  };

  const handleCategoryFilterChange = (index: number, valueFromSelect?: string) => {
    const newFilters = [...lineItemCategoryFilters];
    newFilters[index] = valueFromSelect === ALL_CATEGORIES_VALUE ? undefined : valueFromSelect;
    setLineItemCategoryFilters(newFilters);
    form.setValue(`lineItems.${index}.productId`, '', { shouldValidate: true });
    form.setValue(`lineItems.${index}.productName`, '');
    form.setValue(`lineItems.${index}.unitPrice`, 0, { shouldValidate: true });
    form.trigger(`lineItems.${index}.productId`);
  };

  const getFilteredProducts = (index: number) => {
    const category = lineItemCategoryFilters[index];
    return category && category !== ALL_CATEGORIES_VALUE ? products.filter(p => p.category === category) : (products || []);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    const customer = customers.find(c => c.id === form.getValues('customerId'));
    if (product) {
      const unitPrice = calculateUnitPrice(product, customer);
      form.setValue(`lineItems.${index}.productId`, product.id, { shouldValidate: true });
      form.setValue(`lineItems.${index}.productName`, product.name);
      form.setValue(`lineItems.${index}.unitPrice`, unitPrice, { shouldValidate: true });
      const newFilters = [...lineItemCategoryFilters];
      newFilters[index] = product.category;
      setLineItemCategoryFilters(newFilters);
    }
    form.trigger(`lineItems.${index}.productId`);
    form.trigger(`lineItems.${index}.unitPrice`);
  };

  const addLineItem = () => {
    append({ id: crypto.randomUUID(), productId: '', productName: '', quantity: 1, unitPrice: 0, isReturn: false, isNonStock: false, addToProductList: false });
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
      form.setValue(`lineItems.${index}.cost`, 0);
      form.setValue(`lineItems.${index}.markupPercentage`, 0);
    } else {
      form.setValue(`lineItems.${index}.productName`, '');
      form.setValue(`lineItems.${index}.cost`, undefined);
      form.setValue(`lineItems.${index}.markupPercentage`, undefined);
    }
    form.trigger(`lineItems.${index}.productId`);
    form.trigger(`lineItems.${index}.unitPrice`);
  };

  const handleBulkAddItems = (itemsToAdd: Array<{ productId: string; quantity: number }>) => {
    const customer = customers.find(c => c.id === form.getValues('customerId'));
    itemsToAdd.forEach(item => {
      const product = products.find(p => p.id === item.productId);
      if (product) {
        append({
          id: crypto.randomUUID(), productId: item.productId,
          productName: product.name, quantity: item.quantity,
          unitPrice: calculateUnitPrice(product, customer),
          isReturn: false, isNonStock: false,
          addToProductList: false,
        });
        setLineItemCategoryFilters(prev => [...prev, product.category]);
      }
    });
    setIsBulkAddDialogOpen(false);
  };
  
  const handleNonStockPriceChange = (index: number, value: number, field: 'cost' | 'markup' | 'price') => {
    const cost = form.getValues(`lineItems.${index}.cost`) || 0;
    const markup = form.getValues(`lineItems.${index}.markupPercentage`) || 0;
    const price = form.getValues(`lineItems.${index}.unitPrice`) || 0;

    if (field === 'cost') {
        const newPrice = value * (1 + markup / 100);
        form.setValue(`lineItems.${index}.cost`, value);
        form.setValue(`lineItems.${index}.unitPrice`, parseFloat(newPrice.toFixed(2)));
    } else if (field === 'markup') {
        const newPrice = cost * (1 + value / 100);
        form.setValue(`lineItems.${index}.markupPercentage`, value);
        form.setValue(`lineItems.${index}.unitPrice`, parseFloat(newPrice.toFixed(2)));
    } else if (field === 'price') {
        const newMarkup = cost > 0 ? ((value / cost) - 1) * 100 : 0;
        form.setValue(`lineItems.${index}.unitPrice`, value);
        form.setValue(`lineItems.${index}.markupPercentage`, parseFloat(newMarkup.toFixed(2)));
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        <FormField control={form.control} name="orderNumber" render={({ field }) => (
          <FormItem><FormLabel>Order Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <FormField
          control={form.control} name="customerId" render={({ field }) => (
            <FormItem className="flex flex-col"><FormLabel>Customer</FormLabel>
            <div className="flex items-center gap-2">
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
                        const searchableValue = [customer.firstName, customer.lastName, customer.companyName, customer.phone, customer.emailContacts?.map(ec => ec.email).join(' ')].filter(Boolean).join(' ').toLowerCase();
                        return (
                          <CommandItem value={searchableValue} key={customer.id} onSelect={() => form.setValue("customerId", customer.id, { shouldValidate: true })}>
                            <Icon name="Check" className={cn("mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")} />
                            {displayName}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command></PopoverContent>
              </Popover>
               <Button type="button" variant="outline" size="icon" onClick={() => {const c = customers.find(c => c.id === field.value); if(c) onViewCustomer(c)}} disabled={!field.value}><Icon name="UserCog" /></Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField control={form.control} name="poNumber" render={({ field }) => (
          <FormItem><FormLabel>P.O. Number (Optional)</FormLabel><FormControl><Input {...field} placeholder="Customer PO" /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem className="flex flex-col"><FormLabel>Order Date</FormLabel>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>Order Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                <SelectContent>{ORDER_STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
              </Select><FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="orderState" render={({ field }) => (
            <FormItem>
              <FormLabel>Order State</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger></FormControl>
                <SelectContent>{ORDER_STATES.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}</SelectContent>
              </Select><FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="readyForPickUpDate" render={({ field }) => (
          <FormItem className="flex flex-col"><FormLabel>Ready for Pickup (Optional)</FormLabel>
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
        <Separator /><h3 className="text-lg font-medium">Line Items</h3>
        {fields.map((fieldItem, index) => {
            const currentLineItem = watchedLineItems[index];
            const lineTotal = (currentLineItem?.quantity || 0) * (currentLineItem?.unitPrice || 0) * (currentLineItem?.isReturn ? -1 : 1);
            const filteredProductsForLine = getFilteredProducts(index);
            return (<div key={fieldItem.id} className="space-y-3 p-4 border rounded-md relative">
                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeLineItem(index)}>
                  <Icon name="Trash2" className="h-4 w-4 text-destructive" />
                </Button>
                <div className="flex items-center space-x-4">
                    <FormField control={form.control} name={`lineItems.${index}.isReturn`} render={({ field }) => (
                        <FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">Return</FormLabel></FormItem>
                    )} />
                    <FormField control={form.control} name={`lineItems.${index}.isNonStock`} render={({ field }) => (
                        <FormItem className="flex items-center space-x-2"><FormControl><Checkbox checked={field.value} onCheckedChange={checked => handleNonStockToggle(index, !!checked)} /></FormControl><FormLabel className="font-normal">Non-Stock</FormLabel></FormItem>
                    )} />
                </div>
                {currentLineItem?.isNonStock ? (
                    <>
                        <FormField control={form.control} name={`lineItems.${index}.productName`} render={({ field }) => (
                            <FormItem><FormLabel>Product/Service Name</FormLabel><FormControl><Input {...field} placeholder="Enter item name" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name={`lineItems.${index}.cost`} render={({ field }) => (
                                <FormItem><FormLabel>Cost</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => handleNonStockPriceChange(index, parseFloat(e.target.value) || 0, 'cost')} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name={`lineItems.${index}.markupPercentage`} render={({ field }) => (
                                <FormItem><FormLabel>Markup (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => handleNonStockPriceChange(index, parseFloat(e.target.value) || 0, 'markup')} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name={`lineItems.${index}.unitPrice`} render={({ field }) => (
                                <FormItem><FormLabel>Unit Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} onChange={e => handleNonStockPriceChange(index, parseFloat(e.target.value) || 0, 'price')} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField
                            control={form.control}
                            name={`lineItems.${index}.addToProductList`}
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-2 pt-2">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel className="font-normal">Add this item to the main product list</FormLabel>
                                </FormItem>
                            )}
                        />
                        {currentLineItem.addToProductList && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 ml-2">
                            <FormField control={form.control} name={`lineItems.${index}.newProductCategory`} render={({ field }) => (
                                <FormItem><FormLabel>New Product Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                                    <SelectContent>{productCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name={`lineItems.${index}.unit`} render={({ field }) => (
                                <FormItem><FormLabel>Unit</FormLabel><FormControl><Input {...field} placeholder="e.g., piece, hour" /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        )}
                    </>
                ) : (
                    <><FormItem><FormLabel>Category Filter</FormLabel>
                        <Select value={lineItemCategoryFilters[index] || ALL_CATEGORIES_VALUE} onValueChange={value => handleCategoryFilterChange(index, value)}>
                            <FormControl><SelectTrigger><SelectValue placeholder="All Categories" /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value={ALL_CATEGORIES_VALUE}>All Categories</SelectItem>{productCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                        </Select>
                    </FormItem>
                    <FormField control={form.control} name={`lineItems.${index}.productId`} render={({ field }) => (
                        <FormItem className="flex flex-col"><FormLabel>Product</FormLabel>
                            <Popover><PopoverTrigger asChild><FormControl>
                                <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                    {field.value && products.length > 0 ? products.find(p => p.id === field.value)?.name : "Select product"}
                                    <Icon name="ChevronsUpDown" className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl></PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command>
                                <CommandInput placeholder="Search product..." />
                                <CommandList><CommandEmpty>No product found.</CommandEmpty>
                                    <CommandGroup>{filteredProductsForLine.map(p => (
                                        <CommandItem value={p.name} key={p.id} onSelect={() => handleProductSelect(index, p.id)}>
                                            <Icon name="Check" className={cn("mr-2 h-4 w-4", p.id === field.value ? "opacity-100" : "opacity-0")} />
                                            {p.name}
                                        </CommandItem>
                                    ))}</CommandGroup>
                                </CommandList>
                            </Command></PopoverContent></Popover><FormMessage />
                        </FormItem>
                    )} /></>
                )}
                <div className="grid grid-cols-3 gap-4 items-end">
                    <FormField control={form.control} name={`lineItems.${index}.unitPrice`} render={({ field }) => (
                        <FormItem><FormLabel>Unit Price</FormLabel><FormControl><Input type="number" step="0.01" {...field} placeholder="0.00" disabled={!currentLineItem?.isNonStock} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field }) => (
                        <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} min="1" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormItem><FormLabel>Line Total</FormLabel><Input type="text" readOnly value={`$${lineTotal.toFixed(2)}`} className={cn("bg-muted font-semibold", currentLineItem?.isReturn && "text-destructive")} /></FormItem>
                </div>
            </div>);
        })}
        <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={addLineItem}><Icon name="PlusCircle" className="mr-2 h-4 w-4" /> Add Item</Button>
            <Button type="button" variant="outline" onClick={() => setIsBulkAddDialogOpen(true)}><Icon name="Layers" className="mr-2 h-4 w-4" /> Bulk Add Items</Button>
        </div>
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
                    <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="currentPaymentDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Date</FormLabel>
                        <Popover><PopoverTrigger asChild><FormControl>
                            <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>} <Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl></PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                        </Popover><FormMessage />
                    </FormItem>
                )} />
            </div>
            <FormField control={form.control} name="currentPaymentMethod" render={({ field }) => (
                <FormItem><FormLabel>Method</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ""}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select><FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="currentPaymentNotes" render={({ field }) => (
              <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="e.g., Deposit" {...field} rows={2} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex gap-2">
                <Button type="button" onClick={handleAddOrUpdatePayment}>
                    {editingPayment ? <><Icon name="Check" className="mr-2 h-4 w-4" />Update Payment</> : <><Icon name="PlusCircle" className="mr-2 h-4 w-4" />Add Payment</>}
                </Button>
                {editingPayment && <Button type="button" variant="outline" onClick={handleCancelEditPayment}>Cancel Edit</Button>}
            </div>
        </div>

        <Separator />
        <div className="space-y-2 text-right font-medium">
            <div>Order Total: <span className="font-semibold">${currentOrderTotal.toFixed(2)}</span></div>
            {totalPaidFromLocalPayments > 0 && <div>Total Paid: <span className="text-green-600">(${totalPaidFromLocalPayments.toFixed(2)})</span></div>}
            <div className="text-lg">Balance Due: <span className="font-bold">${balanceDueDisplay.toFixed(2)}</span></div>
        </div>
        <Separator />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Order Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Additional notes for the order..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end gap-2 pt-4">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit">{order || initialData ? 'Save Changes' : 'Create Order'}</Button>
        </div>
      </form>
       {isBulkAddDialogOpen && (
        <BulkAddProductsDialog isOpen={isBulkAddDialogOpen} onOpenChange={setIsBulkAddDialogOpen} products={products} productCategories={productCategories} onAddItems={handleBulkAddItems} />
      )}
    </Form>
  );
}

    