
"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { db } from '@/lib/firebase';
import { collection, addDoc, setDoc, deleteDoc, onSnapshot, doc, getDoc, deleteField } from 'firebase/firestore';
import { PrintableEstimate } from '@/components/estimates/printable-estimate';
import { LineItemsViewerDialog } from '@/components/shared/line-items-viewer-dialog';

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
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [stableProductCategories, setStableProductCategories] = useState<string[]>([]);

  const [estimateForPrinting, setEstimateForPrinting] = useState<Estimate | null>(null);
  const [companySettingsForPrinting, setCompanySettingsForPrinting] = useState<CompanySettings | null>(null);
  const [isLoadingCompanySettings, setIsLoadingCompanySettings] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const [estimateForViewingItems, setEstimateForViewingItems] = useState<Estimate | null>(null);
  const [isLineItemsViewerOpen, setIsLineItemsViewerOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    setIsLoadingEstimates(true);
    const unsubscribe = onSnapshot(collection(db, 'estimates'), (snapshot) => {
      const fetchedEstimates: Estimate[] = [];
      snapshot.forEach((docSnap) => {
        fetchedEstimates.push({ ...docSnap.data() as Omit<Estimate, 'id'>, id: docSnap.id });
      });
      setEstimates(fetchedEstimates.sort((a, b) => a.estimateNumber.localeCompare(b.estimateNumber)));
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
    } else {
        setStableProductCategories(currentStableCategories => {
            if (currentStableCategories.length > 0) {
                return [];
            }
            return currentStableCategories;
        });
    }
  }, [products]);


  const handleSaveEstimate = async (estimateToSave: Estimate) => {
    const { id, ...estimateDataFromDialog } = estimateToSave;

    const basePayload: any = {
      estimateNumber: estimateDataFromDialog.estimateNumber,
      customerId: estimateDataFromDialog.customerId,
      customerName: estimateDataFromDialog.customerName,
      date: estimateDataFromDialog.date,
      status: estimateDataFromDialog.status,
      lineItems: estimateDataFromDialog.lineItems,
      subtotal: estimateDataFromDialog.subtotal,
      taxAmount: estimateDataFromDialog.taxAmount || 0,
      total: estimateDataFromDialog.total,
    };

    try {
      if (id && estimates.some(e => e.id === id)) { 
        const estimateRef = doc(db, 'estimates', id);
        const updatePayload = { ...basePayload };

        updatePayload.poNumber = (estimateDataFromDialog.poNumber && estimateDataFromDialog.poNumber.trim() !== '') 
                                  ? estimateDataFromDialog.poNumber.trim() 
                                  : deleteField();
        updatePayload.validUntil = estimateDataFromDialog.validUntil ? estimateDataFromDialog.validUntil : deleteField();
        updatePayload.notes = (estimateDataFromDialog.notes && estimateDataFromDialog.notes.trim() !== '') 
                               ? estimateDataFromDialog.notes.trim() 
                               : deleteField();
        updatePayload.internalNotes = (estimateDataFromDialog.internalNotes && estimateDataFromDialog.internalNotes.trim() !== '') 
                                      ? estimateDataFromDialog.internalNotes.trim() 
                                      : deleteField();
        
        await setDoc(estimateRef, updatePayload, { merge: true });
        toast({ title: "Estimate Updated", description: `Estimate ${estimateToSave.estimateNumber} has been updated.` });
      } else { 
        const addPayload = { ...basePayload };

        if (estimateDataFromDialog.poNumber && estimateDataFromDialog.poNumber.trim() !== '') {
          addPayload.poNumber = estimateDataFromDialog.poNumber.trim();
        }
        if (estimateDataFromDialog.validUntil) {
          addPayload.validUntil = estimateDataFromDialog.validUntil;
        }
        if (estimateDataFromDialog.notes && estimateDataFromDialog.notes.trim() !== '') {
          addPayload.notes = estimateDataFromDialog.notes.trim();
        }
        if (estimateDataFromDialog.internalNotes && estimateDataFromDialog.internalNotes.trim() !== '') {
          addPayload.internalNotes = estimateDataFromDialog.internalNotes.trim();
        }
        
        const docRef = await addDoc(collection(db, 'estimates'), addPayload);
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
        toast({
          title: "Customer Updated",
          description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been updated.`,
        });
        return id;
      } else {
        const dataToSave = { ...customerData };
        const docRef = await addDoc(collection(db, 'customers'), dataToSave);
        toast({
          title: "Customer Added",
          description: `Customer ${customerToSave.firstName} ${customerToSave.lastName} has been added.`,
        });
        return docRef.id;
      }
    } catch (error) {
      
      toast({
        title: "Error",
        description: "Could not save customer to database.",
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

  const fetchCompanySettings = async (): Promise<CompanySettings | null> => {
    setIsLoadingCompanySettings(true);
    try {
      const docRef = doc(db, 'companySettings', COMPANY_SETTINGS_DOC_ID);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as CompanySettings;
      }
      toast({ title: "Company Settings Not Found", description: "Please configure company settings for printing.", variant: "default" });
      return null;
    } catch (error) {
      
      toast({ title: "Error", description: "Could not fetch company settings.", variant: "destructive" });
      return null;
    } finally {
      setIsLoadingCompanySettings(false);
    }
  };

  const handlePrintEstimate = async (estimate: Estimate) => {
    const settings = await fetchCompanySettings();
    if (settings) {
      setCompanySettingsForPrinting(settings);
      setEstimateForPrinting(estimate);
    } else {
      toast({ title: "Cannot Print", description: "Company settings are required for printing.", variant: "destructive"});
    }
  };

  const handlePrinted = () => {
    setEstimateForPrinting(null);
    setCompanySettingsForPrinting(null);
  };

  useEffect(() => {
    if (estimateForPrinting && companySettingsForPrinting && !isLoadingCompanySettings) {
      
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.print();
          handlePrinted(); 
        });
      });
    }
  }, [estimateForPrinting, companySettingsForPrinting, isLoadingCompanySettings]);


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

      const subject = `Estimate ${estimate.estimateNumber} from Delaware Fence Solutions`;
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

  const handleSendEmail = () => {
    const allRecipients: string[] = [...selectedRecipientEmails];
    if (additionalRecipientEmail.trim() !== "") {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(additionalRecipientEmail.trim())) {
        allRecipients.push(additionalRecipientEmail.trim());
      } else {
        toast({ title: "Invalid Email", description: "The additional email address is not valid.", variant: "destructive" });
        return;
      }
    }

    if (allRecipients.length === 0) {
      toast({ title: "No Recipients", description: "Please select or add at least one email recipient.", variant: "destructive" });
      return;
    }

    toast({
      title: "Email Sent (Simulation)",
      description: `Email with subject "${editableSubject}" for estimate ${selectedEstimateForEmail?.estimateNumber} would be sent to: ${allRecipients.join(', ')}.`,
      duration: 7000,
    });
    setIsEmailModalOpen(false);
  };

  const formatDateForDisplay = (dateString: string) => {
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

  const filteredEstimates = useMemo(() => {
    if (!searchTerm.trim()) {
      return estimates;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return estimates.filter(estimate => {
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
  }, [estimates, searchTerm]);


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
          products={products}
          customers={customers}
          productCategories={stableProductCategories}
        />
      </PageHeader>

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
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>P.O. #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEstimates.map((estimate) => (
                <TableRow key={estimate.id}>
                  <TableCell>{estimate.estimateNumber}</TableCell>
                  <TableCell>{estimate.customerName}</TableCell>
                  <TableCell>{estimate.poNumber || 'N/A'}</TableCell>
                  <TableCell>{formatDateForDisplay(estimate.date)}</TableCell>
                  <TableCell>${estimate.total.toFixed(2)}</TableCell>
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
                          products={products}
                          customers={customers}
                          productCategories={stableProductCategories}
                        />
                        <DropdownMenuItem onClick={() => handleGenerateEmail(estimate)}>
                          <Icon name="Mail" className="mr-2 h-4 w-4" /> Email Draft
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrintEstimate(estimate)}>
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
              ))}
            </TableBody>
          </Table>
           {filteredEstimates.length === 0 && (
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
            {isLoadingEmail ? (
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
                <Icon name="Send" className="mr-2 h-4 w-4" /> Send Email
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

      <div className="print-only-container">
        {(estimateForPrinting && companySettingsForPrinting && !isLoadingCompanySettings) && (
          <PrintableEstimate
            estimate={estimateForPrinting}
            companySettings={companySettingsForPrinting}
          />
        )}
      </div>
       {(isLoadingCompanySettings && estimateForPrinting) && ( 
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <Icon name="Loader2" className="h-10 w-10 animate-spin text-white" />
            <p className="ml-2 text-white">Preparing printable estimate...</p>
        </div>
      )}
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

// Simple wrapper to mimic FormField structure for layout if needed
const FormFieldWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <div className="space-y-1">{children}</div>
);

