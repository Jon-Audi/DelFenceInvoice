
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, doc, getDoc as getFirestoreDoc } from 'firebase/firestore';
import type { Invoice, Order, Customer, CompanySettings, CustomerInvoiceDetail } from '@/types';
import { PrintableSalesReport } from '@/components/reports/printable-sales-report';
import { PrintableOrderReport } from '@/components/reports/printable-order-report';
import { PrintableOutstandingInvoicesReport } from '@/components/reports/printable-outstanding-invoices-report';
import { cn } from '@/lib/utils';

const COMPANY_SETTINGS_DOC_ID = "main";

type ReportType = 'sales' | 'orders' | 'customerBalances';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | 'all'>('all');
  const [generatedReportData, setGeneratedReportData] = useState<Invoice[] | Order[] | CustomerInvoiceDetail[] | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [reportTitleForPrint, setReportTitleForPrint] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoadingCustomers(true);
      try {
        const customersSnapshot = await getDocs(collection(db, 'customers'));
        const fetchedCustomers: Customer[] = [];
        customersSnapshot.forEach(docSnap => fetchedCustomers.push({ id: docSnap.id, ...docSnap.data() } as Customer));
        setCustomers(fetchedCustomers.sort((a, b) => (a.companyName || `${a.firstName} ${a.lastName}`).localeCompare(b.companyName || `${b.firstName} ${b.lastName}`)));
      } catch (error) {
        console.error("Error fetching customers for report:", error);
        toast({ title: "Error", description: "Could not fetch customers.", variant: "destructive" });
      } finally {
        setIsLoadingCustomers(false);
      }
    };
    fetchCustomers();
  }, [toast]);

  const handleGenerateReport = async () => {
    if (reportType !== 'customerBalances' && (!startDate || !endDate)) {
      toast({ title: "Date Range Required", description: "Please select both a start and end date.", variant: "destructive" });
      return;
    }
    if (reportType !== 'customerBalances' && endDate! < startDate!) {
      toast({ title: "Invalid Date Range", description: "End date cannot be before start date.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setGeneratedReportData(null);
    let currentReportTitle = '';

    try {
      let data: Invoice[] | Order[] | CustomerInvoiceDetail[] = [];

      if (reportType === 'sales') {
        currentReportTitle = `Sales Report (${format(startDate!, "P")} - ${format(endDate!, "P")})`;
        const startQueryDate = Timestamp.fromDate(new Date(startDate!.setHours(0, 0, 0, 0)));
        const endQueryDate = Timestamp.fromDate(new Date(endDate!.setHours(23, 59, 59, 999)));
        
        const invoicesRef = collection(db, 'invoices');
        const q = query(invoicesRef, 
                        where('date', '>=', startQueryDate.toDate().toISOString()), 
                        where('date', '<=', endQueryDate.toDate().toISOString()));
        const querySnapshot = await getDocs(q);
        const fetchedInvoices: Invoice[] = [];
        querySnapshot.forEach(docSnap => fetchedInvoices.push({ id: docSnap.id, ...docSnap.data() } as Invoice));
        data = fetchedInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      } else if (reportType === 'orders') {
        currentReportTitle = `Order Report (${format(startDate!, "P")} - ${format(endDate!, "P")})`;
        const startQueryDate = Timestamp.fromDate(new Date(startDate!.setHours(0, 0, 0, 0)));
        const endQueryDate = Timestamp.fromDate(new Date(endDate!.setHours(23, 59, 59, 999)));

        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, 
                        where('date', '>=', startQueryDate.toDate().toISOString()), 
                        where('date', '<=', endQueryDate.toDate().toISOString()));
        const querySnapshot = await getDocs(q);
        const fetchedOrders: Order[] = [];
        querySnapshot.forEach(docSnap => fetchedOrders.push({ id: docSnap.id, ...docSnap.data() } as Order));
        data = fetchedOrders.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      } else if (reportType === 'customerBalances') {
        const invoicesRef = collection(db, 'invoices');
        let qConstraints = [
            where('status', 'not-in', ['Paid', 'Voided']),
            where('balanceDue', '>', 0)
        ];

        if (selectedCustomerId === 'all') {
          currentReportTitle = "Outstanding Invoices Report (All Customers)";
        } else {
          const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
          currentReportTitle = `Outstanding Invoices for ${selectedCustomer?.companyName || `${selectedCustomer?.firstName} ${selectedCustomer?.lastName}` || 'Selected Customer'}`;
          qConstraints.push(where('customerId', '==', selectedCustomerId));
        }
        const qInvoices = query(invoicesRef, ...qConstraints);
        const invoicesSnapshot = await getDocs(qInvoices);
        
        const customerInvoiceDetails: CustomerInvoiceDetail[] = [];
        invoicesSnapshot.forEach(docSnap => {
          const invoice = docSnap.data() as Invoice;
          const customer = customers.find(c => c.id === invoice.customerId);
          customerInvoiceDetails.push({
            customerId: invoice.customerId,
            customerName: customer?.companyName || `${customer?.firstName} ${customer?.lastName}` || 'Unknown Customer',
            invoiceId: invoice.id!,
            invoiceNumber: invoice.invoiceNumber,
            poNumber: invoice.poNumber,
            invoiceDate: invoice.date,
            dueDate: invoice.dueDate,
            balanceDue: invoice.balanceDue || 0,
            invoiceTotal: invoice.total,
            amountPaid: invoice.amountPaid || 0,
          });
        });
        data = customerInvoiceDetails.sort((a,b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
      }

      setGeneratedReportData(data);
      setReportTitleForPrint(currentReportTitle);
      if (data.length === 0) {
        toast({ title: "No Data", description: "No records found for the selected criteria.", variant: "default" });
      } else {
        toast({ title: "Report Generated", description: `${data.length} records found.`, variant: "default" });
      }
    } catch (error) {
      console.error("Error generating report:", error);
      toast({ title: "Error Generating Report", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCompanySettings = async (): Promise<CompanySettings | null> => {
    try {
      const docRef = doc(db, 'companySettings', COMPANY_SETTINGS_DOC_ID);
      const docSnap = await getFirestoreDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as CompanySettings;
      }
      toast({ title: "Company Settings Not Found", description: "Please configure company settings for printing.", variant: "default" });
      return null;
    } catch (error) {
      console.error("Error fetching company settings:", error);
      toast({ title: "Error", description: "Could not fetch company settings.", variant: "destructive" });
      return null;
    }
  };

  const handlePrintReport = async () => {
    if (!generatedReportData || generatedReportData.length === 0) {
      toast({ title: "No Report Data", description: "Please generate a report first.", variant: "default" });
      return;
    }
    setIsLoading(true); 
    const settings = await fetchCompanySettings();
    if (settings) {
      setCompanySettings(settings);
      setIsPrinting(true); 
    } else {
      toast({ title: "Cannot Print", description: "Company settings are required for printing.", variant: "destructive"});
    }
    setIsLoading(false);
  };

  const handleReportPrinted = useCallback(() => {
    setIsPrinting(false);
    setCompanySettings(null);
  }, []);

  useEffect(() => {
    if (isPrinting && companySettings && generatedReportData && generatedReportData.length > 0) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.print();
        });
      });
      const afterPrintHandler = () => {
        handleReportPrinted();
        window.removeEventListener('afterprint', afterPrintHandler);
      };
      window.addEventListener('afterprint', afterPrintHandler);
      return () => {
        window.removeEventListener('afterprint', afterPrintHandler);
      };
    }
  }, [isPrinting, companySettings, generatedReportData, handleReportPrinted]);

  const customerForSummary = reportType === 'customerBalances' && selectedCustomerId !== 'all' 
    ? customers.find(c => c.id === selectedCustomerId) 
    : null;

  return (
    <>
      <PageHeader title="Reports" description="Generate and print business reports." />
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={reportType} onValueChange={(value) => {
            setReportType(value as ReportType);
            setGeneratedReportData(null); 
            setSelectedCustomerId('all'); 
          }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sales">Sales Report</TabsTrigger>
              <TabsTrigger value="orders">Order Report</TabsTrigger>
              <TabsTrigger value="customerBalances">Outstanding Invoices</TabsTrigger>
            </TabsList>
          </Tabs>

          {reportType !== 'customerBalances' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="start-date">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant={"outline"}
                      className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}
                      disabled={isLoading}
                    >
                      <Icon name="Calendar" className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="end-date">End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date"
                      variant={"outline"}
                      className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")}
                      disabled={isLoading}
                    >
                      <Icon name="Calendar" className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {reportType === 'customerBalances' && (
            <div className="space-y-2">
              <Label htmlFor="customer-select">Customer</Label>
              <Select 
                value={selectedCustomerId} 
                onValueChange={setSelectedCustomerId}
                disabled={isLoadingCustomers || isLoading}
              >
                <SelectTrigger id="customer-select">
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.companyName || `${customer.firstName} ${customer.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This report shows currently outstanding invoices (not Paid or Voided, with a balance due).
              </p>
            </div>
          )}

          <div className="flex space-x-2">
            <Button 
              onClick={handleGenerateReport} 
              disabled={isLoading || isLoadingCustomers || (reportType !== 'customerBalances' && (!startDate || !endDate))}
            >
              {(isLoading || isLoadingCustomers) && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
              Generate Report
            </Button>
            <Button onClick={handlePrintReport} variant="outline" disabled={isLoading || !generatedReportData || generatedReportData.length === 0}>
              <Icon name="Printer" className="mr-2 h-4 w-4" />
              Print Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedReportData && !isPrinting && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Generated Report Summary</CardTitle>
          </CardHeader>
          <CardContent>
             <p>Report Type: <span className="font-semibold capitalize">
                {reportType === 'sales' && 'Sales'}
                {reportType === 'orders' && 'Orders'}
                {reportType === 'customerBalances' && 
                  (selectedCustomerId === 'all' 
                    ? 'Outstanding Invoices (All Customers)' 
                    : `Outstanding Invoices for ${customerForSummary?.companyName || `${customerForSummary?.firstName} ${customerForSummary?.lastName}` || ''}`)
                }
              </span>
            </p>
            {reportType !== 'customerBalances' && (
              <p>Date Range: {startDate ? format(startDate, "PPP") : 'N/A'} - {endDate ? format(endDate, "PPP") : 'N/A'}</p>
            )}
            <p>Records Found: <span className="font-semibold">{generatedReportData.length}</span></p>
            {reportType === 'customerBalances' && (
              <p>Total Outstanding: <span className="font-semibold">
                ${(generatedReportData as CustomerInvoiceDetail[]).reduce((sum, item) => sum + item.balanceDue, 0).toFixed(2)}
              </span></p>
            )}
             {reportType === 'sales' && (
              <p>Total Sales Amount: <span className="font-semibold">
                ${(generatedReportData as Invoice[]).reduce((sum, item) => sum + item.total, 0).toFixed(2)}
              </span></p>
            )}
             {reportType === 'orders' && (
              <p>Total Order Amount: <span className="font-semibold">
                ${(generatedReportData as Order[]).reduce((sum, item) => sum + item.total, 0).toFixed(2)}
              </span></p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="print-only-container">
        {isPrinting && companySettings && generatedReportData && (
          <>
            {reportType === 'sales' && (
              <PrintableSalesReport 
                invoices={generatedReportData as Invoice[]} 
                companySettings={companySettings}
                startDate={startDate!}
                endDate={endDate!}
              />
            )}
            {reportType === 'orders' && (
              <PrintableOrderReport 
                orders={generatedReportData as Order[]} 
                companySettings={companySettings}
                startDate={startDate!}
                endDate={endDate!}
              />
            )}
            {reportType === 'customerBalances' && (
              <PrintableOutstandingInvoicesReport
                reportData={generatedReportData as CustomerInvoiceDetail[]}
                companySettings={companySettings}
                reportTitle={reportTitleForPrint}
              />
            )}
          </>
        )}
      </div>
    </>
  );
}

