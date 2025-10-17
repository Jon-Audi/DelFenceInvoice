
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/hooks/use-toast";
import { estimateEmailDraft } from '@/ai/flows/estimate-email-draft';
import type { Estimate, Product, Customer, CompanySettings, EmailContact } from '@/types';
import { EstimateDialog } from '@/components/estimates/estimate-dialog';
import type { EstimateFormData } from '@/components/estimates/estimate-form';
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, getDoc, deleteField } from 'firebase/firestore';
import PrintableEstimate from '@/components/estimates/printable-estimate';
import { LineItemsViewerDialog } from '@/components/shared/line-items-viewer-dialog';
import { cn } from '@/lib/utils';
// Removed Firebase Functions imports: import { getFunctions, httpsCallable } from 'firebase/functions';

type SortableEstimateKeys = 'estimateNumber' | 'customerName' | 'poNumber' | 'date' | 'total' | 'status' | 'validUntil';
const COMPANY_SETTINGS_DOC_ID = "main";

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [isLoadingEstimates, setIsLoadingEstimates] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const [selectedEstimateForEmail, setSelectedEstimateForEmail] = useState<Estimate | null>(null);
  const [targetCustomerForEmail, setTargetCustomerForEmail] = useState<Customer | null>(null);
  const [selectedRecipientEmails, setSelectedRecipientEmails] = useState<string[]>([]);
  const [additionalRecipientEmail, setAdditionalRecipientEmail] = useState<string>('');

  const [estimateToDelete, setEstimateToDelete] = useState<Estimate | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject?: string; body?: string } | null>(null);
  const [editableSubject, setEditableSubject] = useState<string>('');
  const [editableBody, setEditableBody] = useState<string>('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false); // Used for AI draft generation and actual send
  const { toast } = useToast();
  const router = useRouter();
  const conversionHandled = useRef(false);
  const [isClient, setIsClient] = useState(false);
  const [stableProductCategories, setStableProductCategories] = useState<string[]>([]);
  const [stableProductSubcategories, setStableProductSubcategories] = useState<string[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortableEstimateKeys; direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

  const [estimateForViewingItems, setEstimateForViewingItems] = useState<Estimate | null>(null);
  const [isLineItemsViewerOpen, setIsLineItemsViewerOpen] = useState(false);

  const [estimateToPrint, setEstimateToPrint] = useState<any | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState<boolean>(false);
  const [clonedEstimateData, setClonedEstimateData] = useState<Partial<EstimateFormData> | null>(null);


  // Removed Firebase Functions instance: const functionsInstance = getFunctions();
  // Removed callable function: const sendEmailFunction = httpsCallable(functionsInstance, 'sendEmailWithMailerSend');


  useEffect(() => {
    setIsClient(true);
    if (conversionHandled.current) return;
     if (typeof window !== 'undefined') {
      const pendingEstimateRaw = localStorage.getItem("estimateToConvert_invoice");
      if (pendingEstimateRaw) {
        conversionHandled.current = true;
        // Clear the item to prevent re-triggering, but don't parse if empty
        localStorage.removeItem("estimateToConvert_invoice");
        if (pendingEstimateRaw.trim()) {
           // Conversion logic to invoice is handled on the invoice page
        }
      }
    }
  }, []);

  useEffect(() => {
    setIsLoadingEstimates(true);
    const unsubscribe = onSnapshot(collection(db, 'estimates'), (snapshot) => {
      const fetchedEstimates: Estimate[] = [];
      snapshot.forEach((docSnap) => {
        fetchedEstimates.push({ ...docSnap.data() as Omit<Estimate, 'id'>, id: docSnap.id });
      });
      setEstimates(fetchedEstimates);
      setIsLoadingEstimates(false);
    }, (error) => {
      toast({ title: "Error", description: "Could not fetch estimates.", variant: "destructive" });
      setIsLoadingEstimates(false);
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
      toast({ title: "Error", description: "Could not fetch customers for estimates.", variant: "destructive" });
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
      toast({ title: "Error", description: "Could not fetch products for estimates.", variant: "destructive" });
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
        const newSubcategories = Array.from(new Set(products.map(p => p.subcategory).filter(Boolean) as string[])).sort();
        setStableProductSubcategories(currentStableSubcategories => {
            if (JSON.stringify(newSubcategories) !== JSON.stringify(currentStableSubcategories)) {
                return newSubcategories;
            }
            return currentStableSubcategories;
        });
    } else {
        setStableProductCategories(currentStableCategories => {
            if (currentStableCategories.length > 0) return [];
            return currentStableCategories;
        });
        setStableProductSubcategories(currentStableSubcategories => {
            if (currentStableSubcategories.length > 0) return [];
            return currentStableSubcategories;
        });
    }
  }, [products]);

  const handleSaveEstimate = async (estimateToSave: Estimate) => {
    const { id, ...estimateData } = estimateToSave;

    // Create a clean payload object, only including defined and non-empty values
    const payload: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(estimateData)) {
      if (value !== undefined && value !== null && value !== '') {
        payload[key] = value;
      }
    }

    try {
      if (id && estimates.some(e => e.id === id)) {
        // UPDATE existing document
        const estimateRef = doc(db, 'estimates', id);
        await setDoc(estimateRef, payload, { merge: true });
        toast({ title: "Estimate Updated", description: `Estimate ${estimateToSave.estimateNumber} has been updated.` });
      } else {
        // ADD new document
        const docRef = await addDoc(collection(db, 'estimates'), payload);
        toast({ title: "Estimate Added", description: `Estimate ${estimateToSave.estimateNumber} has been added with ID: ${docRef.id}.` });
      }
    } catch (error: any) {
        toast({ title: "Error", description: `Could not save estimate to database. ${error.message}`, variant: "destructive" });
    }
  };

  const handleSaveCustomer = async (customerToSave: Customer): Promise<string | void> => {
    const { id, ...customerData } = customerToSave;
    try {
      if (id && customers.some(c => c.id === id)) {
        const customerRef = doc(db, 'customers', id);
        await setDoc(customerRef, customerData, { merge: true });
        toast({ title: "Customer Updated", description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been updated.` });
        return id;
      } else {
        const dataToSave = { ...customerData };
        const docRef = await addDoc(collection(db, 'customers'), dataToSave);
        toast({ title: "Customer Added", description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been added.` });
        return docRef.id;
      }
    } catch (error) {
      toast({ title: "Error", description: "Could not save customer to database.", variant: "destructive" });
    }
  };

  const handleSaveProduct = async (productToSave: Omit<Product, 'id'>): Promise<string | void> => {
      try {
        const docRef = await addDoc(collection(db, 'products'), productToSave);
        toast({
          title: "Product Added",
          description: `Product ${productToSave.name} has been added to the product list.`,
        });
        return docRef.id;
      } catch (error) {
        console.error("Error saving new product from estimate:", error);
        toast({
          title: "Error Saving Product",
          description: "Could not save the new item to the product list.",
          variant: "destructive",
        });
      }
  };


  const handleDeleteEstimate = async (estimateId: string) => {
    try {
      await deleteDoc(doc(db, 'estimates', estimateId));
      toast({ title: "Estimate Deleted", description: "The estimate has been removed." });
    } catch (error) {
      toast({ title: "Error", description: "Could not delete estimate.", variant: "destructive" });
    }
    setEstimateToDelete(null);
  };
  
  const handleCloneEstimate = (estimateToClone: Estimate) => {
    const newEstimateData: Partial<EstimateFormData> = {
      ...estimateToClone,
      estimateNumber: `EST-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
      customerId: '', // Clear customer so user has to select a new one
      customerName: '',
      date: new Date(),
      status: 'Draft',
      validUntil: undefined, // Or adjust as needed, e.g., date + 30 days
      lineItems: estimateToClone.lineItems.map(li => ({
        ...li,
        isNonStock: li.isNonStock || false,
        isReturn: li.isReturn || false,
        addToProductList: li.addToProductList ?? false,
      })),
    };
    setClonedEstimateData(newEstimateData);
    setIsCloneDialogOpen(true);
  };


  const handleGenerateEmail = async (estimate: Estimate) => {
    setSelectedEstimateForEmail(estimate);
    const customer = customers.find(c => c.id === estimate.customerId);
    setTargetCustomerForEmail(customer || null);
    setSelectedRecipientEmails([]);
    setAdditionalRecipientEmail('');
    setIsEmailModalOpen(true);
    setIsLoadingEmail(true);
    setEmailDraft(null);
    setEditableSubject('');
    setEditableBody('');
    try {
      const lineItemsDescription = estimate.lineItems.map(item =>
        `- ${item.productName} (Qty: ${item.quantity}, Unit Price: $${item.unitPrice.toFixed(2)}, Total: $${item.total.toFixed(2)})`
      ).join('\n');
      const customerDisplayName = customer ? (customer.companyName || `${customer.firstName} ${customer.lastName}`) : (estimate.customerName || 'Valued Customer');
      const customerCompanyName = customer?.companyName;
      const estimateContent = `
        Estimate Number: ${estimate.estimateNumber}
        Date: ${new Date(estimate.date).toLocaleDateString()}
        Customer: ${customerDisplayName}
        ${estimate.poNumber ? `P.O. Number: ${estimate.poNumber}` : ''}
        Total: $${estimate.total.toFixed(2)}
        Items:
        ${lineItemsDescription || 'Details to be confirmed.'}
      `;
      const result = await estimateEmailDraft({
        customerName: customerDisplayName,
        companyName: customerCompanyName,
        estimateContent: estimateContent,
      });
      const subject = `Estimate ${estimate.estimateNumber} from Delaware Fence Pro`;
      setEmailDraft({ subject: subject, body: result.emailDraft });
      setEditableSubject(subject);
      setEditableBody(result.emailDraft);
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate email draft.", variant: "destructive" });
      setEmailDraft({ subject: "Error", body: "Could not generate email content."});
      setEditableSubject("Error generating subject");
      setEditableBody("Could not generate email content.");
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedEstimateForEmail || !editableSubject || !editableBody) {
        toast({ title: "Error", description: "Email content or estimate details missing.", variant: "destructive"});
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
      // Write to Firestore 'emails' collection
      await addDoc(collection(db, 'emails'), {
        to: finalRecipients,
        // from: { email: 'your-default-from@example.com', name: 'Your Company Name' }, // Optional: if extension allows override
        subject: editableSubject,
        html: editableBody,
        // You can add other fields like 'template_id', 'variables' if your extension supports them
      });
      toast({
        title: "Email Queued",
        description: `Email for estimate ${selectedEstimateForEmail.estimateNumber} has been queued for sending.`,
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

  const formatDateForDisplay = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    if (!isClient) return new Date(dateString).toISOString().split('T')[0];
    return new Date(dateString).toLocaleDateString();
  };

  const handleConvertToOrder = (estimate: Estimate) => {
    localStorage.setItem('estimateToConvert_order', JSON.stringify(estimate));
    router.push('/orders');
  };

  const handleConvertToInvoice = (estimate: Estimate) => {
    localStorage.setItem('estimateToConvert_invoice', JSON.stringify(estimate));
    router.push('/invoices');
  };

  const handleViewItems = (estimateToView: Estimate) => {
    setEstimateForViewingItems(estimateToView);
    setIsLineItemsViewerOpen(true);
  };

  const requestSort = (key: SortableEstimateKeys) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key) {
      direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      if (key === 'date' || key === 'total' || key === 'validUntil') {
        direction = 'desc';
      } else {
        direction = 'asc';
      }
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredEstimates = useMemo(() => {
    let sortableItems = estimates.filter(estimate => {
        if (!searchTerm.trim()) return true;
        const lowercasedFilter = searchTerm.toLowerCase();
        const searchFields = [
            estimate.estimateNumber,
            estimate.customerName,
            estimate.poNumber,
            estimate.status,
        ];
        return searchFields.some(field =>
            field && field.toLowerCase().includes(lowercasedFilter)
        );
    });

    if (sortConfig.key) {
      sortableItems.sort((a, b) => {
        const valA = a[sortConfig.key as keyof Estimate];
        const valB = b[sortConfig.key as keyof Estimate];
        let comparison = 0;
        if (valA === null || valA === undefined) comparison = 1;
        else if (valB === null || valB === undefined) comparison = -1;
        else if (sortConfig.key === 'date' || sortConfig.key === 'validUntil') {
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
  }, [estimates, searchTerm, sortConfig]);

  const renderSortArrow = (columnKey: SortableEstimateKeys) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === 'asc' ? <Icon name="ChevronUp" className="inline ml-1 h-4 w-4" /> : <Icon name="ChevronDown" className="inline ml-1 h-4 w-4" />;
    }
    return null;
  };

  const fetchCompanySettings = async (): Promise<CompanySettings | null> => {
    try {
      const docRef = doc(db, 'companySettings', COMPANY_SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as CompanySettings;
      }
      return null;
    } catch (error) {
      console.error("Error fetching company settings:", error);
      toast({ title: "Error", description: "Could not fetch company settings for printing.", variant: "destructive" });
      return null;
    }
  };
  
  const handlePrepareAndPrint = async (estimate: Estimate) => {
    const customer = customers.find(c => c.id === estimate.customerId);
    const companySettings = await fetchCompanySettings();
    const absoluteLogoUrl = window.location.origin + '/Logo.png';

    const estimateDataForPrint = {
      estimateNumber: estimate.estimateNumber,
      date: formatDateForDisplay(estimate.date),
      poNumber: estimate.poNumber || '',
      customerName: estimate.customerName || 'N/A',
      customerPhone: customer?.phone,
      customerEmail: customer?.emailContacts?.find(e => e.type === 'Main Contact')?.email || customer?.emailContacts?.[0]?.email,
      items: estimate.lineItems.map(li => ({
        description: li.productName + (li.isReturn ? " (Return)" : ""),
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        total: li.total,
      })),
      subtotal: estimate.subtotal,
      total: estimate.total,
      logoUrl: absoluteLogoUrl,
      disclaimer: companySettings?.estimateDisclaimer,
    };
    setEstimateToPrint(estimateDataForPrint);

    setTimeout(() => {
      if (printRef.current) {
        const printContents = printRef.current.innerHTML;
        const win = window.open('', '_blank');
        if (win) {
          win.document.write('<html><head><title>Print Estimate</title>');
          win.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">');
          win.document.write('<style>body { margin: 0; } .print-only-container { width: 100%; min-height: 100vh; } </style>');
          win.document.write('</head><body>');
          win.document.write(printContents);
          win.document.write('</body></html>');
          win.document.close();
          win.focus(); 
          setTimeout(() => { 
            win.print();
            win.close();
          }, 750); 
        } else {
          toast({ title: "Print Error", description: "Popup blocked. Please allow popups for this site.", variant: "destructive" });
        }
      } else {
        toast({ title: "Print Error", description: "Printable content not found. Ref is null.", variant: "destructive" });
      }
      setEstimateToPrint(null); 
    }, 100); 
  };


  if (isLoadingEstimates || isLoadingCustomers || isLoadingProducts) {
    return (
      <PageHeader title="Estimates" description="Loading estimates database...">
        <div className="flex items-center justify-center h-32">
          <Icon name="Loader2" className="h-8 w-8 animate-spin" />
        </div>
      </PageHeader>
    );
  }

  return (
    <>
      <PageHeader title="Estimates" description="Create and manage customer estimates.">
        <EstimateDialog
          triggerButton={
            <Button>
              <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
              New Estimate
            </Button>
          }
          onSave={handleSaveEstimate}
          onSaveCustomer={handleSaveCustomer}
          onSaveProduct={handleSaveProduct}
          products={products}
          customers={customers}
          productCategories={stableProductCategories}
          productSubcategories={stableProductSubcategories}
        />
      </PageHeader>
      
      {clonedEstimateData && (
        <EstimateDialog
          isOpen={isCloneDialogOpen}
          onOpenChange={setIsCloneDialogOpen}
          initialData={clonedEstimateData}
          onSave={handleSaveEstimate}
          onSaveCustomer={handleSaveCustomer}
          onSaveProduct={handleSaveProduct}
          products={products}
          customers={customers}
          productCategories={stableProductCategories}
          productSubcategories={stableProductSubcategories}
        />
       )}

      <Card>
        <CardHeader>
          <CardTitle>All Estimates</CardTitle>
          <CardDescription>A list of all estimates in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by #, customer, PO, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm mb-4"
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => requestSort('estimateNumber')} className="cursor-pointer hover:bg-muted/50">
                  Number {renderSortArrow('estimateNumber')}
                </TableHead>
                <TableHead onClick={() => requestSort('customerName')} className="cursor-pointer hover:bg-muted/50">
                  Customer {renderSortArrow('customerName')}
                </TableHead>
                <TableHead onClick={() => requestSort('poNumber')} className="cursor-pointer hover:bg-muted/50">
                  P.O. # {renderSortArrow('poNumber')}
                </TableHead>
                <TableHead onClick={() => requestSort('date')} className="cursor-pointer hover:bg-muted/50">
                  Date {renderSortArrow('date')}
                </TableHead>
                <TableHead onClick={() => requestSort('total')} className="text-right cursor-pointer hover:bg-muted/50">
                  Total {renderSortArrow('total')}
                </TableHead>
                <TableHead onClick={() => requestSort('status')} className="cursor-pointer hover:bg-muted/50">
                  Status {renderSortArrow('status')}
                </TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredEstimates.map((estimate) => {
                return (
                  <TableRow key={estimate.id}>
                    <TableCell>{estimate.estimateNumber}</TableCell>
                    <TableCell>{estimate.customerName}</TableCell>
                    <TableCell>{estimate.poNumber || 'N/A'}</TableCell>
                    <TableCell>{formatDateForDisplay(estimate.date)}</TableCell>
                    <TableCell className="text-right">${estimate.total.toFixed(2)}</TableCell>
                    <TableCell><Badge variant={estimate.status === 'Sent' || estimate.status === 'Accepted' ? 'default' : 'outline'}>{estimate.status}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Icon name="MoreHorizontal" className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewItems(estimate)}>
                            <Icon name="Layers" className="mr-2 h-4 w-4" /> View Items
                          </DropdownMenuItem>
                          <EstimateDialog
                            estimate={estimate}
                            triggerButton={
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            }
                            onSave={handleSaveEstimate}
                            onSaveCustomer={handleSaveCustomer}
                            onSaveProduct={handleSaveProduct}
                            products={products}
                            customers={customers}
                            productCategories={stableProductCategories}
                            productSubcategories={stableProductSubcategories}
                          />
                          <DropdownMenuItem onClick={() => handleCloneEstimate(estimate)}>
                            <Icon name="Copy" className="mr-2 h-4 w-4" /> Clone Estimate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGenerateEmail(estimate)}>
                            <Icon name="Mail" className="mr-2 h-4 w-4" /> Email Draft
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePrepareAndPrint(estimate)}>
                             <Icon name="Printer" className="mr-2 h-4 w-4" /> Print Estimate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleConvertToOrder(estimate)}>
                            <Icon name="ShoppingCart" className="mr-2 h-4 w-4" /> Convert to Order
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleConvertToInvoice(estimate)}>
                            <Icon name="FileDigit" className="mr-2 h-4 w-4" /> Convert to Invoice
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onSelect={() => setEstimateToDelete(estimate)}
                          >
                            <Icon name="Trash2" className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
           {sortedAndFilteredEstimates.length === 0 && (
            <p className="p-4 text-center text-muted-foreground">
              {estimates.length === 0 ? "No estimates found." : "No estimates match your search."}
            </p>
          )}
        </CardContent>
      </Card>

      {selectedEstimateForEmail && (
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Email Draft for Estimate {selectedEstimateForEmail.estimateNumber}</DialogTitle>
              <DialogDescription>
                Review and send the email to {selectedEstimateForEmail.customerName}.
              </DialogDescription>
            </DialogHeader>
            {isLoadingEmail && !emailDraft ? ( // Show this loader only when generating AI draft
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
                            id={`email-contact-${contact.id}`}
                            checked={selectedRecipientEmails.includes(contact.email)}
                            onCheckedChange={(checked) => {
                              setSelectedRecipientEmails(prev =>
                                checked ? [...prev, contact.email] : prev.filter(e => e !== contact.email)
                              );
                            }}
                          />
                          <Label htmlFor={`email-contact-${contact.id}`} className="text-sm font-normal">
                            {contact.email} ({contact.type} - {contact.name || 'N/A'})
                          </Label>
                        </div>
                      ))}
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-2">No saved email contacts for this customer.</p>
                  )}
                  <FormFieldWrapper>
                    <Label htmlFor="additionalEmail">Or add another email:</Label>
                    <Input
                      id="additionalEmail"
                      type="email"
                      placeholder="another@example.com"
                      value={additionalRecipientEmail}
                      onChange={(e) => setAdditionalRecipientEmail(e.target.value)}
                    />
                  </FormFieldWrapper>
                </div>
                <Separator />
                <div>
                  <Label htmlFor="emailSubject">Subject</Label>
                  <Input id="emailSubject" value={editableSubject} onChange={(e) => setEditableSubject(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="emailBody">Body</Label>
                  <Textarea id="emailBody" value={editableBody} onChange={(e) => setEditableBody(e.target.value)} rows={8} className="min-h-[150px]" />
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

      {estimateToDelete && (
        <AlertDialog open={!!estimateToDelete} onOpenChange={(isOpen) => !isOpen && setEstimateToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete estimate "{estimateToDelete.estimateNumber}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setEstimateToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteEstimate(estimateToDelete.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <div style={{ display: 'none' }}>
        {estimateToPrint && (
          <PrintableEstimate ref={printRef} {...estimateToPrint} />
        )}
      </div>

      {estimateForViewingItems && (
        <LineItemsViewerDialog
          isOpen={isLineItemsViewerOpen}
          onOpenChange={setIsLineItemsViewerOpen}
          lineItems={estimateForViewingItems.lineItems}
          documentType="Estimate"
          documentNumber={estimateForViewingItems.estimateNumber}
        />
      )}
    </>
  );
}

const FormFieldWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="space-y-1">{children}</div>
);

    
