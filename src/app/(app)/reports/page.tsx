
"use client";

import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, doc, getDoc as getFirestoreDoc } from 'firebase/firestore';
import type { Invoice, Order, CompanySettings } from '@/types';
import { PrintableSalesReport } from '@/components/reports/printable-sales-report';
import { PrintableOrderReport } from '@/components/reports/printable-order-report';
import { cn } from '@/lib/utils';

const COMPANY_SETTINGS_DOC_ID = "main";

type ReportType = 'sales' | 'orders';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));
  const [generatedReportData, setGeneratedReportData] = useState<Invoice[] | Order[] | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Date Range Required", description: "Please select both a start and end date.", variant: "destructive" });
      return;
    }
    if (endDate < startDate) {
      toast({ title: "Invalid Date Range", description: "End date cannot be before start date.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setGeneratedReportData(null);

    try {
      const startQueryDate = Timestamp.fromDate(new Date(startDate.setHours(0, 0, 0, 0)));
      const endQueryDate = Timestamp.fromDate(new Date(endDate.setHours(23, 59, 59, 999)));

      let data: Invoice[] | Order[] = [];
      if (reportType === 'sales') {
        const invoicesRef = collection(db, 'invoices');
        const q = query(invoicesRef, 
                        where('date', '>=', startQueryDate.toDate().toISOString()), 
                        where('date', '<=', endQueryDate.toDate().toISOString()));
        const querySnapshot = await getDocs(q);
        const fetchedInvoices: Invoice[] = [];
        querySnapshot.forEach(docSnap => fetchedInvoices.push({ id: docSnap.id, ...docSnap.data() } as Invoice));
        data = fetchedInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      } else if (reportType === 'orders') {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, 
                        where('date', '>=', startQueryDate.toDate().toISOString()), 
                        where('date', '<=', endQueryDate.toDate().toISOString()));
        const querySnapshot = await getDocs(q);
        const fetchedOrders: Order[] = [];
        querySnapshot.forEach(docSnap => fetchedOrders.push({ id: docSnap.id, ...docSnap.data() } as Order));
        data = fetchedOrders.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }
      setGeneratedReportData(data);
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
    setIsLoading(true); // Use isLoading for print prep too
    const settings = await fetchCompanySettings();
    if (settings) {
      setCompanySettings(settings);
      setIsPrinting(true); // Trigger rendering of printable component
    } else {
      toast({ title: "Cannot Print", description: "Company settings are required for printing.", variant: "destructive"});
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (isPrinting && companySettings && generatedReportData) {
      // Delay print to allow component to render
      const timer = setTimeout(() => {
        window.print();
        setIsPrinting(false); // Reset after print dialog closes
        setCompanySettings(null); // Clear settings after printing
      }, 100); 
      return () => clearTimeout(timer);
    }
  }, [isPrinting, companySettings, generatedReportData]);

  return (
    <>
      <PageHeader title="Reports" description="Generate and print sales or order reports." />
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={reportType} onValueChange={(value) => {
            setReportType(value as ReportType);
            setGeneratedReportData(null); // Clear previous report data when type changes
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sales">Sales Report</TabsTrigger>
              <TabsTrigger value="orders">Order Report</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="start-date">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="start-date"
                    variant={"outline"}
                    className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")}
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

          <div className="flex space-x-2">
            <Button onClick={handleGenerateReport} disabled={isLoading || !startDate || !endDate}>
              {isLoading && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
              Generate Report
            </Button>
            <Button onClick={handlePrintReport} variant="outline" disabled={isLoading || !generatedReportData || generatedReportData.length === 0}>
              <Icon name="Printer" className="mr-2 h-4 w-4" />
              Print Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for displaying report summary or preview - could be enhanced later */}
      {generatedReportData && !isPrinting && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Generated Report Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Report Type: <span className="font-semibold capitalize">{reportType}</span></p>
            <p>Date Range: {startDate ? format(startDate, "PPP") : 'N/A'} - {endDate ? format(endDate, "PPP") : 'N/A'}</p>
            <p>Records Found: <span className="font-semibold">{generatedReportData.length}</span></p>
            {/* Add more summary details here based on report type */}
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
          </>
        )}
      </div>
    </>
  );
}
