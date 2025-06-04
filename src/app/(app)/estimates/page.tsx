
"use client"; 

import React, { useState, useEffect } from 'react';
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
import { useToast } from "@/hooks/use-toast";
import { estimateEmailDraft } from '@/ai/flows/estimate-email-draft';
import type { Estimate, Product, Customer, CustomerType, EmailContactType } from '@/types';
import { EstimateDialog } from '@/components/estimates/estimate-dialog';

// Initial mock data for customers
const initialMockCustomers: Customer[] = [
  {
    id: 'cust_1',
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'Doe Fencing Co.',
    phone: '555-1234',
    emailContacts: [{ id: 'ec_1', type: 'Main Contact', email: 'john.doe@doefencing.com' }],
    customerType: 'Fence Contractor',
    address: { street: '123 Main St', city: 'Anytown', state: 'DE', zip: '19901' }
  },
  {
    id: 'cust_2',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '555-5678',
    emailContacts: [
      { id: 'ec_2', type: 'Main Contact', email: 'jane.smith@example.com' },
      { id: 'ec_3', type: 'Billing', email: 'billing@jsmithscapes.com' }
    ],
    customerType: 'Landscaper',
    companyName: 'J. Smith Landscaping',
    address: { street: '456 Oak Ave', city: 'Anycity', state: 'DE', zip: '19902' }
  },
  {
    id: 'cust_3',
    firstName: 'Robert',
    lastName: 'Johnson',
    phone: '555-9101',
    emailContacts: [{ id: 'ec_4', type: 'Main Contact', email: 'robert.johnson@email.com' }],
    customerType: 'Home Owner',
  },
];

// Initial mock data for estimates
const initialMockEstimates: Estimate[] = [
  {
    id: 'est_1',
    estimateNumber: 'EST-2024-001',
    customerId: 'cust_1', 
    customerName: 'Doe Fencing Co.',
    date: '2024-07-15',
    total: 295.00, 
    status: 'Sent',
    lineItems: [
      { id: 'li_est_1', productId: 'prod_1', productName: '6ft Cedar Picket', quantity: 50, unitPrice: 3.50, total: 175.00 },
      { id: 'li_est_2', productId: 'prod_2', productName: '4x4x8 Pressure Treated Post', quantity: 10, unitPrice: 12.00, total: 120.00 },
    ],
    subtotal: 295.00, 
    taxAmount: 0.00,
  },
  {
    id: 'est_2',
    estimateNumber: 'EST-2024-002',
    customerId: 'cust_2', 
    customerName: 'J. Smith Landscaping',
    date: '2024-07-18',
    total: 125.00, 
    status: 'Draft',
    lineItems: [
      { id: 'li_est_3', productId: 'prod_4', productName: 'Stainless Steel Hinges', quantity: 4, unitPrice: 25.00, total: 100.00 },
      { id: 'li_est_4', productId: 'prod_5', productName: 'Post Caps', quantity: 10, unitPrice: 2.50, total: 25.00 },
    ],
    subtotal: 125.00, 
    taxAmount: 0.00,
  },
];

// Mock products data 
const mockProducts: Product[] = [
  { id: 'prod_1', name: '6ft Cedar Picket', category: 'Fencing', unit: 'piece', price: 3.50, cost: 2.00, markupPercentage: 75, description: 'Standard cedar fence picket' },
  { id: 'prod_2', name: '4x4x8 Pressure Treated Post', category: 'Posts', unit: 'piece', price: 12.00, cost: 8.00, markupPercentage: 50, description: 'Ground contact rated post' },
  { id: 'prod_3', name: 'Vinyl Gate Kit', category: 'Gates', unit: 'kit', price: 150.00, cost: 100.00, markupPercentage: 50, description: 'Complete vinyl gate kit' },
  { id: 'prod_4', name: 'Stainless Steel Hinges', category: 'Hardware', unit: 'pair', price: 25.00, cost: 15.00, markupPercentage: 66.67, description: 'Heavy duty gate hinges' },
  { id: 'prod_5', name: 'Post Caps', category: 'Accessories', unit: 'piece', price: 2.50, cost: 1.00, markupPercentage: 150, description: 'Decorative post cap' },
];


