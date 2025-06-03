
"use client"; // Marking as client component for useState and event handlers

import React, { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import { estimateEmailDraft } from '@/ai/flows/estimate-email-draft';
import type { Estimate, Customer } from '@/types';

// Mock data
const mockEstimates: Estimate[] = [
  { 
    id: 'est_1', 
    estimateNumber: 'EST-2024-001', 
    customerId: 'cust_1', 
    customerName: 'John Doe Fencing', 
    date: '2024-07-15', 
    total: 1250.75, 
    status: 'Sent', 
    lineItems: [
      { id: 'li_est_1', productId: 'prod_1', productName: '6ft Cedar Picket', quantity: 50, unitPrice: 3.50, total: 175.00 },
      { id: 'li_est_2', productId: 'prod_2', productName: '4x4x8 Pressure Treated Post', quantity: 10, unitPrice: 12.00, total: 120.00 },
    ], 
    subtotal: 1150.75, // Example value
    taxAmount: 100.00, // Example value
  },
  { 
    id: 'est_2', 
    estimateNumber: 'EST-2024-002', 
    customerId: 'cust_2', 
    customerName: 'Jane Smith Landscaping', 
    date: '2024-07-18', 
    total: 850.00, 
    status: 'Draft', 
    lineItems: [
      { id: 'li_est_3', productId: 'prod_4', productName: 'Stainless Steel Hinges', quantity: 4, unitPrice: 25.00, total: 100.00 },
    ], 
    subtotal: 800.00, // Example value
    taxAmount: 50.00, // Example value
  },
];

const mockCustomer: Customer = {
  id: 'cust_1',
  firstName: 'John',
  lastName: 'Doe',
  companyName: 'Doe Fencing Co.',
  phone: '555-1234',
  emailContacts: [{ id: 'ec_1', type: 'Main Contact', email: 'john.doe@doefencing.com' }],
  customerType: 'Fence Contractor',
};

export default function EstimatesPage() {
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null);
  const [emailDraft, setEmailDraft] = useState<{ subject?: string; body?: string } | null>(null);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const { toast } = useToast();

  const handleGenerateEmail = async (estimate: Estimate) => {
    setSelectedEstimate(estimate);
    setIsEmailModalOpen(true);
    setIsLoadingEmail(true);
    setEmailDraft(null); 

    try {
      const customerForEstimate = mockEstimates.find(e => e.id === estimate.id)?.customerId === mockCustomer.id ? mockCustomer : {
        firstName: estimate.customerName?.split(' ')[0] || "Valued",
        lastName: estimate.customerName?.split(' ').slice(1).join(' ') || "Customer",
        companyName: estimate.customerName?.includes(" ") ? undefined : estimate.customerName, // Basic heuristic
      };
      
      const estimateContent = `
        Estimate Number: ${estimate.estimateNumber}
        Date: ${estimate.date}
        Customer: ${estimate.customerName || 'Valued Customer'}
        Total: $${estimate.total.toFixed(2)}
        Items: 
        ${estimate.lineItems.map(item => `- ${item.productName} (Qty: ${item.quantity}, Price: $${item.unitPrice.toFixed(2)})`).join('\n') || 'Details to be confirmed.'}
      `;
      
      const result = await estimateEmailDraft({
        customerName: `${customerForEstimate.firstName} ${customerForEstimate.lastName}`,
        companyName: customerForEstimate.companyName,
        estimateContent: estimateContent,
      });
      
      setEmailDraft({ 
        subject: `Estimate ${estimate.estimateNumber} from Delaware Fence Pro`, 
        body: result.emailDraft 
      });
    } catch (error) {
      console.error("Error generating email draft:", error);
      toast({
        title: "Error",
        description: "Failed to generate email draft.",
        variant: "destructive",
      });
      setEmailDraft({ subject: "Error", body: "Could not generate email content."});
    } finally {
      setIsLoadingEmail(false);
    }
  };

  const handleSendEmail = () => {
    toast({
      title: "Email Sent (Simulation)",
      description: `Email draft for estimate ${selectedEstimate?.estimateNumber} would be sent.`,
    });
    setIsEmailModalOpen(false);
  };


  return (
    <>
      <PageHeader title="Estimates" description="Create and manage customer estimates.">
        <Button>
          <Icon name="PlusCircle" className="mr-2 h-4 w-4" />
          New Estimate
        </Button>
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockEstimates.map((estimate) => (
                <TableRow key={estimate.id}>
                  <TableCell>{estimate.estimateNumber}</TableCell>
                  <TableCell>{estimate.customerName}</TableCell>
                  <TableCell>{new Date(estimate.date).toLocaleDateString()}</TableCell>
                  <TableCell>${estimate.total.toFixed(2)}</TableCell>
                  <TableCell>{estimate.status}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => handleGenerateEmail(estimate)}>
                      <Icon name="Mail" className="mr-2 h-4 w-4" />
                      Email Draft
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedEstimate && (
        <Dialog open={isEmailModalOpen} onOpenChange={setIsEmailModalOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Email Draft for Estimate {selectedEstimate.estimateNumber}</DialogTitle>
              <DialogDescription>
                Review and send the email to {selectedEstimate.customerName}.
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
                  <Input id="emailSubject" value={emailDraft.subject || ''} readOnly />
                </div>
                <div>
                  <Label htmlFor="emailBody">Body</Label>
                  <Textarea id="emailBody" value={emailDraft.body || ''} readOnly rows={10} className="min-h-[200px]" />
                </div>
              </div>
            ) : (
               <p className="text-center py-4">Could not load email draft.</p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="button" onClick={handleSendEmail} disabled={isLoadingEmail || !emailDraft}>
                <Icon name="Send" className="mr-2 h-4 w-4" />
                Send Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
