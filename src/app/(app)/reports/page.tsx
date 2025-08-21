
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, isValid, startOfWeek, endOfWeek, addWeeks, isBefore, getISOWeek, subMonths, startOfQuarter, endOfQuarter } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, doc, getDoc as getFirestoreDoc, orderBy } from 'firebase/firestore';
import type { Invoice, Order, Customer, CompanySettings, CustomerInvoiceDetail, PaymentReportItem, Payment, WeeklySummaryReportItem, PaymentByTypeReportItem, ProfitReportItem, Product } from '@/types';
import { PrintableSalesReport } from '@/components/reports/printable-sales-report';
import PrintableOrderReport from '@/components/reports/printable-order-report';
import { PrintableOutstandingInvoicesReport } from '@/components/reports/printable-outstanding-invoices-report';
import { PrintablePaymentsReport } from '@/components/reports/printable-payments-report';
import { PrintableWeeklySummaryReport } from '@/components/reports/printable-weekly-summary-report';
import { PrintablePaymentByTypeReport } from '@/components/reports/printable-payment-by-type-report';
import { PrintableProfitReport } from '@/components/reports/printable-profit-report';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PAYMENT_METHODS } from '@/lib/constants';

const COMPANY_SETTINGS_DOC_ID = "main";

type ReportType = 'sales' | 'orders' | 'customerBalances' | 'payments' | 'weeklySummary' | 'paymentByType' | 'profitability';
type DatePreset = 'custom' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear';

interface ReportToPrintData {
  reportType: ReportType;
  data: any[]; // Simplified to any[] for generic handling
  companySettings: CompanySettings;
  logoUrl: string;
  reportTitle?: string;
  startDate?: Date;
  endDate?: Date;
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | 'all'>('all');
  const [generatedReportData, setGeneratedReportData] = useState<any[] | null>(null);
  const [activeDatePreset, setActiveDatePreset] = useState<DatePreset>('thisMonth');
  
