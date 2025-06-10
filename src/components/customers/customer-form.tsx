
"use client";

import React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Customer, CustomerType, EmailContactType, CustomerSpecificMarkup, ProductCategory } from '@/types';
import { CUSTOMER_TYPES, EMAIL_CONTACT_TYPES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Icon } from '@/components/icons';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from '@/components/ui/separator';

const emailContactSchema = z.object({
  id: z.string().optional(),
  type: z.enum(EMAIL_CONTACT_TYPES as [EmailContactType, ...EmailContactType[]]),
  email: z.string().email("Invalid email address"),
  name: z.string().optional(),
});

const specificMarkupSchema = z.object({
  id: z.string(), // Required for useFieldArray key
  categoryName: z.string().min(1, "Category is required"),
  markupPercentage: z.coerce.number().min(0, "Markup must be non-negative"),
});

const customerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  companyName: z.string().optional(),
  phone: z.string().min(1, "Phone number is required"),
  customerType: z.enum(CUSTOMER_TYPES as [CustomerType, ...CustomerType[]]),
  emailContacts: z.array(emailContactSchema).min(1, "At least one email contact is required"),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
  specificMarkups: z.array(specificMarkupSchema).optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: CustomerFormData) => void;
  onClose?: () => void;
  productCategories: ProductCategory[];
}

export function CustomerForm({ customer, onSubmit, onClose, productCategories = [] }: CustomerFormProps) {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer ? {
      ...customer,
      emailContacts: customer.emailContacts.map(ec => ({...ec, id: ec.id || crypto.randomUUID()})),
      specificMarkups: customer.specificMarkups?.map(sm => ({...sm, id: sm.id || crypto.randomUUID() })) || [],
    } : {
      firstName: '',
      lastName: '',
      companyName: '',
      phone: '',
      customerType: CUSTOMER_TYPES[0],
      emailContacts: [{ id: crypto.randomUUID(), type: EMAIL_CONTACT_TYPES[0], email: '', name: '' }],
      address: { street: '', city: '', state: '', zip: '' },
      notes: '',
      specificMarkups: [],
    },
  });

  const { fields: emailFields, append: appendEmail, remove: removeEmail } = useFieldArray({
    control: form.control,
    name: "emailContacts",
  });

  const { fields: markupFields, append: appendMarkup, remove: removeMarkup } = useFieldArray({
    control: form.control,
    name: "specificMarkups",
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="firstName" render={({ field }) => (
            <FormItem><FormLabel>First Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="lastName" render={({ field }) => (
            <FormItem><FormLabel>Last Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="companyName" render={({ field }) => (
          <FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="customerType" render={({ field }) => (
            <FormItem>
              <FormLabel>Customer Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                <SelectContent>{CUSTOMER_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        
        <Separator />
        <h3 className="text-lg font-medium">Email Contacts</h3>
        {emailFields.map((item, index) => (
          <div key={item.id} className="space-y-2 p-3 border rounded-md relative">
            {emailFields.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => removeEmail(index)}>
                <Icon name="Trash2" className="h-4 w-4 text-destructive" />
              </Button>
            )}
            <FormField control={form.control} name={`emailContacts.${index}.type`} render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                  <SelectContent>{EMAIL_CONTACT_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name={`emailContacts.${index}.email`} render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name={`emailContacts.${index}.name`} render={({ field }) => (
              <FormItem><FormLabel>Contact Name (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => appendEmail({ id: crypto.randomUUID(), type: EMAIL_CONTACT_TYPES[0], email: '', name: '' })}>
          <Icon name="PlusCircle" className="mr-2 h-4 w-4" /> Add Email Contact
        </Button>

        <Separator />
        <h3 className="text-lg font-medium">Address (Optional)</h3>
        <FormField control={form.control} name="address.street" render={({ field }) => (
          <FormItem><FormLabel>Street</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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
        <h3 className="text-lg font-medium">Customer Specific Markups (Optional)</h3>
        {markupFields.map((item, index) => (
          <div key={item.id} className="space-y-3 p-4 border rounded-md relative">
            <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7" onClick={() => removeMarkup(index)}>
              <Icon name="Trash2" className="h-4 w-4 text-destructive" />
            </Button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <FormField control={form.control} name={`specificMarkups.${index}.categoryName`} render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(productCategories || []).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name={`specificMarkups.${index}.markupPercentage`} render={({ field }) => (
                <FormItem>
                  <FormLabel>Markup (%)</FormLabel>
                  <FormControl><Input type="number" step="0.01" min="0" {...field} placeholder="e.g., 10 for 10%" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => appendMarkup({ id: crypto.randomUUID(), categoryName: '', markupPercentage: 0 })}>
          <Icon name="PlusCircle" className="mr-2 h-4 w-4" /> Add Specific Markup Rule
        </Button>
        {form.formState.errors.specificMarkups && !form.formState.errors.specificMarkups.root && !markupFields.length && (
             <p className="text-sm font-medium text-destructive">{form.formState.errors.specificMarkups.message}</p>
        )}

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
