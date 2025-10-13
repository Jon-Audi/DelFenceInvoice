
"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { CustomerTable } from '@/components/customers/customer-table';
import { CustomerDialog } from '@/components/customers/customer-dialog';
import type { Customer, Estimate, Order, Invoice } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { PrintableCustomerList } from '@/components/customers/printable-customer-list';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval, isValid, type Interval } from 'date-fns';

type CustomerWithLastInteraction = Customer & {
  lastEstimateDate?: string;
  lastPurchaseDate?: string;
};

const buildSearchIndex = (c: Partial<Customer>) => {
  const parts = [
    c.companyName ?? "",
    c.contactName ?? "",
    c.email ?? "",
    c.phone ?? "",
  ]
    .join(" ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return parts || null;
};

const hasName = (c: Partial<Customer>) => {
  const company = (c.companyName ?? "").trim();
  const person = (c.contactName ?? "").trim();
  return Boolean(company || person);
};

const sortKey = (c: Partial<Customer>) => {
  const company = (c.companyName ?? "").trim();
  const person = (c.contactName ?? "").trim();
  const key = company || person || "~"; // tilde sorts after A–Z with localeCompare
  return key.toLowerCase();
};


export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
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

    const collections = {
        customers: (items: Customer[]) => setCustomers(items),
        estimates: (items: Estimate[]) => setEstimates(items),
        orders: (items: Order[]) => setOrders(items),
        invoices: (items: Invoice[]) => setInvoices(items),
    };

    Object.entries(collections).forEach(([path, setStateCallback]) => {
      unsubscribes.push(onSnapshot(collection(db, path), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setStateCallback(items as any[]);
      }, (error) => {
        console.error(`[CustomersPage] Error fetching ${path}:`, error);
        toast({ title: "Error", description: `Could not fetch ${path}.`, variant: "destructive" });
      }));
    });
    
    // A simple way to determine initial loading state
    Promise.all(Object.keys(collections).map(path => 
        new Promise(res => onSnapshot(collection(db, path), () => res(true)))
    )).finally(() => {
        setIsLoading(false);
    });

    return () => unsubscribes.forEach(unsub => unsub());
  }, [toast]);

  const handleSaveCustomer = async (customerToSave: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const { id, ...customerData } = customerToSave;
    const now = new Date();
    
    const searchIndex = buildSearchIndex(customerData);

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
      const customerOrders = orders.filter(o => o.customerId === customer.id);
      const customerInvoices = invoices.filter(i => i.customerId === customer.id);
      
      const allPurchases = [...customerOrders, ...customerInvoices].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        ...customer,
        lastEstimateDate: customerEstimates[0]?.date,
        lastPurchaseDate: allPurchases[0]?.date,
      };
    });
  }, [customers, estimates, orders, invoices]);

  const filteredAndSortedCustomers = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();

    const matches = (c: Customer) => {
      if (!q) return true;
      const idx = c.searchIndex ?? buildSearchIndex(c);
      return idx?.includes(q);
    };

    const filtered = customersWithLastInteraction.filter(matches);

    return filtered.sort((a, b) => {
      if (sortConfig.key === 'companyName' || sortConfig.key === 'contactName') {
        const aHas = hasName(a);
        const bHas = hasName(b);
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;

        const comparison = sortKey(a).localeCompare(sortKey(b), undefined, { sensitivity: "base" });
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      const valA = a[sortConfig.key as keyof typeof a];
      const valB = b[sortConfig.key as keyof typeof b];

      let comparison = 0;
      if (valA === null || valA === undefined) {
          comparison = 1;
      } else if (valB === null || valB === undefined) {
          comparison = -1;
      } else if (sortConfig.key === 'lastEstimateDate' || sortConfig.key === 'lastPurchaseDate' || sortConfig.key === 'createdAt') {
          comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
      } else if (typeof valA === 'string' && typeof valB === 'string') {
          comparison = valA.localeCompare(valB);
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [customersWithLastInteraction, searchTerm, sortConfig]);

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

    