  const [isLoading, setIsLoading] = useState(false);
  const [reportToPrintData, setReportToPrintData] = useState<ReportToPrintData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const [reportTitleForSummary, setReportTitleForSummary] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    handleDatePresetChange('thisMonth');
  }, []);

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

  const handleDatePresetChange = (preset: DatePreset) => {
    setActiveDatePreset(preset);
    let newStart: Date;
    let newEnd: Date;
    const today = new Date();

    switch (preset) {
      case 'thisYear':
        newStart = startOfYear(today);
        newEnd = endOfYear(today);
        break;
      case 'thisQuarter':
        newStart = startOfQuarter(today);
        newEnd = endOfQuarter(today);
        break;
      case 'thisMonth':
        newStart = startOfMonth(today);
        newEnd = endOfMonth(today);
        break;
      case 'lastMonth':
        const lastMonthDate = subMonths(today, 1);
        newStart = startOfMonth(lastMonthDate);
        newEnd = endOfMonth(lastMonthDate);
        break;
       case 'thisWeek':
        newStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday as start of week
        newEnd = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'custom':
      default:
        return; 
    }
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Date Range Required", description: "Please select both a start and end date.", variant: "destructive" });
      return;
    }
    if (endDate! < startDate!) {
      toast({ title: "Invalid Date Range", description: "End date cannot be before start date.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    setGeneratedReportData(null);
    let currentReportTitle = '';
    const rangeStart = new Date(startDate.setHours(0, 0, 0, 0));
    const rangeEnd = new Date(endDate.setHours(23, 59, 59, 999));

    try {
      let data: any[] = [];
      
      if (reportType === 'profitability') {
        currentReportTitle = `Profitability Report (${format(rangeStart, "P")} - ${format(rangeEnd, "P")})`;
        const invoicesRef = collection(db, 'invoices');
        const q = query(invoicesRef, 
                        where('date', '>=', rangeStart.toISOString()), 
                        where('date', '<=', rangeEnd.toISOString()));
        
        const [invoiceSnapshot, productsSnapshot] = await Promise.all([
            getDocs(q),
            getDocs(collection(db, 'products'))
        ]);

        const productsMap = new Map<string, Product>();
        productsSnapshot.forEach(doc => productsMap.set(doc.id, { id: doc.id, ...doc.data() } as Product));

        const profitReportItems: ProfitReportItem[] = [];
        invoiceSnapshot.forEach(docSnap => {
            const invoice = { id: docSnap.id, ...docSnap.data() } as Invoice;
            if (invoice.status === 'Voided') return;

            let totalCostOfGoods = 0;
            invoice.lineItems.forEach(item => {
                let itemCost = 0;
                if (item.isNonStock) {
                    // For non-stock items, use the cost stored on the line item itself
                    itemCost = item.cost || 0;
                } else if (item.productId) {
                    // For stock items, look up the product cost from the map
                    const product = productsMap.get(item.productId);
                    if (product) {
                        itemCost = product.cost;
                    }
                }
                const totalItemCost = itemCost * item.quantity;
                totalCostOfGoods += item.isReturn ? -totalItemCost : totalItemCost;
            });

            profitReportItems.push({
                invoiceId: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                invoiceDate: invoice.date,
                customerName: invoice.customerName || 'N/A',
                invoiceTotal: invoice.total,
                totalCostOfGoods: totalCostOfGoods,
                profit: invoice.total - totalCostOfGoods,
            });
        });
        data = profitReportItems.sort((a,b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
      } else if (reportType === 'sales') {
        currentReportTitle = `Sales Report (Invoice Dates: ${format(rangeStart, "P")} - ${format(rangeEnd, "P")})`;
        const invoicesRef = collection(db, 'invoices');
        const q = query(invoicesRef, 
                        where('date', '>=', rangeStart.toISOString()), 
                        where('date', '<=', rangeEnd.toISOString()));
        const querySnapshot = await getDocs(q);
        const fetchedInvoices: Invoice[] = [];
        querySnapshot.forEach(docSnap => fetchedInvoices.push({ id: docSnap.id, ...docSnap.data() } as Invoice));
        data = fetchedInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      } else if (reportType === 'orders') {
        currentReportTitle = `Order Report (Order Dates: ${format(rangeStart, "P")} - ${format(rangeEnd, "P")})`;
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, 
                        where('date', '>=', rangeStart.toISOString()), 
                        where('date', '<=', rangeEnd.toISOString()));
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
      
      } else if (reportType === 'payments') {
        currentReportTitle = `Payments Report (Payment Dates: ${format(rangeStart, "P")} - ${format(rangeEnd, "P")})`;
        const paymentReportItems: PaymentReportItem[] = [];

        const invoicesRef = collection(db, 'invoices');
        const qInvoices = query(invoicesRef, where('status', 'in', ['Paid', 'Partially Paid']));
        const invoicesSnapshot = await getDocs(qInvoices);

        invoicesSnapshot.forEach(docSnap => {
          const invoice = { id: docSnap.id, ...docSnap.data() } as Invoice;
          if (invoice.payments && invoice.payments.length > 0) {
            const paymentsInDateRange = invoice.payments.filter(p => {
              const paymentDate = new Date(p.date);
              return paymentDate >= rangeStart && paymentDate <= rangeEnd;
            });

            if (paymentsInDateRange.length > 0) {
              paymentReportItems.push({
                documentId: invoice.id, documentNumber: invoice.invoiceNumber, documentType: 'Invoice', customerName: invoice.customerName || 'N/A', documentDate: invoice.date, documentTotal: invoice.total,
                payments: paymentsInDateRange,
                totalPaidForDocument: paymentsInDateRange.reduce((sum, p) => sum + p.amount, 0),
              });
            }
          }
        });

        const ordersRef = collection(db, 'orders');
        const qOrders = query(ordersRef, where('amountPaid', '>', 0));
        const ordersSnapshot = await getDocs(qOrders);

        ordersSnapshot.forEach(docSnap => {
          const order = { id: docSnap.id, ...docSnap.data() } as Order;
          if (order.payments && order.payments.length > 0) {
            const paymentsInDateRange = order.payments.filter(p => {
              const paymentDate = new Date(p.date);
              return paymentDate >= rangeStart && paymentDate <= rangeEnd;
            });

            if (paymentsInDateRange.length > 0) {
              paymentReportItems.push({
                documentId: order.id, documentNumber: order.orderNumber, documentType: 'Order', customerName: order.customerName || 'N/A', documentDate: order.date, documentTotal: order.total,
                payments: paymentsInDateRange,
                totalPaidForDocument: paymentsInDateRange.reduce((sum, p) => sum + p.amount, 0),
              });
            }
          }
        });
        data = paymentReportItems.sort((a,b) => new Date(b.documentDate).getTime() - new Date(a.documentDate).getTime());
      
      } else if (reportType === 'paymentByType') {
        currentReportTitle = `Payments by Type (${format(rangeStart, "P")} - ${format(rangeEnd, "P")})`;
        const paymentSummary = new Map<Payment['method'], { totalAmount: number; transactionCount: number }>();
        
        // Initialize map with all possible payment methods
        PAYMENT_METHODS.forEach(method => {
            paymentSummary.set(method, { totalAmount: 0, transactionCount: 0 });
        });

        const [paymentsInvoicesSnapshot, paymentsOrdersSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'invoices'), where('status', 'in', ['Paid', 'Partially Paid']))),
            getDocs(query(collection(db, 'orders'), where('amountPaid', '>', 0)))
        ]);

        const processDocPayments = (doc: Invoice | Order) => {
            if (!doc.payments) return;
            for (const payment of doc.payments) {
                const paymentDate = new Date(payment.date);
                if (paymentDate >= rangeStart && paymentDate <= rangeEnd) {
                    const current = paymentSummary.get(payment.method) || { totalAmount: 0, transactionCount: 0 };
                    current.totalAmount += payment.amount;
                    current.transactionCount += 1;
                    paymentSummary.set(payment.method, current);
                }
            }
        };

        paymentsInvoicesSnapshot.docs.forEach(d => processDocPayments(d.data() as Invoice));
        paymentsOrdersSnapshot.docs.forEach(d => processDocPayments(d.data() as Order));
        
        data = Array.from(paymentSummary.entries()).map(([method, summary]) => ({
            method,
            totalAmount: summary.totalAmount,
            transactionCount: summary.transactionCount,
        })).sort((a, b) => b.totalAmount - a.totalAmount);
    
      } else if (reportType === 'weeklySummary') {
        currentReportTitle = `Weekly Summary Report (${format(rangeStart, "P")} - ${format(rangeEnd, "P")})`;

        const [ordersSnapshot, invoicesSnapshot, paymentsInvoicesSnapshot, paymentsOrdersSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'orders'), where('date', '>=', rangeStart.toISOString()), where('date', '<=', rangeEnd.toISOString()))),
            getDocs(query(collection(db, 'invoices'), where('date', '>=', rangeStart.toISOString()), where('date', '<=', rangeEnd.toISOString()))),
            getDocs(query(collection(db, 'invoices'), where('status', 'in', ['Paid', 'Partially Paid']))),
            getDocs(query(collection(db, 'orders'), where('amountPaid', '>', 0)))
        ]);

        const allOrdersInRange = ordersSnapshot.docs.map(d => d.data() as Order);
        const allInvoicesInRange = invoicesSnapshot.docs.map(d => d.data() as Invoice);
        const allInvoicesWithPayments = paymentsInvoicesSnapshot.docs.map(d => d.data() as Invoice);
        const allOrdersWithPayments = paymentsOrdersSnapshot.docs.map(d => d.data() as Order);

        const weeklySummaries: WeeklySummaryReportItem[] = [];
        let currentWeekStart = startOfWeek(rangeStart, { weekStartsOn: 1 });

        while (isBefore(currentWeekStart, rangeEnd)) {
            const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
            const weekIdentifier = `${format(currentWeekStart, 'yyyy')}-W${getISOWeek(currentWeekStart)}`;
            
            const totalOrders = allOrdersInRange
                .filter(o => { const d = new Date(o.date); return d >= currentWeekStart && d <= currentWeekEnd; })
                .reduce((sum, o) => sum + o.total, 0);

            const totalInvoices = allInvoicesInRange
                .filter(i => { const d = new Date(i.date); return d >= currentWeekStart && d <= currentWeekEnd; })
                .reduce((sum, i) => sum + i.total, 0);

            let totalPayments = 0;
            const processPayments = (doc: Invoice | Order) => {
              if (doc.payments) {
                doc.payments.forEach(p => {
                    const paymentDate = new Date(p.date);
                    if (paymentDate >= currentWeekStart && paymentDate <= currentWeekEnd) {
                        totalPayments += p.amount;
                    }
                });
              }
            };

            allInvoicesWithPayments.forEach(processPayments);
            allOrdersWithPayments.forEach(processPayments);

            weeklySummaries.push({
                weekIdentifier,
                weekStartDate: currentWeekStart.toISOString(),
                weekEndDate: currentWeekEnd.toISOString(),
                totalPayments,
                totalOrders,
                totalInvoices,
            });

            currentWeekStart = addWeeks(currentWeekStart, 1);
        }
        data = weeklySummaries;
      }

      setGeneratedReportData(data);
      setReportTitleForSummary(currentReportTitle);
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
      const absoluteLogoUrl = typeof window !== "undefined" ? `${window.location.origin}/Logo.png` : "/Logo.png";
      
      const dataForPrint: ReportToPrintData = {
        reportType: reportType,
        data: generatedReportData,
        companySettings: settings,
        logoUrl: absoluteLogoUrl,
        reportTitle: reportTitleForSummary,
        startDate: startDate,
        endDate: endDate,
      };
      setReportToPrintData(dataForPrint);

      setTimeout(() => {
        if (printRef.current) {
          const printContents = printRef.current.innerHTML;
          const win = window.open('', '_blank');
          if (win) {
            win.document.write('<html><head><title>Print Report</title>');
            win.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">');
            win.document.write('<style>body { margin: 0; font-size: 10pt !important; } .print-only-container { width: 100%; min-height: 100vh; } @media print { body { size: auto; margin: 0; } .print-only { display: block !important; } .print-only-container { display: block !important; } } .print-only table { page-break-inside: auto; } .print-only tr { page-break-inside: avoid; page-break-after: auto; } .print-only thead { display: table-header-group; } .print-only tfoot { display: table-footer-group; }</style>');
            win.document.write('</head><body>');
            win.document.write(printContents);
            win.document.write('</body></html>');
            win.document.close();
            win.focus();
            setTimeout(() => { 
              win.print(); 
              win.close();
              setReportToPrintData(null); 
            }, 750);
          } else {
            toast({ title: "Print Error", description: "Popup blocked.", variant: "destructive" });
            setReportToPrintData(null);
          }
        } else {
          toast({ title: "Print Error", description: "Printable content ref not found.", variant: "destructive" });
          setReportToPrintData(null);
        }
        setIsLoading(false);
      }, 100);

    } else {
      toast({ title: "Cannot Print", description: "Company settings are required for printing.", variant: "destructive"});
      setIsLoading(false);
    }
  };

  const renderReportSummary = () => {
    if (!generatedReportData) return null;

    if (reportType === 'profitability') {
        const profitItems = generatedReportData as ProfitReportItem[];
        const grandTotalRevenue = profitItems.reduce((sum, item) => sum + item.invoiceTotal, 0);
        const grandTotalCost = profitItems.reduce((sum, item) => sum + item.totalCostOfGoods, 0);
        const grandTotalProfit = profitItems.reduce((sum, item) => sum + item.profit, 0);
        return (
          <div className="space-y-1">
            <p>Total Revenue: <span className="font-semibold">${grandTotalRevenue.toFixed(2)}</span></p>
            <p>Total Cost of Goods: <span className="font-semibold">${grandTotalCost.toFixed(2)}</span></p>
            <p>Total Profit: <span className="font-semibold">${grandTotalProfit.toFixed(2)}</span></p>
          </div>
        );
    }
    if (reportType === 'paymentByType') {
      const paymentItems = generatedReportData as PaymentByTypeReportItem[];
      const grandTotalAmount = paymentItems.reduce((sum, item) => sum + item.totalAmount, 0);
      return <p>Total Payments Received: <span className="font-semibold">${grandTotalAmount.toFixed(2)}</span></p>;
    }
    if (reportType === 'payments') {
        const paymentItems = generatedReportData as PaymentReportItem[];
        const totalPaymentsReceived = paymentItems.reduce((sum, item) => sum + item.totalPaidForDocument, 0);
        const distinctDocuments = new Set(paymentItems.map(item => item.documentId));
        return (
            <>
              <p>Total Payments Received (in range): <span className="font-semibold">${totalPaymentsReceived.toFixed(2)}</span></p>
              <p>Number of Documents with Payments (in range): <span className="font-semibold">{distinctDocuments.size}</span></p>
            </>
        );
    }
    if (reportType === 'customerBalances') {
      return <p>Total Outstanding: <span className="font-semibold">${(generatedReportData as CustomerInvoiceDetail[]).reduce((sum, item) => sum + item.balanceDue, 0).toFixed(2)}</span></p>;
    }
    if (reportType === 'sales') {
      return <p>Total Sales Amount: <span className="font-semibold">${(generatedReportData as Invoice[]).reduce((sum, item) => sum + item.total, 0).toFixed(2)}</span></p>;
    }
    if (reportType === 'orders') {
      return <p>Total Order Amount: <span className="font-semibold">${(generatedReportData as Order[]).reduce((sum, item) => sum + item.total, 0).toFixed(2)}</span></p>;
    }
    if (reportType === 'weeklySummary') {
      const weeklyItems = generatedReportData as WeeklySummaryReportItem[];
      const grandTotalPayments = weeklyItems.reduce((sum, item) => sum + item.totalPayments, 0);
      const grandTotalOrders = weeklyItems.reduce((sum, item) => sum + item.totalOrders, 0);
      const grandTotalInvoices = weeklyItems.reduce((sum, item) => sum + item.totalInvoices, 0);
       return (
         <div className="space-y-1">
            <p>Total Payments in Period: <span className="font-semibold">${grandTotalPayments.toFixed(2)}</span></p>
            <p>Total Order Value in Period: <span className="font-semibold">${grandTotalOrders.toFixed(2)}</span></p>
            <p>Total Invoice Value in Period: <span className="font-semibold">${grandTotalInvoices.toFixed(2)}</span></p>
         </div>
       );
    }
    return null;
  };

  const renderReportTable = () => {
    if (!generatedReportData) return null;

    if (reportType === 'profitability') {
        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Total Sale</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(generatedReportData as ProfitReportItem[]).map(item => (
                        <TableRow key={item.invoiceId}>
                            <TableCell>{item.invoiceNumber}</TableCell>
                            <TableCell>{format(new Date(item.invoiceDate), 'P')}</TableCell>
                            <TableCell>{item.customerName}</TableCell>
                            <TableCell className="text-right">${item.invoiceTotal.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${item.totalCostOfGoods.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-semibold">${item.profit.toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    if (reportType === 'weeklySummary') {
        return (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Week</TableHead>
                <TableHead className="text-right">Payments Collected</TableHead>
                <TableHead className="text-right">Total Orders</TableHead>
                <TableHead className="text-right">Total Invoices</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {(generatedReportData as WeeklySummaryReportItem[]).map(item => (
                <TableRow key={item.weekIdentifier}>
                    <TableCell>{format(new Date(item.weekStartDate), "MMM d")} - {format(new Date(item.weekEndDate), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">${item.totalPayments.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${item.totalOrders.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${item.totalInvoices.toFixed(2)}</TableCell>
                </TableRow>
                ))}
            </TableBody>
            </Table>
        );
    }

    if (reportType === 'paymentByType') {
        const grandTotalAmount = (generatedReportData as PaymentByTypeReportItem[]).reduce((sum, item) => sum + item.totalAmount, 0);
        const grandTotalCount = (generatedReportData as PaymentByTypeReportItem[]).reduce((sum, item) => sum + item.transactionCount, 0);
        return (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Payment Method</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead className="text-right"># of Transactions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {(generatedReportData as PaymentByTypeReportItem[]).map(item => (
                <TableRow key={item.method}>
                    <TableCell>{item.method}</TableCell>
                    <TableCell className="text-right">${item.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{item.transactionCount}</TableCell>
                </TableRow>
                ))}
            </TableBody>
             <tfoot>
                <TableRow className="font-bold bg-muted/50">
                    <TableCell className="text-right">Totals:</TableCell>
                    <TableCell className="text-right">${grandTotalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{grandTotalCount}</TableCell>
                </TableRow>
             </tfoot>
            </Table>
        );
    }
    
    return null;
  };

  const getActiveDatePresets = () => {
    const commonPresets: DatePreset[] = ['thisWeek', 'thisMonth', 'lastMonth', 'thisQuarter', 'thisYear', 'custom'];
    if (reportType === 'customerBalances') {
        return ['custom']; // Should not be visible but as fallback
    }
    return commonPresets;
  }
  const datePresetsToRender = getActiveDatePresets();

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
            handleDatePresetChange('thisMonth');
          }}>
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-7">
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="profitability">Profitability</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="customerBalances">Outstanding</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="weeklySummary">Weekly</TabsTrigger>
              <TabsTrigger value="paymentByType">By Type</TabsTrigger>
            </TabsList>
          </Tabs>

          {reportType !== 'customerBalances' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                 {datePresetsToRender.map(preset => (
                    <Button 
                        key={preset}
                        variant={activeDatePreset === preset ? "default" : "outline"} 
                        onClick={() => preset === 'custom' ? setActiveDatePreset('custom') : handleDatePresetChange(preset as DatePreset)} 
                        disabled={isLoading}
                        className="capitalize"
                    >
                        {preset.replace(/([A-Z])/g, ' $1').trim()}
                    </Button>
                ))}
              </div>
              {activeDatePreset === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="start-date">Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button id="start-date" variant={"outline"} className={cn("justify-start text-left font-normal", !startDate && "text-muted-foreground")} disabled={isLoading}>
                          <Icon name="Calendar" className="mr-2 h-4 w-4" />
                          {startDate && isValid(startDate) ? format(startDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                    </Popover>
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="end-date">End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button id="end-date" variant={"outline"} className={cn("justify-start text-left font-normal", !endDate && "text-muted-foreground")} disabled={isLoading}>
                          <Icon name="Calendar" className="mr-2 h-4 w-4" />
                          {endDate && isValid(endDate) ? format(endDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </div>
          )}

          {reportType === 'customerBalances' && (
            <div className="space-y-2">
              <Label htmlFor="customer-select">Customer</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} disabled={isLoadingCustomers || isLoading}>
                <SelectTrigger id="customer-select"><SelectValue placeholder="Select Customer" /></SelectTrigger>
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
                This report shows currently outstanding invoices (not Paid or Voided, with a balance due). Date range is not applicable.
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

      {generatedReportData && !reportToPrintData && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{reportTitleForSummary || 'Generated Report Summary'}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderReportSummary()}
            <div className="mt-4">{renderReportTable()}</div>
          </CardContent>
        </Card>
      )}

      <div style={{ display: 'none' }}>
        {reportToPrintData && reportToPrintData.reportType === 'sales' && (
          <PrintableSalesReport ref={printRef} invoices={reportToPrintData.data as Invoice[]} companySettings={reportToPrintData.companySettings} startDate={reportToPrintData.startDate!} endDate={reportToPrintData.endDate!} logoUrl={reportToPrintData.logoUrl} />
        )}
        {reportToPrintData && reportToPrintData.reportType === 'orders' && (
          <PrintableOrderReport ref={printRef} orders={reportToPrintData.data as Order[]} companySettings={reportToPrintData.companySettings} startDate={reportToPrintData.startDate!} endDate={reportToPrintData.endDate!} logoUrl={reportToPrintData.logoUrl} />
        )}
        {reportToPrintData && reportToPrintData.reportType === 'customerBalances' && (
          <PrintableOutstandingInvoicesReport ref={printRef} reportData={reportToPrintData.data as CustomerInvoiceDetail[]} companySettings={reportToPrintData.companySettings} reportTitle={reportToPrintData.reportTitle!} logoUrl={reportToPrintData.logoUrl} />
        )}
        {reportToPrintData && reportToPrintData.reportType === 'payments' && (
          <PrintablePaymentsReport ref={printRef} reportItems={reportToPrintData.data as PaymentReportItem[]} companySettings={reportToPrintData.companySettings} startDate={reportToPrintData.startDate!} endDate={reportToPrintData.endDate!} logoUrl={reportToPrintData.logoUrl}/>
        )}
        {reportToPrintData && reportToPrintData.reportType === 'weeklySummary' && (
          <PrintableWeeklySummaryReport ref={printRef} reportItems={reportToPrintData.data as WeeklySummaryReportItem[]} companySettings={reportToPrintData.companySettings} startDate={reportToPrintData.startDate!} endDate={reportToPrintData.endDate!} logoUrl={reportToPrintData.logoUrl}/>
        )}
        {reportToPrintData && reportToPrintData.reportType === 'paymentByType' && (
          <PrintablePaymentByTypeReport ref={printRef} reportItems={reportToPrintData.data as PaymentByTypeReportItem[]} companySettings={reportToPrintData.companySettings} startDate={reportToPrintData.startDate!} endDate={reportToPrintData.endDate!} logoUrl={reportToPrintData.logoUrl}/>
        )}
         {reportToPrintData && reportToPrintData.reportType === 'profitability' && (
          <PrintableProfitReport ref={printRef} reportItems={reportToPrintData.data as ProfitReportItem[]} companySettings={reportToPrintData.companySettings} startDate={reportToPrintData.startDate!} endDate={reportToPrintData.endDate!} logoUrl={reportToPrintData.logoUrl}/>
        )}
      </div>
    </>
  );
}
