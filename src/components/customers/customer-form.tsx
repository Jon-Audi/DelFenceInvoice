
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

const customerSchema = z.object({
  companyName: z.string().trim().optional(),
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  credit: z.object({
    terms: z.string().optional(),
    limit: z.coerce.number().optional(),
    balance: z.coerce.number().optional(),
    onHold: z.boolean().optional(),
  }).optional(),
  notes: z.string().optional(),
}).refine(data => (data.companyName && data.companyName.length > 0) || (data.firstName && data.firstName.length > 0), {
  message: "Either Company Name or First Name must be provided.",
  path: ["companyName"], // Assign error to companyName for visibility
});


type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: CustomerFormData) => void;
  onClose?: () => void;
}

export function CustomerForm({ customer, onSubmit, onClose }: CustomerFormProps) {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer ? {
      ...customer,
      address: customer.address || {},
      credit: customer.credit || {},
      tags: customer.tags || [],
    } : {
      companyName: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: { line1: '', line2: '', city: '', state: '', zip: '' },
      tags: [],
      credit: { terms: '', limit: 0, balance: 0, onHold: false },
      notes: '',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="companyName" render={({ field }) => (
          <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="firstName" render={({ field }) => (
            <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
           <FormField control={form.control} name="lastName" render={({ field }) => (
            <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>
        
        <Separator />
        <h3 className="text-lg font-medium">Address</h3>
        <FormField control={form.control} name="address.line1" render={({ field }) => (
          <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField control={form.control} name="address.city" render={({ field }) => (
            <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="address.state" render={({ field }) => (
            <FormItem><FormLabel>State</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="address.zip" render={({ field }) => (
            <FormItem><FormLabel>Zip Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        <Separator />
        <h3 className="text-lg font-medium">Credit Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="credit.terms" render={({ field }) => (
            <FormItem><FormLabel>Terms</FormLabel><FormControl><Input {...field} placeholder="e.g., NET 30" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="credit.limit" render={({ field }) => (
            <FormItem><FormLabel>Credit Limit</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
         <FormField control={form.control} name="credit.onHold" render={({ field }) => (
          <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel>On Credit Hold</FormLabel>
            </div>
          </FormItem>
        )} />
        
        <Separator />

        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Internal notes about the customer" {...field} /></FormControl><FormMessage /></FormItem>
        )} />

        <div className="flex justify-end gap-2 pt-4">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>}
          <Button type="submit">{customer ? 'Save Changes' : 'Create Customer'}</Button>
        </div>
      </form>
    </Form>
  );
}

    