
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, isValid, startOfWeek, endOfWeek, addWeeks, isBefore, getISOWeek, subMonths, startOfQuarter, endOfQuarter } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, doc, getDoc as getFirestoreDoc, orderBy } from 'firebase/firestore';
import type { Invoice, Order, Customer, CompanySettings, CustomerInvoiceDetail, PaymentReportItem, Payment, WeeklySummaryReportItem, PaymentByTypeReportItem, ProfitReportItem, CustomerStatementReportData, CustomerStatementItem, SalesByCustomerReportItem, Product, ProductionHistoryItem } from '@/types';
import { PrintableSalesReport } from '@/components/reports/printable-sales-report';
import PrintableOrderReport from '@/components/reports/printable-order-report';
import { PrintableOutstandingInvoicesReport } from '@/components/reports/printable-outstanding-invoices-report';
import { PrintablePaymentsReport } from '@/components/reports/printable-payments-report';
import { PrintableWeeklySummaryReport } from '@/components/reports/printable-weekly-summary-report';
import { PrintablePaymentByTypeReport } from '@/components/reports/printable-payment-by-type-report';
import { PrintableProfitReport } from '@/components/reports/printable-profit-report';
import { PrintableProfitSummaryReport } from '@/components/reports/printable-profit-summary-report';
import { PrintableCustomerStatement } from '@/components/reports/printable-customer-statement';
import { PrintableSalesByCustomerReport } from '@/components/reports/printable-sales-by-customer-report';
import { PrintableProductionReport } from '@/components/reports/printable-production-report';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PAYMENT_METHODS } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';

const COMPANY_SETTINGS_DOC_ID = "main";

type ReportType = 'sales' | 'orders' | 'customerBalances' | 'payments' | 'weeklySummary' | 'paymentByType' | 'profitability' | 'statement' | 'salesByCustomer' | 'production' | 'profitabilitySummary';
type DatePreset = 'custom' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear';

interface ProfitSummaryItem {
  customerId: string;
  customerName: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
}

interface ReportToPrintData {
  reportType: ReportType;
  data: any; 
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
  const [generatedReportData, setGeneratedReportData] = useState<any | null>(null);
  const [generatedProfitabilitySummaryData, setGeneratedProfitabilitySummaryData] = useState<ProfitSummaryItem[] | null>(null);
  const [activeDatePreset, setActiveDatePreset] = useState<DatePreset>('thisMonth');
  const [showOnlyPickedUpUnpaid, setShowOnlyPickedUpUnpaid] = useState(false);
  
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

