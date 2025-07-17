
"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { CustomerTable } from '@/components/customers/customer-table';
import { CustomerDialog } from '@/components/customers/customer-dialog';
import type { Customer, CustomerType, EmailContactType, ProductCategory, Product } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { CUSTOMER_TYPES, EMAIL_CONTACT_TYPES, INITIAL_PRODUCT_CATEGORIES } from '@/lib/constants';
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { PrintableCustomerList } from '@/components/customers/printable-customer-list';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval, isValid, type Interval } from 'date-fns';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]); // State to hold products
  const [productCategories, setProductCategories] = useState<ProductCategory[]>(INITIAL_PRODUCT_CATEGORIES);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'thisWeek' | 'thisMonth' | 'lastMonth'>('all');
  const printRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    setIsLoading(true);
    const unsubscribeCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const fetchedCustomers: Customer[] = [];
      snapshot.forEach((docSnap) => {
        const customerData = docSnap.data() as Omit<Customer, 'id'>;
        fetchedCustomers.push({ ...customerData, id: docSnap.id });
      });
      setCustomers(fetchedCustomers.sort((a, b) => (a.companyName || `${a.firstName} ${a.lastName}`).localeCompare(b.companyName || `${b.firstName} ${b.lastName}`)));
      setIsLoading(false);
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

    setIsLoadingProducts(true);
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const fetchedProducts: Product[] = [];
      const categoriesFromDb = new Set<string>(INITIAL_PRODUCT_CATEGORIES);
      snapshot.forEach((docSnap) => {
        const productData = docSnap.data() as Omit<Product, 'id'>;
        fetchedProducts.push({ ...productData, id: docSnap.id });
        if (productData.category) {
          categoriesFromDb.add(productData.category);
        }
      });
      setProducts(fetchedProducts);
      setProductCategories(Array.from(categoriesFromDb).sort((a, b) => a.localeCompare(b)));
      setIsLoadingProducts(false);
    }, (error) => {
      console.error("[CustomersPage] Error fetching products:", error);
      toast({
        title: "Error Fetching Products",
        description: "Could not fetch product categories for customer specific markups.",
        variant: "destructive",
      });
      setIsLoadingProducts(false);
    });


    return () => {
      unsubscribeCustomers();
      unsubscribeProducts();
    };
  }, [toast]);

  const handleSaveCustomer = async (customerToSave: Omit<Customer, 'id'> & { id?: string }) => {
    const { id, createdAt, ...customerData } = customerToSave;
    
    // Ensure createdAt is a string, defaulting to now if not provided
    const dataToSave = {
        ...customerData,
        createdAt: createdAt instanceof Date ? createdAt.toISOString() : (createdAt || new Date().toISOString())
    };

    try {
        if (id && customers.some(c => c.id === id)) {
            const customerRef = doc(db, 'customers', id);
            // When updating, we just save the data. `dataToSave` already has the correct `createdAt`.
            await setDoc(customerRef, dataToSave, { merge: true });
            toast({
                title: "Customer Updated",
                description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been updated.`,
            });
        } else {
            // When adding a new customer, the `createdAt` is already correctly set in `dataToSave`.
            const docRef = await addDoc(collection(db, 'customers'), dataToSave);
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

  const cleanCsvValue = (value: string | undefined): string => {
    if (typeof value !== 'string') return '';
    let cleaned = value.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      cleaned = cleaned.substring(1, cleaned.length - 1);
    }
    cleaned = cleaned.replace(/""/g, '"');
    return cleaned;
  };

  const parseCsvToCustomers = (csvData: string): Omit<Customer, 'id'>[] => {
    const newCustomersData: Omit<Customer, 'id'>[] = [];
    const lines = csvData.trim().split(/\r\n|\n/);
    const lineCount = lines.length;

    if (lineCount < 2) {
      toast({ title: "Error", description: "CSV file is empty or has no data rows.", variant: "destructive" });
      return [];
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
    const expectedHeaders = ['name', 'companyname', 'cell', 'phone', 'email'];
    
    const requiredHeaders = ['name'];
    const missingRequiredHeaders = requiredHeaders.filter(eh => !headers.includes(eh));

    if (missingRequiredHeaders.length > 0) {
        toast({ 
            title: "CSV Header Error", 
            description: `CSV file is missing required header(s): ${missingRequiredHeaders.join(', ')}. Expected headers (case-insensitive, no spaces): ${expectedHeaders.join(', ')}. Please ensure your CSV matches this format.`, 
            variant: "destructive",
            duration: 10000,
        });
        return [];
    }

    let parsedCustomerCount = 0;
    let skippedRowCount = 0;

    for (let i = 1; i < lineCount; i++) {
      const values = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      const customerDataFromCsv: Record<string, string> = {};
      
      headers.forEach((header, index) => { 
        customerDataFromCsv[header] = cleanCsvValue(values[index]);
      });

      const fullName = customerDataFromCsv.name;
      if (!fullName) {
        skippedRowCount++;
        console.warn(`Skipping CSV row ${i+1}: missing 'Name'. Data: ${lines[i]}`);
        continue; 
      }

      let firstName = '';
      let lastName = '';
      const nameParts = fullName.split(' ');
      if (nameParts.length > 0) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      } else {
        firstName = fullName; 
      }

      if (!firstName) { 
        skippedRowCount++;
        console.warn(`Skipping CSV row ${i+1}: could not parse firstName from 'Name'. Data: ${lines[i]}`);
        continue;
      }
      
      const primaryPhone = customerDataFromCsv.cell || customerDataFromCsv.phone || '';
      const primaryEmail = customerDataFromCsv.email || '';
      
      const customerDataForFirestore: Partial<Omit<Customer, 'id'>> = {
        firstName: firstName,
        lastName: lastName,
        phone: primaryPhone,
        emailContacts: primaryEmail ? [{
          id: crypto.randomUUID(), 
          type: EMAIL_CONTACT_TYPES[0], 
          email: primaryEmail,
          name: `${firstName} ${lastName}` 
        }] : [],
        customerType: CUSTOMER_TYPES[0], 
        specificMarkups: [],
        createdAt: new Date().toISOString(),
      };

      if (customerDataFromCsv.companyname) {
        customerDataForFirestore.companyName = customerDataFromCsv.companyname;
      }
      
      newCustomersData.push(customerDataForFirestore as Omit<Customer, 'id'>);
      parsedCustomerCount++;
    }

    let toastDescription = `${parsedCustomerCount} customers parsed from CSV.`;
    if (skippedRowCount > 0) {
        toastDescription += ` ${skippedRowCount} rows were skipped due to missing or unparsable 'Name' field.`;
    }
    if (parsedCustomerCount > 0 && skippedRowCount === 0 && lineCount -1 !== parsedCustomerCount && missingRequiredHeaders.length === 0) {
        const unprocessedRows = (lineCount -1) - parsedCustomerCount;
        if (unprocessedRows > 0) {
            toastDescription += ` ${unprocessedRows} additional rows may not have been processed correctly, check CSV format if numbers are unexpected.`;
        }
    }


    if (parsedCustomerCount > 0) {
        toast({
            title: "CSV Parsed",
            description: toastDescription,
            variant: skippedRowCount > 0 || (lineCount -1 !== parsedCustomerCount && missingRequiredHeaders.length === 0) ? "default" : "default",
            duration: 8000,
        });
    } else if (lineCount > 1 && missingRequiredHeaders.length === 0) {
        toast({
            title: "CSV Info",
            description: `CSV headers matched, but no valid customer data rows could be parsed. ${skippedRowCount} rows were skipped. Ensure the 'Name' column is present and populated. Also, check for commas within unquoted fields as this might affect parsing.`,
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

  const filteredCustomers = useMemo(() => {
    let customersToFilter = customers;

    // Date filtering
    if (dateFilter !== 'all') {
        const now = new Date();
        let interval: Interval;

        if (dateFilter === 'thisWeek') {
            interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
        } else if (dateFilter === 'thisMonth') {
            interval = { start: startOfMonth(now), end: endOfMonth(now) };
        } else { // lastMonth
            const lastMonthDate = subMonths(now, 1);
            interval = { start: startOfMonth(lastMonthDate), end: endOfMonth(lastMonthDate) };
        }

        customersToFilter = customersToFilter.filter(customer => {
            if (!customer.createdAt) return false;
            const createdAtDate = new Date(customer.createdAt);
            if (!isValid(createdAtDate)) return false;
            return isWithinInterval(createdAtDate, interval);
        });
    }

    // Search term filtering
    if (!searchTerm) {
      return customersToFilter;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return customersToFilter.filter(customer => {
      const fullName = `${customer.firstName} ${customer.lastName}`.toLowerCase();
      const companyName = customer.companyName?.toLowerCase() || '';
      const phone = customer.phone?.toLowerCase() || '';
      
      return (
        fullName.includes(lowercasedFilter) ||
        companyName.includes(lowercasedFilter) ||
        phone.includes(lowercasedFilter)
      );
    });
  }, [customers, searchTerm, dateFilter]);

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>Customer List</title>
              <style>
                body { font-family: sans-serif; margin: 2rem; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                h1 { text-align: center; }
              </style>
            </head>
            <body>
              ${printContents}
            </body>
          </html>
        `);
        win.document.close();
        win.focus();
        setTimeout(() => {
          win.print();
          win.close();
        }, 250);
      } else {
        toast({ title: "Print Error", description: "Could not open print window. Please check your browser's popup blocker.", variant: "destructive" });
      }
    }
  };


  if ((isLoading || isLoadingProducts) && customers.length === 0) {
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
            disabled={isLoading || isLoadingProducts}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading || isLoadingProducts}>
            <Icon name="Upload" className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={isLoading || isLoadingProducts}>
            <Icon name="Printer" className="mr-2 h-4 w-4" />
            Print List
          </Button>
          <CustomerDialog
            triggerButton={
              <Button disabled={isLoading || isLoadingProducts}>
                <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            }
            onSave={handleSaveCustomer}
            productCategories={productCategories}
          />
        </div>
      </PageHeader>
      
      <div className="flex flex-wrap gap-4 mb-4">
        <Input
          placeholder="Search by name, company, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
         <div className="flex items-center gap-2">
            <Button variant={dateFilter === 'all' ? "default" : "outline"} onClick={() => setDateFilter('all')}>All Time</Button>
            <Button variant={dateFilter === 'thisWeek' ? "default" : "outline"} onClick={() => setDateFilter('thisWeek')}>This Week</Button>
            <Button variant={dateFilter === 'thisMonth' ? "default" : "outline"} onClick={() => setDateFilter('thisMonth')}>This Month</Button>
            <Button variant={dateFilter === 'lastMonth' ? "default" : "outline"} onClick={() => setDateFilter('lastMonth')}>Last Month</Button>
        </div>
      </div>

      <CustomerTable
        customers={filteredCustomers}
        onSave={handleSaveCustomer}
        onDelete={handleDeleteCustomer}
        productCategories={productCategories}
      />
       {filteredCustomers.length === 0 && !isLoading && !isLoadingProducts && (
        <p className="p-4 text-center text-muted-foreground">
          {searchTerm || dateFilter !== 'all' ? "No customers match your search criteria." : "No customers found. Try adding one or importing a CSV."}
        </p>
      )}

      <div style={{ display: 'none' }}>
        <PrintableCustomerList ref={printRef} customers={filteredCustomers} />
      </div>
    </>
  );
}
