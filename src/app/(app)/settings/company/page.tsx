
"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { CompanySettings } from '@/types';
import { Icon } from '@/components/icons';

const companySettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional().default("USA"),
  phone: z.string().optional(),
  email: z.string().email({ message: "Invalid email address" }).optional().or(z.literal('')),
  website: z.string().url({ message: "Invalid URL" }).optional().or(z.literal('')),
  taxId: z.string().optional(),
});

type CompanySettingsFormData = z.infer<typeof companySettingsSchema>;

const COMPANY_SETTINGS_DOC_ID = "main"; // Fixed ID for the company settings document

export default function CompanySettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<CompanySettingsFormData>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      companyName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
      phone: '',
      email: '',
      website: '',
      taxId: '',
    },
  });

  useEffect(() => {
    const fetchCompanySettings = async () => {
      setIsLoading(true);
      try {
        const docRef = doc(db, 'companySettings', COMPANY_SETTINGS_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as CompanySettings;
          form.reset(data);
        } else {
          // No settings found, form will use defaultValues
          console.log("No company settings document found, using defaults.");
        }
      } catch (error) {
        console.error("Error fetching company settings:", error);
        toast({
          title: "Error Loading Settings",
          description: "Could not load company settings. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchCompanySettings();
  }, [form, toast]);

  const onSubmit = async (data: CompanySettingsFormData) => {
    setIsLoading(true);
    try {
      const docRef = doc(db, 'companySettings', COMPANY_SETTINGS_DOC_ID);
      await setDoc(docRef, data, { merge: true }); // merge: true to avoid overwriting fields not in form
      toast({
        title: "Settings Saved",
        description: "Company information has been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving company settings:", error);
      toast({
        title: "Error Saving Settings",
        description: "Could not save company settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && form.formState.isLoading) { // Show loading while fetching data for the first time
    return (
      <PageHeader title="Company Information" description="Manage your company's details.">
         <div className="flex items-center justify-center h-64">
           <Icon name="Loader2" className="h-10 w-10 animate-spin text-primary" />
           <p className="ml-4 text-muted-foreground">Loading company settings...</p>
         </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="Company Information" description="Manage your company's details for estimates, invoices, and general use." />
      <Card>
        <CardHeader>
          <CardTitle>Company Details</CardTitle>
          <CardDescription>This information will be used throughout the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem><FormLabel>Company Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="website" render={({ field }) => (
                <FormItem><FormLabel>Website</FormLabel><FormControl><Input type="url" placeholder="https://example.com" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              
              <h3 className="text-lg font-medium pt-4 border-t mt-6">Address</h3>
              <FormField control={form.control} name="addressLine1" render={({ field }) => (
                <FormItem><FormLabel>Address Line 1</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="addressLine2" render={({ field }) => (
                <FormItem><FormLabel>Address Line 2</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem><FormLabel>State / Province</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="zipCode" render={({ field }) => (
                  <FormItem><FormLabel>ZIP / Postal Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <h3 className="text-lg font-medium pt-4 border-t mt-6">Tax Information</h3>
               <FormField control={form.control} name="taxId" render={({ field }) => (
                <FormItem><FormLabel>Tax ID / VAT Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading || form.formState.isSubmitting}>
                  { (isLoading || form.formState.isSubmitting) && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