  const generateProfitabilityReportData = async (rangeStart: Date, rangeEnd: Date) => {
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
                  itemCost = item.cost || 0;
              } else if (item.productId) {
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
              customerId: invoice.customerId,
              invoiceTotal: invoice.total,
              totalCostOfGoods: totalCostOfGoods,
              profit: invoice.total - totalCostOfGoods,
          });
      });
      return profitReportItems;
  }

  const handleGenerateReport = async (targetReportType = reportType) => {
    if (!startDate || !endDate) {
      if (targetReportType !== 'customerBalances') {
        toast({ title: "Date Range Required", description: "Please select both a start and end date.", variant: "destructive" });
        return;
      }
    }
     if (startDate && endDate && endDate! < startDate!) {
      toast({ title: "Invalid Date Range", description: "End date cannot be before start date.", variant: "destructive" });
      return;
    }
    if (targetReportType === 'statement' && selectedCustomerId === 'all') {
      toast({ title: "Customer Required", description: "Please select a customer to generate a statement.", variant: "destructive" });
      return;
    }


    setIsLoading(true);
    setGeneratedReportData(null);
    setGeneratedProfitabilitySummaryData(null);
    let currentReportTitle = '';
    const rangeStart = startDate ? new Date(startDate.setHours(0, 0, 0, 0)) : new Date(0);
    const rangeEnd = endDate ? new Date(endDate.setHours(23, 59, 59, 999)) : new Date();
    
    const toTime = (d?: string | Date) => (d ? new Date(d).getTime() : 0);

    try {
      let data: any[] | any = [];
      
      if (targetReportType === 'production') {
        currentReportTitle = `Production History Report (${format(rangeStart, "P")} - ${format(rangeEnd, "P")})`;
        const historyRef = collection(db, 'productionHistory');
        const q = query(historyRef, 
                        where('completedAt', '>=', rangeStart.toISOString()), 
                        where('completedAt', '<=', rangeEnd.toISOString()),
                        orderBy('completedAt', 'desc'));
        const historySnapshot = await getDocs(q);
        const fetchedItems: ProductionHistoryItem[] = [];
        historySnapshot.forEach(docSnap => fetchedItems.push({ id: docSnap.id, ...docSnap.data() } as ProductionHistoryItem));
        data = fetchedItems;
      }
      else if (targetReportType === 'salesByCustomer') {
        currentReportTitle = `Sales by Customer (${format(rangeStart, "P")} - ${format(rangeEnd, "P")})`;
        const invoicesRef = collection(db, 'invoices');
        const q = query(invoicesRef, 
                        where('date', '>=', rangeStart.toISOString()), 
                        where('date', '<=', rangeEnd.toISOString()));
        const invoiceSnapshot = await getDocs(q);

        const salesByCustomer = new Map<string, { customerName: string; totalSales: number; invoiceCount: number }>();

        invoiceSnapshot.forEach(doc => {
            const invoice = doc.data() as Invoice;
            if(invoice.status === 'Voided') return;

            const customerId = invoice.customerId;
            const customerName = invoice.customerName || 'Unknown Customer';
            const currentData = salesByCustomer.get(customerId) || { customerName, totalSales: 0, invoiceCount: 0 };
            
            currentData.totalSales += invoice.total;
            currentData.invoiceCount += 1;
            salesByCustomer.set(customerId, currentData);
        });
        
        const reportItems: SalesByCustomerReportItem[] = Array.from(salesByCustomer.entries()).map(([customerId, data]) => ({
            customerId,
            ...data
        }));

        data = reportItems.sort((a,b) => b.totalSales - a.totalSales);
      }
      else if (targetReportType === 'statement') {
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer) throw new Error("Customer not found.");

        currentReportTitle = `Statement for ${customer.companyName || (customer.firstName + ' ' + customer.lastName)}`;

        const invoicesRef = collection(db, 'invoices');
        
        const openingBalanceInvoicesQuery = query(invoicesRef, where('customerId', '==', selectedCustomerId), where('date', '<', rangeStart.toISOString()));
        const openingBalanceSnapshot = await getDocs(openingBalanceInvoicesQuery);
        let openingBalance = 0;
        openingBalanceSnapshot.forEach(doc => {
            const inv = doc.data() as Invoice;
            openingBalance += inv.total;
            if(inv.payments) {
                inv.payments.forEach(p => {
                    openingBalance -= p.amount;
                });
            }
        });

        const invoicesQuery = query(invoicesRef, where('customerId', '==', selectedCustomerId), where('date', '>=', rangeStart.toISOString()), where('date', '<=', rangeEnd.toISOString()));
        const invoicesSnapshot = await getDocs(invoicesQuery);

        let transactions: CustomerStatementItem[] = [];
        invoicesSnapshot.forEach(doc => {
            const inv = doc.data() as Invoice;
            transactions.push({
                date: inv.date,
                transactionType: 'Invoice',
                documentNumber: inv.invoiceNumber,
                debit: inv.total,
                credit: 0,
                balance: 0 
            });
            if (inv.payments) {
                inv.payments.forEach(p => {
                     const paymentDate = new Date(p.date);
                    if (paymentDate >= rangeStart && paymentDate <= rangeEnd) {
                        transactions.push({
                            date: p.date,
                            transactionType: 'Payment',
                            documentNumber: p.notes || `Payment for Inv #${inv.invoiceNumber}`,
                            debit: 0,
                            credit: p.amount,
                            balance: 0
                        });
                    }
                });
            }
        });
        
        transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = openingBalance;
        transactions = transactions.map(t => {
            runningBalance += t.debit - t.credit;
            return { ...t, balance: runningBalance };
        });

        const statementData: CustomerStatementReportData = {
            customer,
            startDate: rangeStart,
            endDate: rangeEnd,
            openingBalance,
            transactions,
            closingBalance: runningBalance,
        };

        data = statementData;
      }
      else if (targetReportType === 'profitability') {
        currentReportTitle = `Profitability Report (${format(rangeStart, "P")} - ${format(rangeEnd, "P")})`;
        const detailedData = await generateProfitabilityReportData(rangeStart, rangeEnd);
        data = detailedData.sort((a, b) => toTime(b.invoiceDate) - toTime(a.invoiceDate));

        const summaryData = Object.values(detailedData.reduce((acc, item) => {
          const key = item.customerId;
          if (!acc[key]) {
              acc[key] = { customerId: key, customerName: item.customerName, totalRevenue: 0, totalCost: 0, totalProfit: 0 };
          }
          acc[key].totalRevenue += item.invoiceTotal;
          acc[key].totalCost += item.totalCostOfGoods;
          acc[key].totalProfit += item.profit;
          return acc;
        }, {} as Record<string, ProfitSummaryItem>));
        setGeneratedProfitabilitySummaryData(summaryData.sort((a,b) => b.totalProfit - a.totalProfit));

      } else if (targetReportType === 'sales') {
        currentReportTitle = `Sales Report (Invoice Dates: ${format(rangeStart, "P")} - ${format(rangeEnd, "P")})`;
        const invoicesRef = collection(db, 'invoices');
        const q = query(invoicesRef, 
                        where('date', '>=', rangeStart.toISOString()), 
                        where('date', '<=', rangeEnd.toISOString()));
        const querySnapshot = await getDocs(q);
        const fetchedInvoices: Invoice[] = [];
        querySnapshot.forEach(docSnap => fetchedInvoices.push({ id: docSnap.id, ...docSnap.data() } as Invoice));
        data = fetchedInvoices.sort((a, b) => toTime(b.date) - toTime(a.date));

      } else if (targetReportType === 'orders') {
        currentReportTitle = `Order Report (Order Dates: ${format(rangeStart, "P")} - ${format(rangeEnd, "P")})`;
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, 
                        where('date', '>=', rangeStart.toISOString()), 
                        where('date', '<=', rangeEnd.toISOString()));
        const querySnapshot = await getDocs(q);
        const fetchedOrders: Order[] = [];
        querySnapshot.forEach(docSnap => fetchedOrders.push({ id: docSnap.id, ...docSnap.data() } as Order));
        data = fetchedOrders.sort((a,b) => toTime(b.date) - toTime(a.date));

      } else if (targetReportType === 'customerBalances') {
        const invoicesRef = collection(db, 'invoices');
        let qConstraints = [];

        if (showOnlyPickedUpUnpaid) {
            currentReportTitle = "Outstanding Invoices (Picked Up, Unpaid)";
            qConstraints = [
                where('status', '==', 'Picked up'),
                where('balanceDue', '>', 0)
            ];
        } else {
            currentReportTitle = "Outstanding Invoices Report (All)";
            qConstraints = [
                where('status', 'not-in', ['Paid', 'Voided']),
                where('balanceDue', '>', 0)
            ];
        }

        if (selectedCustomerId !== 'all') {
          const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
          currentReportTitle = `Outstanding Invoices for ${selectedCustomer?.companyName || `${selectedCustomer?.firstName} ${selectedCustomer?.lastName}` || 'Selected Customer'}`;
          if (showOnlyPickedUpUnpaid) {
            currentReportTitle += " (Picked Up)";
          }
          qConstraints.push(where('customerId', '==', selectedCustomerId));
        }
        
        const qInvoices = query(invoicesRef, ...qConstraints);
        const invoicesSnapshot = await getDocs(qInvoices);
        
        const customerInvoiceDetails: CustomerInvoiceDetail[] = [];
        invoicesSnapshot.forEach(docSnap => {
          const invoice = docSnap.data() as Omit<Invoice, 'id'>;
          const customer = customers.find(c => c.id === invoice.customerId);
          customerInvoiceDetails.push({
            customerId: invoice.customerId,
            customerName: customer?.companyName || `${customer?.firstName} ${customer?.lastName}` || 'Unknown Customer',
            invoiceId: docSnap.id,
            invoiceNumber: invoice.invoiceNumber,
            poNumber: invoice.poNumber,
            invoiceDate: invoice.date,
            dueDate: invoice.dueDate,
            balanceDue: invoice.balanceDue || 0,
            invoiceTotal: invoice.total,
            amountPaid: invoice.amountPaid || 0,
          });
        });
        data = customerInvoiceDetails.sort((a,b) => toTime(b.invoiceDate) - toTime(a.invoiceDate));
      
      } else if (targetReportType === 'payments') {
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
        data = paymentReportItems.sort((a,b) => toTime(b.documentDate) - toTime(a.documentDate));
      
      } else if (targetReportType === 'paymentByType') {
        currentReportTitle = `Payments by Type (${format(rangeStart, "P")} - ${format(rangeEnd, "P")})`;
        const paymentSummary = new Map<Payment['method'], { totalAmount: number; transactionCount: number }>();
        
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
    
      } else if (targetReportType === 'weeklySummary') {
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
        const allOrdersWithPayments = ordersSnapshot.docs.map(d => d.data() as Order);

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
      
      const hasData = Array.isArray(data) ? data.length > 0 : data && (data as any).transactions?.length > 0;
      
      if (hasData) {
        toast({ title: "Report Generated", description: `Report "${currentReportTitle}" is ready.`, variant: "default" });
      } else {
         toast({ title: "No Data", description: "No records found for the selected criteria.", variant: "default" });
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

  const handlePrintReport = async (printReportType: ReportType) => {
    const dataForPrintCheck = (printReportType === 'profitabilitySummary') ? generatedProfitabilitySummaryData : generatedReportData;
    if (!dataForPrintCheck || (Array.isArray(dataForPrintCheck) && dataForPrintCheck.length === 0) || (dataForPrintCheck && (dataForPrintCheck as any).transactions && (dataForPrintCheck as any).transactions.length === 0)) {
      toast({ title: "No Report Data", description: "Please generate a report with data first.", variant: "default" });
      return;
    }

    setIsLoading(true);
    const settings = await fetchCompanySettings();
    if (settings) {
      const absoluteLogoUrl = typeof window !== "undefined" ? `${window.location.origin}/Logo.png` : "/Logo.png";
      
      const printData: ReportToPrintData = {
        reportType: printReportType,
        data: dataForPrintCheck,
        companySettings: settings,
        logoUrl: absoluteLogoUrl,
        reportTitle: reportTitleForSummary,
        startDate: startDate,
        endDate: endDate,
      };
      setReportToPrintData(printData);

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
            toast({ title: "Print Error", description: "Popup blocked. Please allow popups for this site.", variant: "destructive" });
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
    if (!generatedReportData || (Array.isArray(generatedReportData) && generatedReportData.length === 0)) return null;

     if (reportType === 'statement') {
      const statementData = generatedReportData as CustomerStatementReportData;
       if (!statementData.transactions || statementData.transactions.length === 0) return null;
      return (
          <div className="space-y-1">
            <p>Opening Balance: <span className="font-semibold">${statementData.openingBalance.toFixed(2)}</span></p>
            <p>Closing Balance: <span className="font-semibold">${statementData.closingBalance.toFixed(2)}</span></p>
          </div>
      );
    }
    if (reportType === 'salesByCustomer') {
      const salesData = generatedReportData as SalesByCustomerReportItem[];
      const grandTotal = salesData.reduce((sum, item) => sum + item.totalSales, 0);
      return <p>Total Sales (All Customers): <span className="font-semibold">${grandTotal.toFixed(2)}</span></p>;
    }
    if (reportType === 'profitability') {
        const profitItems = generatedProfitabilitySummaryData || [];
        const grandTotalRevenue = profitItems.reduce((sum, item) => sum + item.totalRevenue, 0);
        const grandTotalCost = profitItems.reduce((sum, item) => sum + item.totalCost, 0);
        const grandTotalProfit = profitItems.reduce((sum, item) => sum + item.totalProfit, 0);
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
  
  const formatElapsedTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const renderReportTable = () => {
    if (!generatedReportData || (Array.isArray(generatedReportData) && generatedReportData.length === 0)) {
        return <p className="text-center text-muted-foreground py-4">No data to display for the selected criteria.</p>;
    }
    
    if (reportType === 'production') {
      return (
        <Table>
          <TableHeader><TableRow>
            <TableHead>Task Name</TableHead>
            <TableHead>PO # / Job</TableHead>
            <TableHead>Completed At</TableHead>
            <TableHead>Time Elapsed</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Material Amt.</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(generatedReportData as ProductionHistoryItem[]).map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.taskName}</TableCell>
                <TableCell>{item.poNumber || 'N/A'}</TableCell>
                <TableCell>{format(new Date(item.completedAt), 'P p')}</TableCell>
                <TableCell>{formatElapsedTime(item.elapsedSeconds)}</TableCell>
                <TableCell>{item.cost ? `$${item.cost.toFixed(2)}` : 'N/A'}</TableCell>
                <TableCell>{item.materialAmount || 'N/A'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    }

    if (reportType === 'salesByCustomer') {
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right"># of Invoices</TableHead>
              <TableHead className="text-right">Total Sales</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(generatedReportData as SalesByCustomerReportItem[]).map((item) => (
              <TableRow key={item.customerId}>
                <TableCell>{item.customerName}</TableCell>
                <TableCell className="text-right">{item.invoiceCount}</TableCell>
                <TableCell className="text-right font-semibold">${item.totalSales.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )
    }

    if (reportType === 'statement') {
      const statementData = generatedReportData as CustomerStatementReportData;
      if (!statementData.transactions || statementData.transactions.length === 0) {
        return <p className="text-center text-muted-foreground py-4">No transactions to display for this customer in the selected period.</p>;
      }
      return (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Transaction</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
                <TableCell>{format(statementData.startDate, 'P')}</TableCell>
                <TableCell className="font-semibold">Opening Balance</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-right font-semibold">${statementData.openingBalance.toFixed(2)}</TableCell>
            </TableRow>
            {statementData.transactions.map((item, index) => (
              <TableRow key={index}>
                <TableCell>{format(new Date(item.date), 'P')}</TableCell>
                <TableCell>{item.transactionType}: {item.documentNumber}</TableCell>
                <TableCell className="text-right">{item.debit > 0 ? `$${item.debit.toFixed(2)}` : ''}</TableCell>
                <TableCell className="text-right">{item.credit > 0 ? `$${item.credit.toFixed(2)}` : ''}</TableCell>
                <TableCell className="text-right">${item.balance.toFixed(2)}</TableCell>
              </TableRow>
            ))}
             <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={4} className="text-right">Closing Balance:</TableCell>
                <TableCell className="text-right">${statementData.closingBalance.toFixed(2)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )
    }

    if (reportType === 'profitability') {
        const profitReportItems = generatedReportData as ProfitReportItem[] || [];
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
                    {profitReportItems.map(item => (
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
    
    if (reportType === 'customerBalances') {
        const reportData = generatedReportData as CustomerInvoiceDetail[];
        if (reportData.length === 0) return <p className="text-center text-muted-foreground py-4">No outstanding invoices found for the selected criteria.</p>;

        return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Inv. Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reportData.map((item) => (
                        <TableRow key={item.invoiceId}>
                            <TableCell>{item.customerName}</TableCell>
                            <TableCell>{item.invoiceNumber}</TableCell>
                            <TableCell>{format(new Date(item.invoiceDate), 'P')}</TableCell>
                            <TableCell>{item.dueDate ? format(new Date(item.dueDate), 'P') : 'N/A'}</TableCell>
                            <TableCell className="text-right font-semibold text-destructive">${item.balanceDue.toFixed(2)}</TableCell>
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
        return ['custom'];
    }
    return commonPresets;
  }
  const datePresetsToRender = getActiveDatePresets();

  const renderPrintButton = () => {
    const isDataAvailableForCurrentReport = reportType === 'profitability' ? 
      (generatedReportData && Array.isArray(generatedReportData) && generatedReportData.length > 0) || 
      (generatedProfitabilitySummaryData && Array.isArray(generatedProfitabilitySummaryData) && generatedProfitabilitySummaryData.length > 0)
      : generatedReportData && (!Array.isArray(generatedReportData) || generatedReportData.length > 0) && (!generatedReportData.transactions || generatedReportData.transactions.length > 0);

    if (reportType === 'profitability') {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isLoading || !isDataAvailableForCurrentReport}>
              <Icon name="Printer" className="mr-2 h-4 w-4" />
              Print Report
              <Icon name="ChevronDown" className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => handlePrintReport('profitability')}>
              Print Detailed Report
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handlePrintReport('profitabilitySummary')}>
              Print Summary Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <Button onClick={() => handlePrintReport(reportType)} variant="outline" disabled={isLoading || !isDataAvailableForCurrentReport}>
        <Icon name="Printer" className="mr-2 h-4 w-4" />
        Print Report
      </Button>
    );
  };

  return (
    <>
      <PageHeader title="Reports" description="Generate and print business reports." />
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={reportType} onValueChange={(value) => {
            const newReportType = value as ReportType;
            setReportType(newReportType);
            setGeneratedReportData(null); 
            setGeneratedProfitabilitySummaryData(null);
            setSelectedCustomerId('all');
            handleDatePresetChange('thisMonth');
          }}>
            <TabsList className="grid w-full grid-cols-5 sm:grid-cols-10">
              <TabsTrigger value="sales">Sales</TabsTrigger>
              <TabsTrigger value="salesByCustomer">Sales by Cust.</TabsTrigger>
              <TabsTrigger value="profitability">Profitability</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="statement">Statement</TabsTrigger>
              <TabsTrigger value="customerBalances">Outstanding</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="weeklySummary">Weekly</TabsTrigger>
              <TabsTrigger value="paymentByType">By Type</TabsTrigger>
            </TabsList>
          </Tabs>

          {(reportType !== 'customerBalances') && (
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
          
          {(reportType === 'customerBalances' || reportType === 'statement') && (
            <div className="space-y-2">
              <Label htmlFor="customer-select">Customer</Label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId} disabled={isLoadingCustomers || isLoading}>
                <SelectTrigger id="customer-select"><SelectValue placeholder="Select Customer" /></SelectTrigger>
                <SelectContent>
                  {reportType === 'customerBalances' && <SelectItem value="all">All Customers</SelectItem>}
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.companyName || `${customer.firstName} ${customer.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {reportType === 'customerBalances' && (
                  <p className="text-xs text-muted-foreground">
                    This report shows currently outstanding invoices. Date range is not applicable unless the 'Picked Up' filter is used.
                  </p>
              )}
               {reportType === 'customerBalances' && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="show-picked-up"
                    checked={showOnlyPickedUpUnpaid}
                    onCheckedChange={(checked) => setShowOnlyPickedUpUnpaid(!!checked)}
                  />
                  <Label htmlFor="show-picked-up" className="font-normal">
                    Only show invoices that are "Picked up" and not fully paid.
                  </Label>
                </div>
              )}
            </div>
          )}

          <div className="flex space-x-2">
            <Button 
              onClick={() => handleGenerateReport()} 
              disabled={isLoading || isLoadingCustomers || ((reportType !== 'customerBalances') && (!startDate || !endDate)) || (reportType === 'statement' && selectedCustomerId === 'all')}
            >
              {(isLoading || isLoadingCustomers) && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
              Generate Report
            </Button>
            {renderPrintButton()}
          </div>
        </CardContent>
      </Card>

      {generatedReportData && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{reportTitleForSummary || 'Generated Report'}</CardTitle>
             <CardContent className="pt-4 px-0">
                {renderReportSummary()}
                <div className="mt-4">{renderReportTable()}</div>
            </CardContent>
          </CardHeader>
        </Card>
      )}

      <div style={{ display: 'none' }}>
        {reportToPrintData && reportToPrintData.reportType === 'production' && (
            <PrintableProductionReport ref={printRef} reportItems={reportToPrintData.data as ProductionHistoryItem[]} companySettings={reportToPrintData.companySettings} startDate={reportToPrintData.startDate!} endDate={reportToPrintData.endDate!} logoUrl={reportToPrintData.logoUrl} />
        )}
        {reportToPrintData && reportToPrintData.reportType === 'salesByCustomer' && (
            <PrintableSalesByCustomerReport ref={printRef} reportItems={reportToPrintData.data as SalesByCustomerReportItem[]} companySettings={reportToPrintData.companySettings} startDate={reportToPrintData.startDate!} endDate={reportToPrintData.endDate!} logoUrl={reportToPrintData.logoUrl} />
        )}
        {reportToPrintData && reportToPrintData.reportType === 'sales' && (
          <PrintableSalesReport ref={printRef} invoices={reportToPrintData.data as Invoice[]} companySettings={reportToPrintData.companySettings} startDate={reportToPrintData.startDate!} endDate={reportToPrintData.endDate!} logoUrl={reportToPrintData.logoUrl} />
        )}
         {reportToPrintData && reportToPrintData.reportType === 'statement' && (
          <PrintableCustomerStatement ref={printRef} reportData={reportToPrintData.data as CustomerStatementReportData} companySettings={reportToPrintData.companySettings} logoUrl={reportToPrintData.logoUrl} />
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
        {reportToPrintData && reportToPrintData.reportType === 'profitabilitySummary' && (
          <PrintableProfitSummaryReport ref={printRef} reportData={reportToPrintData.data as ProfitSummaryItem[]} companySettings={reportToPrintData.companySettings} startDate={reportToPrintData.startDate!} endDate={reportToPrintData.endDate!} logoUrl={reportToPrintData.logoUrl}/>
        )}
      </div>
    </>
  );
}

    