export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>(initialMockEstimates);
  const [customers, setCustomers] = useState<Customer[]>(initialMockCustomers);
  const [selectedEstimateForEmail, setSelectedEstimateForEmail] = useState<Estimate | null>(null);
  const [estimateToDelete, setEstimateToDelete] = useState<Estimate | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject?: string; body?: string } | null>(null);
  const [editableSubject, setEditableSubject] = useState<string>('');
  const [editableBody, setEditableBody] = useState<string>('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSaveEstimate = (estimateToSave: Estimate) => {
    setEstimates(prevEstimates => {
      const index = prevEstimates.findIndex(e => e.id === estimateToSave.id);
      if (index !== -1) {
        const updatedEstimates = [...prevEstimates];
        updatedEstimates[index] = estimateToSave;
        toast({ title: "Estimate Updated", description: `Estimate ${estimateToSave.estimateNumber} has been updated.` });
        return updatedEstimates;
      } else {
        toast({ title: "Estimate Added", description: `Estimate ${estimateToSave.estimateNumber} has been added.` });
        return [...prevEstimates, { ...estimateToSave, id: estimateToSave.id || crypto.randomUUID() }];
      }
    });
  };

  const handleDeleteEstimate = (estimateId: string) => {
    setEstimates(prevEstimates => prevEstimates.filter(e => e.id !== estimateId));
    toast({ title: "Estimate Deleted", description: "The estimate has been removed." });
    setEstimateToDelete(null);
  };

  const handleGenerateEmail = async (estimate: Estimate) => {
    setSelectedEstimateForEmail(estimate);
    setIsEmailModalOpen(true);
    setIsLoadingEmail(true);
    setEmailDraft(null);
    setEditableSubject('');
    setEditableBody('');

    try {
      const lineItemsDescription = estimate.lineItems.map(item => 
        `- ${item.productName} (Qty: ${item.quantity}, Unit Price: $${item.unitPrice.toFixed(2)}, Total: $${item.total.toFixed(2)})`
      ).join('\n');
      
      const customer = customers.find(c => c.id === estimate.customerId);
      const customerDisplayName = customer ? (customer.companyName || `${customer.firstName} ${customer.lastName}`) : (estimate.customerName || 'Valued Customer');
      const customerCompanyName = customer?.companyName;

      const estimateContent = `
        Estimate Number: ${estimate.estimateNumber}
        Date: ${new Date(estimate.date).toLocaleDateString()}
        Customer: ${customerDisplayName}
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
      console.error("Error generating email draft:", error);
      toast({ title: "Error", description: "Failed to generate email draft.", variant: "destructive" });
      setEmailDraft({ subject: "Error", body: "Could not generate email content."});
      setEditableSubject("Error generating subject");
      setEditableBody("Could not generate email content.");
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleSendEmail = () => {
    toast({
      title: "Email Sent (Simulation)",
      description: `Email with subject "${editableSubject}" for estimate ${selectedEstimateForEmail?.estimateNumber} would be sent.`,
    });
    setIsEmailModalOpen(false);
  };

  const formatDate = (dateString: string) => {
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
          products={mockProducts}
          customers={customers}
        />
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle>All Estimates</CardTitle>
          <CardDescription>A list of all estimates in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimates.map((estimate) => (
                <TableRow key={estimate.id}>
                  <TableCell>{estimate.estimateNumber}</TableCell>
                  <TableCell>{estimate.customerName}</TableCell>
                  <TableCell>{formatDate(estimate.date)}</TableCell>
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
                        <EstimateDialog
                          estimate={estimate}
                          triggerButton={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                          }
                          onSave={handleSaveEstimate}
                          products={mockProducts}
                          customers={customers}
                        />
                        <DropdownMenuItem onClick={() => handleGenerateEmail(estimate)}>
                          <Icon name="Mail" className="mr-2 h-4 w-4" /> Email Draft
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
              <div className="flex flex-col justify-center items-center h-40 space-y-2">
                <Icon name="Loader2" className="h-8 w-8 animate-spin text-primary" />
                <p>Loading email draft...</p>
              </div>
            ) : emailDraft ? (
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="emailSubject">Subject</Label>
                  <Input id="emailSubject" value={editableSubject} onChange={(e) => setEditableSubject(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="emailBody">Body</Label>
                  <Textarea id="emailBody" value={editableBody} onChange={(e) => setEditableBody(e.target.value)} rows={10} className="min-h-[200px]" />
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
    </>
  );
}

