
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { generateInvoiceEmailDraft } from '@/ai/flows/invoice-email-draft';
import type { Invoice, Customer, Product, Estimate, Order, CompanySettings, EmailContact } from '@/types';
import { InvoiceDialog } from '@/components/invoices/invoice-dialog';
import type { InvoiceFormData } from '@/components/invoices/invoice-form';
import { InvoiceTable } from '@/components/invoices/invoice-table';
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, getDoc, deleteField } from 'firebase/firestore';
import { PrintableInvoice } from '@/components/invoices/printable-invoice';
import { PrintableInvoicePackingSlip } from '@/components/invoices/printable-invoice-packing-slip';
import { LineItemsViewerDialog } from '@/components/shared/line-items-viewer-dialog';
import { cn } from '@/lib/utils';
// Removed Firebase Functions imports: import { getFunctions, httpsCallable } from 'firebase/functions';

const COMPANY_SETTINGS_DOC_ID = "main";

type SortableInvoiceKeys =
  'invoiceNumber' | 'customerName' | 'poNumber' | 'date' | 'dueDate' |
  'total' | 'amountPaid' | 'balanceDue' | 'status';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stableProductCategories, setStableProductCategories] = useState<string[]>([]);

  const [isLoadingInvoices, setIsLoadingInvoices] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [selectedInvoiceForEmail, setSelectedInvoiceForEmail] = useState<Invoice | null>(null);
  const [targetCustomerForEmail, setTargetCustomerForEmail] = useState<Customer | null>(null);
  const [selectedRecipientEmails, setSelectedRecipientEmails] = useState<string[]>([]);
  const [additionalRecipientEmail, setAdditionalRecipientEmail] = useState<string>('');

  const [emailDraft, setEmailDraft] = useState<{ subject?: string; body?: string } | null>(null);
  const [editableSubject, setEditableSubject] = useState<string>('');
  const [editableBody, setEditableBody] = useState<string>('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const { toast } = useToast();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  const [isConvertingInvoice, setIsConvertingInvoice] = useState(false);
  const [conversionInvoiceData, setConversionInvoiceData] = useState<InvoiceFormData | null>(null);

  const printRef = React.useRef<HTMLDivElement>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<any | null>(null);
  const [packingSlipToPrintForInvoice, setPackingSlipToPrintForInvoice] = useState<any | null>(null);
  
  // Removed Firebase Functions instance: const functionsInstance = getFunctions();
  // Removed callable function: const sendEmailFunction = httpsCallable(functionsInstance, 'sendEmailWithMailerSend');


  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableInvoiceKeys; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });


  const [invoiceForViewingItems, setInvoiceForViewingItems] = useState<Invoice | null>(null);
  const [isLineItemsViewerOpen, setIsLineItemsViewerOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const pendingEstimateRaw = localStorage.getItem('estimateToConvert_invoice');
    const pendingOrderRaw = localStorage.getItem('orderToConvert_invoice');
    let newInvoiceData: InvoiceFormData | null = null;

    if (pendingEstimateRaw) {
      localStorage.removeItem('estimateToConvert_invoice');
      try {
        const estimateToConvert = JSON.parse(pendingEstimateRaw) as Estimate;
        newInvoiceData = {
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
          customerId: estimateToConvert.customerId,
          date: new Date(),
          status: 'Draft',
          poNumber: estimateToConvert.poNumber || '',
          lineItems: estimateToConvert.lineItems.map(li => ({
            id: li.id,
            productId: li.productId,
            productName: li.productName,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            isReturn: li.isReturn || false,
            isNonStock: li.isNonStock || false,
          })),
          notes: estimateToConvert.notes || '',
          paymentTerms: 'Due upon receipt',
          dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
          currentPaymentAmount: undefined,
          currentPaymentDate: undefined,
          currentPaymentMethod: undefined,
          currentPaymentNotes: '',
        };
      } catch (error) {
        console.error("Error processing estimate for invoice conversion:", error);
        toast({ title: "Conversion Error", description: "Could not process estimate data for invoice.", variant: "destructive" });
      }
    } else if (pendingOrderRaw) {
      localStorage.removeItem('orderToConvert_invoice');
      try {
        const orderToConvert = JSON.parse(pendingOrderRaw) as Order;
         newInvoiceData = {
          invoiceNumber: `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
          customerId: orderToConvert.customerId,
          date: new Date(),
          status: 'Draft',
          poNumber: orderToConvert.poNumber || '',
          lineItems: orderToConvert.lineItems.map(li => ({
            id: li.id,
            productId: li.productId,
            productName: li.productName,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            isReturn: li.isReturn || false,
            isNonStock: li.isNonStock || false,
          })),
          notes: `Converted from Order #${orderToConvert.orderNumber}. ${orderToConvert.notes || ''}`.trim(),
          paymentTerms: 'Due upon receipt',
          dueDate: new Date(new Date().setDate(new Date().getDate() + 30)),
          currentPaymentAmount: undefined,
          currentPaymentDate: undefined,
          currentPaymentMethod: undefined,
          currentPaymentNotes: '',
        };
      } catch (error) {
        console.error("Error processing order for invoice conversion:", error);
        toast({ title: "Conversion Error", description: "Could not process order data for invoice.", variant: "destructive" });
      }
    }

    if (newInvoiceData) {
        setConversionInvoiceData(newInvoiceData);
    }
  }, [toast]);

  useEffect(() => {
    if (conversionInvoiceData && !isLoadingProducts && !isLoadingCustomers) {
      setIsConvertingInvoice(true);
    }
  }, [conversionInvoiceData, isLoadingProducts, isLoadingCustomers]);


  useEffect(() => {
    setIsLoadingInvoices(true);
    const unsubscribe = onSnapshot(collection(db, 'invoices'), (snapshot) => {
      const fetchedInvoices: Invoice[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedInvoices.push({
             ...data as Omit<Invoice, 'id' | 'total' | 'amountPaid' | 'balanceDue'>,
             id: docSnap.id,
             total: data.total || 0,
             amountPaid: data.amountPaid || 0,
             balanceDue: data.balanceDue !== undefined ? data.balanceDue : (data.total || 0) - (data.amountPaid || 0),
             payments: data.payments || [],
             poNumber: data.poNumber || undefined,
           });
      });
      setInvoices(fetchedInvoices);
      setIsLoadingInvoices(false);
    }, (error) => {
      console.error("Error fetching invoices:", error);
      toast({ title: "Error", description: "Could not fetch invoices.", variant: "destructive" });
      setIsLoadingInvoices(false);
    });
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    setIsLoadingCustomers(true);
    const unsubscribe = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const fetchedCustomers: Customer[] = [];
      snapshot.forEach((docSnap) => {
        fetchedCustomers.push({ ...docSnap.data() as Omit<Customer, 'id'>, id: docSnap.id });
      });
      setCustomers(fetchedCustomers);
      setIsLoadingCustomers(false);
    }, (error) => {
      console.error("Error fetching customers:", error);
      toast({ title: "Error", description: "Could not fetch customers for invoices.", variant: "destructive" });
      setIsLoadingCustomers(false);
    });
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    setIsLoadingProducts(true);
    const unsubscribe = onSnapshot(collection(db, 'products'), (snapshot) => {
      const fetchedProducts: Product[] = [];
      snapshot.forEach((docSnap) => {
        fetchedProducts.push({ ...docSnap.data() as Omit<Product, 'id'>, id: docSnap.id });
      });
      setProducts(fetchedProducts);
      setIsLoadingProducts(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      toast({ title: "Error", description: "Could not fetch products for invoices.", variant: "destructive" });
      setIsLoadingProducts(false);
    });
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (products && products.length > 0) {
        const newCategories = Array.from(new Set(products.map(p => p.category))).sort();
        setStableProductCategories(currentStableCategories => {
            if (JSON.stringify(newCategories) !== JSON.stringify(currentStableCategories)) {
                return newCategories;
            }
            return currentStableCategories;
        });
    } else {
        setStableProductCategories(currentStableCategories => {
            if (currentStableCategories.length > 0) {
                return [];
            }
            return currentStableCategories;
        });
    }
  }, [products]);

  const handleSaveInvoice = async (invoiceToSave: Invoice) => {
    const { id, ...invoiceDataFromDialog } = invoiceToSave;

    const basePayload: any = {
      invoiceNumber: invoiceDataFromDialog.invoiceNumber,
      customerId: invoiceDataFromDialog.customerId,
      customerName: invoiceDataFromDialog.customerName,
      date: invoiceDataFromDialog.date,
      status: invoiceDataFromDialog.status,
      lineItems: invoiceDataFromDialog.lineItems,
      subtotal: invoiceDataFromDialog.subtotal,
      taxAmount: invoiceDataFromDialog.taxAmount || 0,
      total: invoiceDataFromDialog.total,
      payments: invoiceDataFromDialog.payments || [],
      amountPaid: invoiceDataFromDialog.amountPaid || 0,
    };
    basePayload.balanceDue = (basePayload.total || 0) - (basePayload.amountPaid || 0);


    try {
      if (id && invoices.some(i => i.id === id)) {
        const invoiceRef = doc(db, 'invoices', id);
        const updatePayload = { ...basePayload };

        updatePayload.poNumber = (invoiceDataFromDialog.poNumber && invoiceDataFromDialog.poNumber.trim() !== '')
                                  ? invoiceDataFromDialog.poNumber.trim()
                                  : deleteField();
        updatePayload.dueDate = invoiceDataFromDialog.dueDate ? invoiceDataFromDialog.dueDate : deleteField();
        updatePayload.paymentTerms = (invoiceDataFromDialog.paymentTerms && invoiceDataFromDialog.paymentTerms.trim() !== '')
                                     ? invoiceDataFromDialog.paymentTerms.trim()
                                     : deleteField();
        updatePayload.notes = (invoiceDataFromDialog.notes && invoiceDataFromDialog.notes.trim() !== '')
                               ? invoiceDataFromDialog.notes.trim()
                               : deleteField();

        await setDoc(invoiceRef, updatePayload, { merge: true });
        toast({ title: "Invoice Updated", description: `Invoice ${invoiceToSave.invoiceNumber} has been updated.` });
      } else {
        const addPayload = { ...basePayload };

        if (invoiceDataFromDialog.poNumber && invoiceDataFromDialog.poNumber.trim() !== '') {
          addPayload.poNumber = invoiceDataFromDialog.poNumber.trim();
        }
        if (invoiceDataFromDialog.dueDate) {
          addPayload.dueDate = invoiceDataFromDialog.dueDate;
        }
        if (invoiceDataFromDialog.paymentTerms && invoiceDataFromDialog.paymentTerms.trim() !== '') {
          addPayload.paymentTerms = invoiceDataFromDialog.paymentTerms.trim();
        }
        if (invoiceDataFromDialog.notes && invoiceDataFromDialog.notes.trim() !== '') {
          addPayload.notes = invoiceDataFromDialog.notes.trim();
        }

        const docRef = await addDoc(collection(db, 'invoices'), addPayload);
        toast({ title: "Invoice Added", description: `Invoice ${invoiceToSave.invoiceNumber} has been added with ID: ${docRef.id}.` });
      }
    } catch (error: any) {
        console.error("Error saving invoice:", error);
        toast({ title: "Error", description: `Could not save invoice to database. ${error.message}`, variant: "destructive" });
    }

    if (isConvertingInvoice) {
        setIsConvertingInvoice(false);
        setConversionInvoiceData(null);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await deleteDoc(doc(db, 'invoices', invoiceId));
      toast({ title: "Invoice Deleted", description: "The invoice has been removed." });
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast({ title: "Error", description: "Could not delete invoice.", variant: "destructive" });
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    if (!isClient) return new Date(dateString).toISOString().split('T')[0];
    return new Date(dateString).toLocaleDateString();
  };

  const fetchCompanySettings = async (): Promise<CompanySettings | null> => {
    try {
      const docRef = doc(db, 'companySettings', COMPANY_SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
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

 const handlePrepareAndPrintInvoice = async (invoice: Invoice) => {
    const settings = await fetchCompanySettings();
    if (settings) {
      setInvoiceToPrint({
        invoice: invoice,
        companySettings: settings,
        logoUrl: typeof window !== "undefined" ? `${window.location.origin}/Logo.png` : "/Logo.png",
      });
      setPackingSlipToPrintForInvoice(null);
      setTimeout(() => {
        if (printRef.current) {
          const printContents = printRef.current.innerHTML;
          const win = window.open('', '_blank');
          if (win) {
            win.document.write('<html><head><title>Print Invoice</title>');
            win.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">');
            win.document.write('<style>body { margin: 0; } .print-only-container { width: 100%; min-height: 100vh; } @media print { body { size: auto; margin: 0; } .print-only { display: block !important; } .print-only-container { display: block !important; } }</style>');
            win.document.write('</head><body>');
            win.document.write(printContents);
            win.document.write('</body></html>');
            win.document.close();
            win.focus();
            setTimeout(() => { win.print(); win.close(); }, 750);
          } else {
            toast({ title: "Print Error", description: "Popup blocked.", variant: "destructive" });
          }
        }
        setInvoiceToPrint(null);
      }, 100);
    } else {
      toast({ title: "Cannot Print", description: "Company settings are required.", variant: "destructive" });
    }
  };

  const handlePrepareAndPrintInvoicePackingSlip = async (invoice: Invoice) => {
    const settings = await fetchCompanySettings();
    if (settings) {
      setPackingSlipToPrintForInvoice({
        invoice: invoice,
        companySettings: settings,
        logoUrl: typeof window !== "undefined" ? `${window.location.origin}/Logo.png` : "/Logo.png",
      });
      setInvoiceToPrint(null);
      setTimeout(() => {
        if (printRef.current) {
          const printContents = printRef.current.innerHTML;
          const win = window.open('', '_blank');
          if (win) {
            win.document.write('<html><head><title>Print Packing Slip</title>');
            win.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">');
            win.document.write('<style>body { margin: 0; } .print-only-container { width: 100%; min-height: 100vh; } @media print { body { size: auto; margin: 0; } .print-only { display: block !important; } .print-only-container { display: block !important; } }</style>');
            win.document.write('</head><body>');
            win.document.write(printContents);
            win.document.write('</body></html>');
            win.document.close();
            win.focus();
            setTimeout(() => { win.print(); win.close(); }, 750);
          } else {
            toast({ title: "Print Error", description: "Popup blocked.", variant: "destructive" });
          }
        }
        setPackingSlipToPrintForInvoice(null);
      }, 100);
    } else {
      toast({ title: "Cannot Print", description: "Company settings are required.", variant: "destructive" });
    }
  };


  const handleGenerateEmail = async (invoice: Invoice) => {
    setSelectedInvoiceForEmail(invoice);
    const customer = customers.find(c => c.id === invoice.customerId);
    setTargetCustomerForEmail(customer || null);
    setSelectedRecipientEmails([]);
    setAdditionalRecipientEmail('');

    setIsEmailModalOpen(true);
    setIsLoadingEmail(true);
    setEmailDraft(null);
    setEditableSubject('');
    setEditableBody('');

    try {
      const customerDisplayName = customer ? (customer.companyName || `${customer.firstName} ${customer.lastName}`) : (invoice.customerName || 'Valued Customer');
      const customerCompanyName = customer?.companyName;

      const invoiceItemsDescription = invoice.lineItems.map(item =>
        `- ${item.productName} (Qty: ${item.quantity}, Unit Price: $${item.unitPrice.toFixed(2)}, Total: $${item.total.toFixed(2)})`
      ).join('\n') || 'Services/Products as per invoice.';

      const companyNameForDisplay = (await fetchCompanySettings())?.companyName || "Delaware Fence Pro";


      const result = await generateInvoiceEmailDraft({
        customerName: customerDisplayName,
        companyName: customerCompanyName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: new Date(invoice.date).toLocaleDateString(),
        invoiceTotal: invoice.total,
        invoiceItems: invoiceItemsDescription,
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : undefined,
        companyNameToDisplay: companyNameForDisplay,
      });

      setEmailDraft({ subject: result.subject, body: result.body });
      setEditableSubject(result.subject);
      setEditableBody(result.body);
    } catch (error) {
      console.error("Error generating email draft:", error);
      toast({ title: "Error", description: "Failed to generate email draft.", variant: "destructive" });
      setEmailDraft({ subject: "Error generating subject", body: "Could not generate email content."});
      setEditableSubject("Error generating subject");
      setEditableBody("Could not generate email content.");
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedInvoiceForEmail || !editableSubject || !editableBody) {
        toast({ title: "Error", description: "Email content or invoice details missing.", variant: "destructive"});
        return;
    }

    const finalRecipients: { email: string; name: string }[] = [];
    if (targetCustomerForEmail && targetCustomerForEmail.emailContacts) {
        selectedRecipientEmails.forEach(selEmail => {
            const contact = targetCustomerForEmail.emailContacts.find(ec => ec.email === selEmail);
            if (contact) {
                finalRecipients.push({ email: contact.email, name: contact.name || '' });
            }
        });
    }
    if (additionalRecipientEmail.trim() !== "") {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(additionalRecipientEmail.trim())) {
          if (!finalRecipients.some(r => r.email === additionalRecipientEmail.trim())) {
              finalRecipients.push({ email: additionalRecipientEmail.trim(), name: '' });
          }
      } else {
        toast({ title: "Invalid Email", description: "The additional email address is not valid.", variant: "destructive" });
        return;
      }
    }

    if (finalRecipients.length === 0) {
      toast({ title: "No Recipients", description: "Please select or add at least one email recipient.", variant: "destructive" });
      return;
    }
    
    setIsLoadingEmail(true);
    try {
      await addDoc(collection(db, 'emails'), {
        to: finalRecipients,
        subject: editableSubject,
        html: editableBody,
      });
      toast({
        title: "Email Queued",
        description: `Email for invoice ${selectedInvoiceForEmail.invoiceNumber} has been queued for sending.`,
      });
      setIsEmailModalOpen(false);
    } catch (error: any) {
      console.error("Error queueing email:", error);
      toast({
        title: "Email Queue Failed",
        description: error.message || "Could not queue the email. Check Firestore permissions and console.",
        variant: "destructive",
        duration: 7000,
      });
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleViewItems = (invoiceToView: Invoice) => {
    setInvoiceForViewingItems(invoiceToView);
    setIsLineItemsViewerOpen(true);
  };

  const requestSort = (key: SortableInvoiceKeys) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      if (key === 'date' || key === 'dueDate' || key === 'total' || key === 'amountPaid' || key === 'balanceDue') {
        direction = 'desc';
      } else {
        direction = 'asc';
      }
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredInvoices = useMemo(() => {
    let sortableItems = invoices.filter(invoice => {
        if (!searchTerm.trim()) return true;
        const lowercasedFilter = searchTerm.toLowerCase();
        const searchFields = [
            invoice.invoiceNumber,
            invoice.customerName,
            invoice.poNumber,
            invoice.status,
        ];
        return searchFields.some(field =>
            field && field.toLowerCase().includes(lowercasedFilter)
        );
    });

    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key as keyof Invoice];
        const valB = b[sortConfig.key as keyof Invoice];

        let comparison = 0;

        if (valA === null || valA === undefined) comparison = 1;
        else if (valB === null || valB === undefined) comparison = -1;
        else if (sortConfig.key === 'date' || sortConfig.key === 'dueDate') {
          comparison = new Date(valA as string).getTime() - new Date(valB as string).getTime();
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
        } else {
          comparison = String(valA).toLowerCase().localeCompare(String(valB).toLowerCase());
        }
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    return sortableItems;
  }, [invoices, searchTerm, sortConfig]);

  const renderSortArrow = (columnKey: SortableInvoiceKeys) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === 'asc' ? <Icon name="ChevronUp" className="inline ml-1 h-4 w-4" /> : <Icon name="ChevronDown" className="inline ml-1 h-4 w-4" />;
    }
    return null;
  };


  if (isLoadingInvoices || isLoadingCustomers || isLoadingProducts) {
    return (
      <PageHeader title="Invoices" description="Loading invoices database...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="Invoices" description="Create and manage customer invoices.">
        <InvoiceDialog
            triggerButton={
              <Button>
                <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
                New Invoice
              </Button>
            }
            onSave={handleSaveInvoice}
            customers={customers}
            products={products}
            productCategories={stableProductCategories}
          />
      </PageHeader>

      {isConvertingInvoice && conversionInvoiceData && (
        <InvoiceDialog
            isOpen={isConvertingInvoice}
            onOpenChange={(open) => {
                setIsConvertingInvoice(open);
                if (!open) setConversionInvoiceData(null);
            }}
            initialData={conversionInvoiceData}
            onSave={handleSaveInvoice}
            customers={customers}
            products={products}
            productCategories={stableProductCategories}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>A list of all invoices in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by #, customer, PO, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm mb-4"
          />
          <InvoiceTable
            invoices={sortedAndFilteredInvoices}
            onSave={handleSaveInvoice}
            onDelete={handleDeleteInvoice}
            onGenerateEmail={handleGenerateEmail}
            onPrint={handlePrepareAndPrintInvoice}
            onPrintPackingSlip={handlePrepareAndPrintInvoicePackingSlip}
            formatDate={formatDate}
            customers={customers}
            products={products}
            productCategories={stableProductCategories}
            onViewItems={handleViewItems}
            sortConfig={sortConfig}
            requestSort={requestSort}
            renderSortArrow={renderSortArrow}
          />
           {sortedAndFilteredInvoices.length === 0 && (
            <p className="p-4 text-center text-muted-foreground">
              {invoices.length === 0 ? "No invoices found." : "No invoices match your search."}
            </p>
          )}
        </CardContent>
      </Card>

      {selectedInvoiceForEmail && (
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Email Draft for Invoice {selectedInvoiceForEmail.invoiceNumber}</DialogTitle>
              <DialogDescription>
                Review and send the email to {selectedInvoiceForEmail.customerName}.
              </DialogDescription>
            </DialogHeader>
            {isLoadingEmail && !emailDraft ? (
              <div className="flex flex-col justify-center items-center h-60 space-y-2">
                 <Icon name="Loader2" className="h-8 w-8 animate-spin text-primary" />
                 <p>Loading email draft...</p>
              </div>
            ) : emailDraft ? (
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Recipients</Label>
                  {targetCustomerForEmail && targetCustomerForEmail.emailContacts.length > 0 ? (
                    <ScrollArea className="h-24 w-full rounded-md border p-2 mb-2">
                      {targetCustomerForEmail.emailContacts.map((contact: EmailContact) => (
                        <div key={contact.id} className="flex items-center space-x-2 mb-1">
                          <Checkbox
                            id={`email-contact-invoice-${contact.id}`}
                            checked={selectedRecipientEmails.includes(contact.email)}
                            onCheckedChange={(checked) => {
                              setSelectedRecipientEmails(prev =>
                                checked ? [...prev, contact.email] : prev.filter(e => e !== contact.email)
                              );
                            }}
                          />
                          <Label htmlFor={`email-contact-invoice-${contact.id}`} className="text-sm font-normal">
                            {contact.email} ({contact.type} - {contact.name || 'N/A'})
                          </Label>
                        </div>
                      ))}
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-2">No saved email contacts for this customer.</p>
                  )}
                  <FormFieldWrapper>
                    <Label htmlFor="additionalEmailInvoice">Or add another email:</Label>
                    <Input
                      id="additionalEmailInvoice"
                      type="email"
                      placeholder="another@example.com"
                      value={additionalRecipientEmail}
                      onChange={(e) => setAdditionalRecipientEmail(e.target.value)}
                    />
                  </FormFieldWrapper>
                </div>
                <Separator />
                <div>
                  <Label htmlFor="emailSubjectInvoice">Subject</Label>
                  <Input id="emailSubjectInvoice" value={editableSubject} onChange={(e) => setEditableSubject(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="emailBodyInvoice">Body</Label>
                  <Textarea id="emailBodyInvoice" value={editableBody} onChange={(e) => setEditableBody(e.target.value)} rows={8} className="min-h-[150px]" />
                </div>
              </div>
            ) : ( <p className="text-center py-4">Could not load email draft.</p> )}
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
              <Button type="button" onClick={handleSendEmail} disabled={isLoadingEmail || !emailDraft}>
                {isLoadingEmail && <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />}
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div style={{ display: 'none' }}>
        {invoiceToPrint && <PrintableInvoice ref={printRef} {...invoiceToPrint} />}
        {packingSlipToPrintForInvoice && <PrintableInvoicePackingSlip ref={printRef} {...packingSlipToPrintForInvoice} />}
      </div>

      {invoiceForViewingItems && (
        <LineItemsViewerDialog
          isOpen={isLineItemsViewerOpen}
          onOpenChange={setIsLineItemsViewerOpen}
          lineItems={invoiceForViewingItems.lineItems}
          documentType="Invoice"
          documentNumber={invoiceForViewingItems.invoiceNumber}
        />
      )}
    </>
  );
}

const FormFieldWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="space-y-1">{children}</div>
);
