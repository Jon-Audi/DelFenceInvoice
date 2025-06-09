
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
    console.log("[CustomersPage] Firestore client initialized. Project ID:", db.app.options.projectId);
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const fetchedCustomers: Customer[] = [];
      snapshot.forEach((docSnap) => {
        const customerData = docSnap.data() as Omit<Customer, 'id'>;
        fetchedCustomers.push({ ...customerData, id: docSnap.id });
      });
      setCustomers(fetchedCustomers.sort((a, b) => (a.companyName || `${a.firstName} ${a.lastName}`).localeCompare(b.companyName || `${b.firstName} ${b.lastName}`)));
      setIsLoading(false);
      console.log(`[CustomersPage] Customers snapshot received. Document count: ${snapshot.size}`);
    }, (error) => {
      console.error("[CustomersPage] Error fetching customers:", error);
      toast({
        title: "Error Fetching Data",
        description: `Could not fetch customers. Error: ${error.message}. Code: ${error.code}. Ensure Firestore rules allow reads and you are authenticated.`,
        variant: "destructive",
        duration: 10000,
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
    const lines = csvData.trim().split(/\r\n|\n/); // Handle both Windows and Unix line endings
    const lineCount = lines.length;

    if (lineCount < 2) {
      toast({ title: "Error", description: "CSV file is empty or has no data rows.", variant: "destructive" });
      return [];
    }

    // Normalize headers: lowercase and remove spaces
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
    const expectedHeaders = ['firstname', 'lastname', 'companyname', 'phone', 'primaryemail', 'primaryemailtype', 'customertype', 'addressstreet', 'addresscity', 'addressstate', 'addresszip', 'notes'];
    
    const requiredHeaders = ['firstname', 'lastname'];
    const missingRequiredHeaders = requiredHeaders.filter(eh => !headers.includes(eh));

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
    let skippedRowCount = 0;

    for (let i = 1; i < lineCount; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const customerDataFromCsv: Record<string, string> = {};
      headers.forEach((header, index) => { 
        customerDataFromCsv[header] = values[index] || ''; // Ensure value is at least an empty string
      });

      const firstName = customerDataFromCsv.firstname;
      const lastName = customerDataFromCsv.lastname;

      if (!firstName || !lastName) {
        skippedRowCount++;
        console.warn(`Skipping CSV row ${i+1}: missing firstName or lastName. Data: ${lines[i]}`);
        continue; 
      }
      
      const emailTypeStr = (customerDataFromCsv.primaryemailtype || '').toLowerCase();
      const emailType = EMAIL_CONTACT_TYPES.find(et => et.toLowerCase() === emailTypeStr) || EMAIL_CONTACT_TYPES[0];
      
      const custTypeStr = (customerDataFromCsv.customertype || '').toLowerCase();
      const custType = CUSTOMER_TYPES.find(ct => ct.toLowerCase() === custTypeStr) || CUSTOMER_TYPES[0];

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

    if (parsedCustomerCount > 0) {
        toast({
            title: "CSV Parsed",
            description: `${parsedCustomerCount} customers parsed from CSV. ${skippedRowCount > 0 ? `${skippedRowCount} rows skipped due to missing required fields (firstName, lastName).` : ''}`,
            variant: skippedRowCount > 0 ? "default" : "default", // 'default' is info, not warning
            duration: 8000,
        });
    } else if (lineCount > 1 && missingRequiredHeaders.length === 0) {
        toast({
            title: "CSV Info",
            description: `CSV headers matched, but no valid customer data rows could be parsed. ${skippedRowCount} rows were skipped. Please check row content for firstName and lastName.`,
            variant: "default",
            duration: 10000,
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
            setIsLoading(true);
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
          } catch (error: any) {
            console.error("Error importing customers to Firestore:", error);
            toast({
              title: "Firestore Error",
              description: `Failed to save customers to database. ${error.message || 'Check console for details.'}`,
              variant: "destructive",
              duration: 10000,
            });
          } finally {
            setIsLoading(false);
          }
        }
      }
      // Reset file input to allow selecting the same file again if needed
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

  if (isLoading && customers.length === 0) { // Show loader if actively loading AND no customers yet
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
            disabled={isLoading} // Disable while other operations are in progress
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
            <Icon name="Upload" className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <CustomerDialog
            triggerButton={
              <Button disabled={isLoading}>
                <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            }
            onSave={handleSaveCustomer}
          />
        </div>
      </PageHeader>
      <CustomerTable customers={customers} onSave={handleSaveCustomer} onDelete={handleDeleteCustomer} />
       {customers.length === 0 && !isLoading && ( // Message if no customers and not loading
        <p className="p-4 text-center text-muted-foreground">
          No customers found. Try adding one or importing a CSV.
        </p>
      )}
    </>
  );
}
