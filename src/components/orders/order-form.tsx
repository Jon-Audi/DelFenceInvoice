
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Order, DocumentStatus, Customer, Product } from '@/types';
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

const ORDER_STATUSES: Extract<DocumentStatus, 'Draft' | 'Ordered' | 'Ready for pick up' | 'Picked up' | 'Invoiced' | 'Voided'>[] = ['Draft', 'Ordered', 'Ready for pick up', 'Picked up', 'Invoiced', 'Voided'];
const ORDER_STATES: Order['orderState'][] = ['Open', 'Closed'];


const orderFormSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  customerId: z.string().min(1, "Customer is required"),
  customerName: z.string().optional(), // Auto-filled for display
  date: z.date({ required_error: "Order date is required." }),
  total: z.coerce.number().min(0, "Total must be a positive number"),
  status: z.enum(ORDER_STATUSES as [typeof ORDER_STATUSES[0], ...typeof ORDER_STATUSES]),
  orderState: z.enum(ORDER_STATES as [typeof ORDER_STATES[0], ...typeof ORDER_STATES]),
  expectedDeliveryDate: z.date().optional(),
  readyForPickUpDate: z.date().optional(),
  pickedUpDate: z.date().optional(),
  lineItemsDescription: z.string().optional().describe("A brief description of items or services."), // Will be replaced by line item editor
  notes: z.string().optional(),
});

export type OrderFormData = z.infer<typeof orderFormSchema>;

interface OrderFormProps {
  order?: Order;
  onSubmit: (data: OrderFormData) => void;
  onClose?: () => void;
  customers: Customer[];
  // products: Product[]; // Uncomment for line item editor
}

export function OrderForm({ order, onSubmit, onClose, customers /*, products */ }: OrderFormProps) {
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: order ? {
      ...order,
      date: new Date(order.date),
      expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : undefined,
      readyForPickUpDate: order.readyForPickUpDate ? new Date(order.readyForPickUpDate) : undefined,
      pickedUpDate: order.pickedUpDate ? new Date(order.pickedUpDate) : undefined,
      customerId: order.customerId || '',
      customerName: order.customerName || '',
      lineItemsDescription: order.lineItems.map(li => `${li.productName} (Qty: ${li.quantity})`).join('\n') || '',
    } : {
      orderNumber: `ORD-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100).padStart(3, '0')}`,
      customerId: '',
      customerName: '',
      date: new Date(),
      total: 0,
      status: 'Draft',
      orderState: 'Open',
      lineItemsDescription: '',
      notes: '',
    },
  });

  const handleSubmit = (data: OrderFormData) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
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

        <FormField control={form.control} name="total" render={({ field }) => (
          <FormItem><FormLabel>Total Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
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

        <FormField control={form.control} name="lineItemsDescription" render={({ field }) => ( // This will be replaced by a line item editor later
            <FormItem><FormLabel>Items/Services Description</FormLabel><FormControl><Textarea placeholder="Describe items or services ordered..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes (Optional)</FormLabel><FormControl><Textarea placeholder="Additional notes for the order..." {...field} rows={3} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="flex justify-end gap-2 pt-4">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit">{order ? 'Save Changes' : 'Create Order'}</Button>
        </div>
      </form>
    </Form>
  );
}
