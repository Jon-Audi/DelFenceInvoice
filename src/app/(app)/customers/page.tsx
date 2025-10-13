
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { CustomerTable } from '@/components/customers/customer-table';
import { CustomerDialog } from '@/components/customers/customer-dialog';
import type { Customer, Estimate, Order } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { PrintableCustomerList } from '@/components/customers/printable-customer-list';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval, isValid, type Interval } from 'date-fns';

type CustomerWithLastInteraction = Customer & {
  lastEstimateDate?: string;
  lastOrderDate?: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'thisWeek' | 'thisMonth' | 'lastMonth'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: keyof CustomerWithLastInteraction; direction: 'asc' | 'desc' }>({ key: 'companyName', direction: 'asc' });

  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true);
    const unsubscribes: (() => void)[] = [];

    const unsubscribeCustomers = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const fetchedCustomers = snapshot.docs.map(docSnap => {
        return { ...docSnap.data(), id: docSnap.id } as Customer;
      });
      setCustomers(fetchedCustomers);
      setIsLoading(false);
    }, (error) => {
      console.error("[CustomersPage] Error fetching customers:", error);
      toast({ title: "Error", description: `Could not fetch customers.`, variant: "destructive" });
      setIsLoading(false);
    });
    unsubscribes.push(unsubscribeCustomers);
    
    const unsubscribeEstimates = onSnapshot(collection(db, 'estimates'), (snapshot) => {
      const fetchedEstimates = snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as Estimate));
      setEstimates(fetchedEstimates);
    });
    unsubscribes.push(unsubscribeEstimates);

    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
        const fetchedOrders = snapshot.docs.map(docSnap => ({ ...docSnap.data(), id: docSnap.id } as Order));
        setOrders(fetchedOrders);
    });
    unsubscribes.push(unsubscribeOrders);

    return () => unsubscribes.forEach(unsub => unsub());
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
        await setDoc(customerRef, { ...customerData, searchIndex, updatedAt: now.toISOString() }, { merge: true });
        toast({ title: "Customer Updated", description: `Customer ${customerData.companyName || customerData.contactName} updated.` });
      } else {
        const docRef = await addDoc(collection(db, 'customers'), { ...customerData, searchIndex, createdAt: now.toISOString(), updatedAt: now.toISOString() });
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

  const customersWithLastInteraction = useMemo((): CustomerWithLastInteraction[] => {
    return customers.map(customer => {
      const customerEstimates = estimates.filter(e => e.customerId === customer.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const customerOrders = orders.filter(o => o.customerId === customer.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        ...customer,
        lastEstimateDate: customerEstimates[0]?.date,
        lastOrderDate: customerOrders[0]?.date,
      };
    });
  }, [customers, estimates, orders]);

  const filteredAndSortedCustomers = useMemo(() => {
    let customersToFilter = [...customersWithLastInteraction];

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

    if (searchTerm) {
        const lowercasedFilter = searchTerm.toLowerCase();
        customersToFilter = customersToFilter.filter(customer => customer.searchIndex?.includes(lowercasedFilter));
    }

    customersToFilter.sort((a, b) => {
        const key = sortConfig.key;
        const valA = a[key as keyof typeof a];
        const valB = b[key as keyof typeof b];

        let comparison = 0;
        if (valA === null || valA === undefined) comparison = 1;
        else if (valB === null || valB === undefined) comparison = -1;
        else if (key === 'lastEstimateDate' || key === 'lastOrderDate' || key === 'createdAt') {
            comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
        } else if (key === 'companyName' || key === 'contactName') {
            const nameA = a.companyName || a.contactName || '';
            const nameB = b.companyName || b.contactName || '';
            comparison = nameA.localeCompare(nameB);
        } else if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return customersToFilter;
  }, [customersWithLastInteraction, searchTerm, dateFilter, sortConfig]);

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

  const requestSort = (key: keyof CustomerWithLastInteraction) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key, direction });
  };


  if (isLoading) {
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
        customers={filteredAndSortedCustomers}
        onSave={handleSaveCustomer}
        onDelete={handleDeleteCustomer}
        onRowClick={handleRowClick}
        sortConfig={sortConfig}
        requestSort={requestSort}
      />
       {filteredAndSortedCustomers.length === 0 && !isLoading && (
        <p className="p-4 text-center text-muted-foreground">
          {searchTerm || dateFilter !== 'all' ? "No customers match your search criteria." : "No customers found. Try adding one."}
        </p>
      )}

      <div style={{ display: 'none' }}>
        <PrintableCustomerList ref={printRef} customers={filteredAndSortedCustomers} />
      </div>
    </>
  );
}
