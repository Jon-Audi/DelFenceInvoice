
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
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, writeBatch } from 'firebase/firestore';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const fetchedCustomers: Customer[] = [];
      snapshot.forEach((docSnap) => {
        const customerData = docSnap.data() as Omit<Customer, 'id'>;
        fetchedCustomers.push({ ...customerData, id: docSnap.id });
      });
      setCustomers(fetchedCustomers.sort((a, b) => (a.companyName || `${a.firstName} ${a.lastName}`).localeCompare(b.companyName || `${b.firstName} ${b.lastName}`)));
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching customers:", error);
      toast({
        title: "Error Fetching Data",
        description: "Could not fetch customers. Please check your Firestore rules and connectivity.",
        variant: "destructive",
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleSaveCustomer = async (customerToSave: Customer) => {
    const { id, ...customerData } = customerToSave;

    try {
      if (id && customers.some(c => c.id === id)) {
        // Edit existing customer
        const customerRef = doc(db, 'customers', id);
        await setDoc(customerRef, customerData, { merge: true }); 
        toast({
          title: "Customer Updated",
          description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been updated.`,
        });
      } else {
        // Add new customer
        const docRef = await addDoc(collection(db, 'customers'), customerData);
        toast({
          title: "Customer Added",
          description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been added with ID: ${docRef.id}.`,
        });
      }
    } catch (error) {
      console.error("Error saving customer:", error);
      toast({
        title: "Error",
        description: "Could not save customer to database.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await deleteDoc(doc(db, 'customers', customerId));
      toast({
        title: "Customer Deleted",
        description: "The customer has been removed.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({
        title: "Error",
        description: "Could not delete customer from database.",
        variant: "destructive",
      });
    }
  };

  const parseCsvToCustomers = (csvData: string): Omit<Customer, 'id'>[] => {
    const newCustomersData: Omit<Customer, 'id'>[] = [];
    const lines = csvData.trim().split('\n');
    const lineCount = lines.length;

    if (lineCount < 2) {
      toast({ title: "Error", description: "CSV file is empty or has no data rows.", variant: "destructive" });
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '')); 
    const expectedHeaders = ['firstname', 'lastname', 'companyname', 'phone', 'primaryemail', 'primaryemailtype', 'customertype', 'addressstreet', 'addresscity', 'addressstate', 'addresszip', 'notes'];
    
    const receivedHeadersSet = new Set(headers);
    const missingRequiredHeaders = ['firstname', 'lastname'].filter(eh => !receivedHeadersSet.has(eh));

    if (missingRequiredHeaders.length > 0) {
        toast({ 
            title: "CSV Header Error", 
            description: `CSV file is missing required headers: ${missingRequiredHeaders.join(', ')}. Expected headers (case-insensitive, no spaces): ${expectedHeaders.join(', ')}. Please ensure your CSV matches this format.`, 
            variant: "destructive",
            duration: 10000,
        });
        return [];
    }

    let parsedCustomerCount = 0;
    for (let i = 1; i < lineCount; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const customerDataFromCsv: any = {};
      headers.forEach((header, index) => { 
        customerDataFromCsv[header] = values[index];
      });

      const firstName = customerDataFromCsv.firstname;
      const lastName = customerDataFromCsv.lastname;

      if (!firstName || !lastName) {
        continue; 
      }
      
      const emailType = EMAIL_CONTACT_TYPES.find(et => et.toLowerCase() === (customerDataFromCsv.primaryemailtype || '').toLowerCase()) || EMAIL_CONTACT_TYPES[0];
      const custType = CUSTOMER_TYPES.find(ct => ct.toLowerCase() === (customerDataFromCsv.customertype || '').toLowerCase()) || CUSTOMER_TYPES[0];

      const newCustomer: Omit<Customer, 'id'> = {
        firstName: firstName,
        lastName: lastName,
        companyName: customerDataFromCsv.companyname || undefined,
        phone: customerDataFromCsv.phone || '',
        emailContacts: customerDataFromCsv.primaryemail ? [{
          id: crypto.randomUUID(), 
          type: emailType as EmailContactType,
          email: customerDataFromCsv.primaryemail,
          name: `${firstName} ${lastName}`
        }] : [],
        customerType: custType as CustomerType,
        address: (customerDataFromCsv.addressstreet || customerDataFromCsv.addresscity || customerDataFromCsv.addressstate || customerDataFromCsv.addresszip) ? {
          street: customerDataFromCsv.addressstreet || '',
          city: customerDataFromCsv.addresscity || '',
          state: customerDataFromCsv.addressstate || '',
          zip: customerDataFromCsv.addresszip || '',
        } : undefined,
        notes: customerDataFromCsv.notes || undefined,
      };
      newCustomersData.push(newCustomer);
      parsedCustomerCount++;
    }
    if (lineCount > 1 && parsedCustomerCount === 0 && missingRequiredHeaders.length === 0) {
        toast({
            title: "CSV Info",
            description: "CSV headers found, but no valid customer data rows could be parsed. Please check row content for all required fields (firstName, lastName).",
            variant: "default",
            duration: 8000,
        });
    }
    return newCustomersData;
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const csvData = e.target?.result as string;
      if (csvData) {
        const parsedCustomersData = parseCsvToCustomers(csvData);
        
        if (parsedCustomersData.length > 0) {
          try {
            const batch = writeBatch(db);
            parsedCustomersData.forEach(customerData => {
              const newDocRef = doc(collection(db, 'customers')); 
              batch.set(newDocRef, customerData);
            });
            await batch.commit();
            toast({
              title: "Success",
              description: `${parsedCustomersData.length} customers imported successfully to Firestore.`,
            });
          } catch (error) {
            console.error("Error importing customers to Firestore:", error);
            toast({
              title: "Firestore Error",
              description: "Failed to save customers to database. Check console for details.",
              variant: "destructive",
              duration: 10000,
            });
          }
        }
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast({ title: "File Read Error", description: "Failed to read the file.", variant: "destructive" });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  if (isLoading) {
    return (
      <PageHeader title="Customers" description="Loading customer database...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

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
       {customers.length === 0 && !isLoading && (
        <p className="p-4 text-center text-muted-foreground">
          No customers found. Try adding one or importing a CSV.
        </p>
      )}
    </>
  );
}
