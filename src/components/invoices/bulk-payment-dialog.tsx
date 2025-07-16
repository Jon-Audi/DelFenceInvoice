
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Customer, Invoice, PaymentMethod } from '@/types';
import { PAYMENT_METHODS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Icon } from '@/components/icons';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Checkbox } from '../ui/checkbox';

const bulkPaymentSchema = z.object({
  customerId: z.string().min(1, 'A customer must be selected.'),
  paymentAmount: z.coerce.number().positive('Payment amount must be greater than zero.'),
  paymentDate: z.date({ required_error: 'Payment date is required.' }),
  paymentMethod: z.enum(PAYMENT_METHODS as [PaymentMethod, ...PaymentMethod[]]),
  paymentNotes: z.string().optional(),
  selectedInvoiceIds: z.array(z.string()).min(1, 'At least one invoice must be selected.'),
});

type BulkPaymentFormData = z.infer<typeof bulkPaymentSchema>;

interface BulkPaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  onSave: (customerId: string, paymentDetails: any, invoiceIds: string[]) => void;
}

export function BulkPaymentDialog({ isOpen, onOpenChange, customers, onSave }: BulkPaymentDialogProps) {
  const [outstandingInvoices, setOutstandingInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);

  const form = useForm<BulkPaymentFormData>({
    resolver: zodResolver(bulkPaymentSchema),
    defaultValues: {
      customerId: '',
      paymentAmount: 0,
      paymentDate: new Date(),
      paymentMethod: 'Check',
      paymentNotes: '',
      selectedInvoiceIds: [],
    },
  });

  const selectedCustomerId = form.watch('customerId');
  const selectedInvoiceIds = form.watch('selectedInvoiceIds');

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!selectedCustomerId) {
        setOutstandingInvoices([]);
        form.setValue('selectedInvoiceIds', []);
        return;
      }
      setIsLoadingInvoices(true);
      try {
        const invoicesRef = collection(db, 'invoices');
        const q = query(
          invoicesRef,
          where('customerId', '==', selectedCustomerId),
          where('status', 'in', ['Sent', 'Partially Paid', 'Draft']), // Included Draft
          where('balanceDue', '>', 0),
          orderBy('date', 'asc')
        );
        const snapshot = await getDocs(q);
        const fetchedInvoices: Invoice[] = [];
        snapshot.forEach((doc) => fetchedInvoices.push({ id: doc.id, ...doc.data() } as Invoice));
        setOutstandingInvoices(fetchedInvoices);
        form.setValue('selectedInvoiceIds', fetchedInvoices.map(inv => inv.id!));
      } catch (error) {
        console.error('Error fetching outstanding invoices:', error);
        setOutstandingInvoices([]);
      } finally {
        setIsLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, [selectedCustomerId, form]);

  const totalBalanceDue = useMemo(() => {
    return outstandingInvoices
        .filter(inv => selectedInvoiceIds.includes(inv.id!))
        .reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
  }, [outstandingInvoices, selectedInvoiceIds]);


  const handleSubmit = (data: BulkPaymentFormData) => {
    const paymentDetails = {
      amount: data.paymentAmount,
      date: data.paymentDate.toISOString(),
      method: data.paymentMethod,
      notes: data.paymentNotes,
    };
    onSave(data.customerId, paymentDetails, data.selectedInvoiceIds);
  };
  
  const handleSelectAll = (checked: boolean) => {
    form.setValue('selectedInvoiceIds', checked ? outstandingInvoices.map(inv => inv.id!) : []);
  };

  const isAllSelected = outstandingInvoices.length > 0 && selectedInvoiceIds.length === outstandingInvoices.length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record Bulk Payment</DialogTitle>
          <DialogDescription>Apply a single payment to multiple outstanding invoices for a customer.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Customer</FormLabel>
                   <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                        >
                          {field.value
                            ? customers.find((c) => c.id === field.value)?.companyName ||
                              `${customers.find((c) => c.id === field.value)?.firstName} ${
                                customers.find((c) => c.id === field.value)?.lastName
                              }`
                            : "Select a customer"}
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
                                value={customer.companyName || `${customer.firstName} ${customer.lastName}`}
                                key={customer.id}
                                onSelect={() => {
                                  form.setValue("customerId", customer.id);
                                  setIsCustomerPopoverOpen(false);
                                }}
                              >
                                <Icon name="Check" className={cn("mr-2 h-4 w-4", customer.id === field.value ? "opacity-100" : "opacity-0")} />
                                {customer.companyName || `${customer.firstName} ${customer.lastName}`}
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

            {selectedCustomerId && (
              <>
                <div className="grid md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="paymentAmount" render={({ field }) => (
                      <FormItem><FormLabel>Payment Amount</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="paymentDate" render={({ field }) => (
                      <FormItem className="flex flex-col"><FormLabel>Payment Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal",!field.value && "text-muted-foreground")}>{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}<Icon name="Calendar" className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                      <FormItem><FormLabel>Payment Method</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl><SelectContent>{PAYMENT_METHODS.map(method => <SelectItem key={method} value={method}>{method}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )} />
                </div>
                 <FormField control={form.control} name="paymentNotes" render={({ field }) => (
                    <FormItem><FormLabel>Notes (e.g., Check #)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <Separator />
                <Label>Outstanding Invoices</Label>
                <div className="rounded-md border">
                  <ScrollArea className="h-48">
                    {isLoadingInvoices ? (
                        <div className="p-4 text-center">Loading invoices...</div>
                    ) : outstandingInvoices.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">
                              <Checkbox
                                checked={isAllSelected}
                                onCheckedChange={handleSelectAll}
                                aria-label="Select all invoices"
                              />
                            </TableHead>
                            <TableHead>Inv #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Balance Due</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {outstandingInvoices.map((invoice) => (
                            <TableRow key={invoice.id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedInvoiceIds.includes(invoice.id!)}
                                  onCheckedChange={(checked) => {
                                    const newIds = checked
                                      ? [...selectedInvoiceIds, invoice.id!]
                                      : selectedInvoiceIds.filter((id) => id !== invoice.id);
                                    form.setValue('selectedInvoiceIds', newIds);
                                  }}
                                />
                              </TableCell>
                              <TableCell>{invoice.invoiceNumber}</TableCell>
                              <TableCell>{format(new Date(invoice.date), 'MM/dd/yy')}</TableCell>
                              <TableCell className="text-right">${(invoice.balanceDue || 0).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="p-4 text-center text-muted-foreground">No outstanding invoices for this customer.</p>
                    )}
                  </ScrollArea>
                </div>
                <div className="text-right font-semibold">
                    Total Selected Balance: ${totalBalanceDue.toFixed(2)}
                </div>
                <FormField control={form.control} name="selectedInvoiceIds" render={() => <FormMessage />} />
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoadingInvoices || outstandingInvoices.length === 0}>Apply Payment</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
