
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { CustomerTable } from '@/components/customers/customer-table';
import { CustomerDialog } from '@/components/customers/customer-dialog';
import type { Customer, CustomerType } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { PrintableCustomerList } from '@/components/customers/printable-customer-list';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval, isValid, type Interval } from 'date-fns';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'thisWeek' | 'thisMonth' | 'lastMonth'>('all');
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true);
    const unsubscribeCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const fetchedCustomers: Customer[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedCustomers.push({ 
          ...data, 
          id: docSnap.id,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as Customer);
      });
      setCustomers(fetchedCustomers.sort((a, b) => (a.companyName || a.contactName || '').localeCompare(b.companyName || b.contactName || '')));
      setIsLoading(false);
    }, (error) => {
      console.error("[CustomersPage] Error fetching customers:", error);
      toast({
        title: "Error Fetching Data",
        description: `Could not fetch customers. Ensure Firestore rules allow reads.`,
        variant: "destructive",
        duration: 10000,
      });
      setIsLoading(false);
    });

    return () => unsubscribeCustomers();
  }, [toast]);

  const handleSaveCustomer = async (customerToSave: Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'searchIndex'> & { id?: string }) => {
    const { id, ...customerData } = customerToSave;
    const now = new Date();
    
    const searchIndex = [
      customerData.companyName,
      customerData.contactName,
      customerData.email,
    ].filter(Boolean).join(' ').toLowerCase();

    try {
      if (id) {
        const customerRef = doc(db, 'customers', id);
        await setDoc(customerRef, { ...customerData, searchIndex, updatedAt: now }, { merge: true });
        toast({ title: "Customer Updated", description: `Customer ${customerData.companyName || customerData.contactName} updated.` });
      } else {
        const docRef = await addDoc(collection(db, 'customers'), { ...customerData, searchIndex, createdAt: now, updatedAt: now });
        toast({ title: "Customer Added", description: `Customer ${customerData.companyName || customerData.contactName} added.` });
      }
    } catch (error) {
      console.error("Error saving customer:", error);
      toast({ title: "Error", description: "Could not save customer.", variant: "destructive" });
    }
  };


  const handleDeleteCustomer = async (customerId: string) => {
    try {
      await deleteDoc(doc(db, 'customers', customerId));
      toast({ title: "Customer Deleted", description: "The customer has been removed." });
    } catch (error) {
      console.error("Error deleting customer:", error);
      toast({ title: "Error", description: "Could not delete customer.", variant: "destructive" });
    }
  };

  const filteredCustomers = useMemo(() => {
    let customersToFilter = customers;

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
            return isValid(createdAtDate) && isWithinInterval(createdAtDate, interval);
        });
    }

    if (!searchTerm) {
      return customersToFilter;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return customersToFilter.filter(customer => customer.searchIndex?.includes(lowercasedFilter));
  }, [customers, searchTerm, dateFilter]);

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`<html><head><title>Customer List</title><style>body { font-family: sans-serif; margin: 2rem; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; } h1 { text-align: center; }</style></head><body>${printContents}</body></html>`);
        win.document.close();
        win.focus();
        setTimeout(() => { win.print(); win.close(); }, 250);
      } else {
        toast({ title: "Print Error", description: "Could not open print window.", variant: "destructive" });
      }
    }
  };
  
  const handleRowClick = (customerId: string) => {
    router.push(`/customers/${customerId}`);
  };

  if (isLoading && customers.length === 0) {
    return (
      <PageHeader title="CRM" description="Loading customer database...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="CRM" description="Manage your customer relationships and data.">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={isLoading}>
            <Icon name="Printer" className="mr-2 h-4 w-4" />
            Print List
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
      
      <div className="flex flex-wrap gap-4 mb-4">
        <Input
          placeholder="Search by name, company, or email..."
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
        onRowClick={handleRowClick}
      />
       {filteredCustomers.length === 0 && !isLoading && (
        <p className="p-4 text-center text-muted-foreground">
          {searchTerm || dateFilter !== 'all' ? "No customers match your search criteria." : "No customers found. Try adding one."}
        </p>
      )}

      <div style={{ display: 'none' }}>
        <PrintableCustomerList ref={printRef} customers={filteredCustomers} />
      </div>
    </>
  );
}
