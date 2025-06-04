
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { CustomerTable } from '@/components/customers/customer-table';
import { CustomerDialog } from '@/components/customers/customer-dialog';
import type { Customer, CustomerType, EmailContactType } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { CUSTOMER_TYPES, EMAIL_CONTACT_TYPES } from '@/lib/constants';
import { MOCK_CUSTOMERS } from '@/lib/mock-data';


export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSaveCustomer = (customerToSave: Customer) => {
    setCustomers(prevCustomers => {
      const index = prevCustomers.findIndex(c => c.id === customerToSave.id);
      if (index !== -1) {
        // Edit existing customer
        const updatedCustomers = [...prevCustomers];
        updatedCustomers[index] = customerToSave;
        toast({
          title: "Customer Updated",
          description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been updated.`,
        });
        return updatedCustomers;
      } else {
        // Add new customer
        toast({
          title: "Customer Added",
          description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been added.`,
        });
        return [...prevCustomers, { ...customerToSave, id: customerToSave.id || crypto.randomUUID() }];
      }
    });
  };

  const handleDeleteCustomer = (customerId: string) => {
    setCustomers(prevCustomers => prevCustomers.filter(c => c.id !== customerId));
    toast({
      title: "Customer Deleted",
      description: "The customer has been removed.",
      variant: "default",
    });
  };

  const parseCsvToCustomers = (csvData: string): Customer[] => {
    const newCustomers: Customer[] = [];
    const lines = csvData.trim().split('\n');
    const lineCount = lines.length;

    if (lineCount < 2) {
      toast({ title: "Error", description: "CSV file is empty or has no data rows.", variant: "destructive" });
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const expectedHeaders = ['firstname', 'lastname', 'companyname', 'phone', 'primaryemail', 'primaryemailtype', 'customertype', 'addressstreet', 'addresscity', 'addressstate', 'addresszip', 'notes'];
    
    const receivedHeadersSet = new Set(headers);
    const missingRequiredHeaders = ['firstname', 'lastname'].filter(eh => !receivedHeadersSet.has(eh));

    if (missingRequiredHeaders.length > 0) {
        toast({ 
            title: "CSV Header Error", 
            description: `CSV file is missing required headers: ${missingRequiredHeaders.join(', ')}. Expected headers (case-insensitive): ${expectedHeaders.join(', ')}. Please ensure your CSV matches this format.`, 
            variant: "destructive",
            duration: 10000,
        });
        return [];
    }


    for (let i = 1; i < lineCount; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const customerData: any = {};
      lines[0].split(',').map(h => h.trim().toLowerCase()).forEach((header, index) => {
        customerData[header] = values[index];
      });


      if (!customerData.firstname || !customerData.lastname) {
        console.warn(`Skipping row ${i+1}: missing firstName or lastName.`);
        continue; 
      }
      
      const emailType = EMAIL_CONTACT_TYPES.find(et => et.toLowerCase() === (customerData.primaryemailtype || '').toLowerCase()) || EMAIL_CONTACT_TYPES[0];
      const custType = CUSTOMER_TYPES.find(ct => ct.toLowerCase() === (customerData.customertype || '').toLowerCase()) || CUSTOMER_TYPES[0];


      const newCustomer: Customer = {
        id: crypto.randomUUID(),
        firstName: customerData.firstname || '',
        lastName: customerData.lastname || '',
        companyName: customerData.companyname || undefined,
        phone: customerData.phone || '',
        emailContacts: customerData.primaryemail ? [{
          id: crypto.randomUUID(),
          type: emailType as EmailContactType,
          email: customerData.primaryemail,
          name: `${customerData.firstname} ${customerData.lastname}`
        }] : [],
        customerType: custType as CustomerType,
        address: (customerData.addressstreet || customerData.addresscity || customerData.addressstate || customerData.addresszip) ? {
          street: customerData.addressstreet || '',
          city: customerData.addresscity || '',
          state: customerData.addressstate || '',
          zip: customerData.addresszip || '',
        } : undefined,
        notes: customerData.notes || undefined,
      };
      newCustomers.push(newCustomer);
    }
    return newCustomers;
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvData = e.target?.result as string;
      if (csvData) {
        try {
          const parsedCustomers = parseCsvToCustomers(csvData);
          if (parsedCustomers.length > 0) {
            setCustomers(prev => [...prev, ...parsedCustomers]);
            toast({
              title: "Success",
              description: `${parsedCustomers.length} customers imported successfully.`,
            });
          } else if (csvData.trim().split('\n').length >=2 && parseCsvToCustomers(csvData).length === 0) { 
             // This condition is met if headers were incorrect or no valid data rows after header check
          } else if (csvData.trim().split('\n').length <2) {
            // Already handled by parseCsvToCustomers initial check
          } else {
             toast({
              title: "Info",
              description: "No new customers were imported. Check CSV file content and ensure it has data rows.",
              duration: 7000,
            });
          }
        } catch (error) {
          console.error("Error parsing CSV:", error);
          toast({
            title: "Error Parsing CSV",
            description: "Failed to parse CSV file. Please check the file format, content, and ensure it meets header requirements (e.g., firstName, lastName).",
            variant: "destructive",
            duration: 10000,
          });
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast({ title: "Error", description: "Failed to read the file.", variant: "destructive" });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <>
      <PageHeader title="Customers" description="Manage your customer database.">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".csv"
            onChange={handleFileChange}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Icon name="Upload" className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <CustomerDialog
            triggerButton={
              <Button>
                <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            }
            onSave={handleSaveCustomer}
          />
        </div>
      </PageHeader>
      <CustomerTable customers={customers} onSave={handleSaveCustomer} onDelete={handleDeleteCustomer} />
    </>
  );
}
