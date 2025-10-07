
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Customer, Order, Estimate } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

interface CustomerInteractionInfo {
  id: string;
  name: string;
  phone: string;
  lastOrderDate: string | null;
  lastEstimateDate: string | null;
  lastInteractionDate: Date | null;
}

type SortableCrmKeys = 'name' | 'lastEstimateDate' | 'lastOrderDate' | 'lastInteractionDate';

export default function CrmPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: SortableCrmKeys; direction: 'asc' | 'desc' }>({ key: 'lastInteractionDate', direction: 'asc' });
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    setIsLoading(true);

    const collections = {
      customers: setCustomers,
      orders: setOrders,
      estimates: setEstimates,
    };

    Object.entries(collections).forEach(([path, setStateCallback]) => {
      unsubscribes.push(onSnapshot(collection(db, path), (snapshot) => {
        const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setStateCallback(items as any[]);
      }, (error) => {
        console.error(`Error fetching ${path}:`, error);
        toast({ title: "Error", description: `Could not fetch ${path}.`, variant: "destructive" });
      }));
    });
    
    Promise.all([
      new Promise(res => onSnapshot(collection(db, 'customers'), () => res(true))),
      new Promise(res => onSnapshot(collection(db, 'orders'), () => res(true))),
      new Promise(res => onSnapshot(collection(db, 'estimates'), () => res(true))),
    ]).finally(() => setIsLoading(false));


    return () => unsubscribes.forEach(unsub => unsub());
  }, [toast]);

  const customerInteractionData = useMemo((): CustomerInteractionInfo[] => {
    if (isLoading) return [];

    let customerData = customers.map(customer => {
      const customerOrders = orders.filter(o => o.customerId === customer.id);
      const customerEstimates = estimates.filter(e => e.customerId === customer.id);

      const mostRecentOrder = customerOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const mostRecentEstimate = customerEstimates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      const lastOrderDate = mostRecentOrder ? mostRecentOrder.date : null;
      const lastEstimateDate = mostRecentEstimate ? mostRecentEstimate.date : null;

      let lastInteractionDate: Date | null = null;
      if(lastOrderDate) lastInteractionDate = new Date(lastOrderDate);
      if(lastEstimateDate) {
        const estimateDate = new Date(lastEstimateDate);
        if(!lastInteractionDate || estimateDate > lastInteractionDate) {
            lastInteractionDate = estimateDate;
        }
      }

      return {
        id: customer.id,
        name: customer.companyName || `${customer.firstName} ${customer.lastName}`,
        phone: customer.phone,
        lastOrderDate,
        lastEstimateDate,
        lastInteractionDate
      };
    });

    customerData.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        let comparison = 0;
        if (valA === null || valA === undefined) comparison = 1;
        else if (valB === null || valB === undefined) comparison = -1;
        else if (sortConfig.key === 'name') {
          comparison = String(valA).localeCompare(String(valB));
        } else {
          comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return customerData;
  }, [customers, orders, estimates, isLoading, sortConfig]);
  
  const formatDateAgo = (dateString: string | null) => {
    if (!dateString) return <span className="text-muted-foreground">Never</span>;
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  }

  const requestSort = (key: SortableCrmKeys) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key) {
        direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        // Default sort directions for certain columns
        if (['lastEstimateDate', 'lastOrderDate', 'lastInteractionDate'].includes(key)) {
            direction = 'desc';
        } else {
            direction = 'asc';
        }
    }
    setSortConfig({ key, direction });
  };

  const renderSortArrow = (columnKey: SortableCrmKeys) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === 'asc' ? <Icon name="ChevronUp" className="inline ml-1 h-4 w-4" /> : <Icon name="ChevronDown" className="inline ml-1 h-4 w-4" />;
    }
    return null;
  };


  if (isLoading) {
    return (
      <PageHeader title="Customer Relationship Management" description="Loading customer interaction data...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="Customer Relationship Management" description="Track customer activity to identify follow-up opportunities." />
      <Card>
        <CardHeader>
          <CardTitle>Customer Activity</CardTitle>
          <CardDescription>
            This list shows the last time each customer received an estimate or placed an order. Click column headers to sort.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/50">
                  Customer {renderSortArrow('name')}
                </TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead onClick={() => requestSort('lastEstimateDate')} className="cursor-pointer hover:bg-muted/50">
                  Last Estimate {renderSortArrow('lastEstimateDate')}
                </TableHead>
                <TableHead onClick={() => requestSort('lastOrderDate')} className="cursor-pointer hover:bg-muted/50">
                  Last Order {renderSortArrow('lastOrderDate')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerInteractionData.map((cust) => (
                <TableRow key={cust.id}>
                  <TableCell className="font-medium">{cust.name}</TableCell>
                  <TableCell>{cust.phone}</TableCell>
                  <TableCell>{formatDateAgo(cust.lastEstimateDate)}</TableCell>
                  <TableCell>{formatDateAgo(cust.lastOrderDate)}</TableCell>
                </TableRow>
              ))}
              {customerInteractionData.length === 0 && !isLoading && (
                  <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground p-6">
                          No customers found.
                      </TableCell>
                  </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

