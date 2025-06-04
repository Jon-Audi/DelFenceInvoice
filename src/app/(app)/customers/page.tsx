
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

// Initial mock data for customers
const initialMockCustomers: Customer[] = [
  {
    id: 'cust_1',
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'Doe Fencing Co.',
    phone: '555-1234',
    emailContacts: [{ id: 'ec_1', type: 'Main Contact', email: 'john.doe@doefencing.com' }],
    customerType: 'Fence Contractor',
    address: { street: '123 Main St', city: 'Anytown', state: 'DE', zip: '19901' }
  },
  {
    id: 'cust_2',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '555-5678',
    emailContacts: [
      { id: 'ec_2', type: 'Main Contact', email: 'jane.smith@example.com' },
      { id: 'ec_3', type: 'Billing', email: 'billing@jsmithscapes.com' }
    ],
    customerType: 'Landscaper',
    companyName: 'J. Smith Landscaping',
    address: { street: '456 Oak Ave', city: 'Anycity', state: 'DE', zip: '19902' }
  },
  {
    id: 'cust_3',
    firstName: 'Robert',
    lastName: 'Johnson',
    phone: '555-9101',
    emailContacts: [{ id: 'ec_4', type: 'Main Contact', email: 'robert.johnson@email.com' }],
    customerType: 'Home Owner',
  },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(initialMockCustomers);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSaveCustomer = (customerToSave: Customer) => {
    setCustomers(prevCustomers => {
      const index = prevCustomers.findIndex(c => c.id === customerToSave.id);
      if (index !== -1) {
        // Edit existing customer
        const updatedCustomers = [...prevCustomers];
        updatedCustomers[index] = customerToSave;
        return updatedCustomers;
      } else {
        // Add new customer
        return [...prevCustomers, customerToSave];
      }
    });
    toast({
      title: "Success",
      description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} saved.`,
    });
  };

  const parseCsvToCustomers = (csvData: string): Customer[] => {
    const newCustomers: Customer[] = [];
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) {
      toast({ title: "Error", description: "CSV file is empty or has no data rows.", variant: "destructive" });
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const expectedHeaders = ['firstName', 'lastName', 'companyName', 'phone', 'primaryEmail', 'primaryEmailType', 'customerType', 'addressStreet', 'addressCity', 'addressState', 'addressZip'];
    
    // Basic header validation
    const missingHeaders = expectedHeaders.filter(eh => !headers.includes(eh) && (eh === 'firstName' || eh === 'lastName' || eh === 'primaryEmail' || eh === 'phone'));
    if (missingHeaders.length > 0 && (missingHeaders.includes('firstName') || missingHeaders.includes('lastName'))) {
        toast({ title: "Error", description: `CSV file is missing required headers: ${missingHeaders.join(', ')}. Required: firstName, lastName.`, variant: "destructive"});
        return [];
    }


    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const customerData: any = {};
      headers.forEach((header, index) => {
        customerData[header] = values[index];
      });

      if (!customerData.firstName || !customerData.lastName) {
        console.warn(`Skipping row ${i+1}: missing firstName or lastName.`);
        continue; 
      }
      
      const emailType = EMAIL_CONTACT_TYPES.includes(customerData.primaryEmailType as EmailContactType) 
                          ? customerData.primaryEmailType 
                          : EMAIL_CONTACT_TYPES[0];
      const custType = CUSTOMER_TYPES.includes(customerData.customerType as CustomerType)
                          ? customerData.customerType
                          : CUSTOMER_TYPES[0];

      const newCustomer: Customer = {
        id: crypto.randomUUID(),
        firstName: customerData.firstName || '',
        lastName: customerData.lastName || '',
        companyName: customerData.companyName || undefined,
        phone: customerData.phone || '',
        emailContacts: customerData.primaryEmail ? [{
          id: crypto.randomUUID(),
          type: emailType as EmailContactType,
          email: customerData.primaryEmail,
          name: `${customerData.firstName} ${customerData.lastName}`
        }] : [],
        customerType: custType as CustomerType,
        address: (customerData.addressStreet || customerData.addressCity || customerData.addressState || customerData.addressZip) ? {
          street: customerData.addressStreet || '',
          city: customerData.addressCity || '',
          state: customerData.addressState || '',
          zip: customerData.addressZip || '',
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
          } else if (lines.length >=2) { // if lines.length < 2, parseCsvToCustomers already toasted
             toast({
              title: "Info",
              description: "No new customers were imported. Check CSV format or content.",
            });
          }
        } catch (error) {
          console.error("Error parsing CSV:", error);
          toast({
            title: "Error",
            description: "Failed to parse CSV file. Please check the file format and content.",
            variant: "destructive",
          });
        }
      }
      // Reset file input to allow uploading the same file again
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
      <CustomerTable customers={customers} onSave={handleSaveCustomer} />
    </>
  );
}

    