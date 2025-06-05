
"use client";

import React from 'react';
import type { Invoice, Customer, Product } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { InvoiceDialog } from './invoice-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from '@/lib/utils';

interface InvoiceTableProps {
  invoices: Invoice[];
  onSave: (invoice: Invoice) => void;
  onDelete: (invoiceId: string) => void;
  onGenerateEmail: (invoice: Invoice) => void;
  onPrint: (invoice: Invoice) => void;
  formatDate: (dateString: string | undefined) => string;
  customers: Customer[];
  products: Product[];
}

export function InvoiceTable({ invoices, onSave, onDelete, onGenerateEmail, onPrint, formatDate, customers, products }: InvoiceTableProps) {
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<Invoice | null>(null);

  const getStatusVariant = (status: Invoice['status']): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'Paid':
        return 'default'; 
      case 'Partially Paid':
        return 'secondary'; 
      case 'Sent':
        return 'outline'; 
      case 'Draft':
        return 'outline'; 
      case 'Voided':
        return 'destructive';
      default:
        return 'outline';
    }
  };


  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>P.O. #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Paid</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[80px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>{invoice.invoiceNumber}</TableCell>
              <TableCell>{invoice.customerName}</TableCell>
              <TableCell>{invoice.poNumber || 'N/A'}</TableCell>
              <TableCell>{formatDate(invoice.date)}</TableCell>
              <TableCell>{formatDate(invoice.dueDate)}</TableCell>
              <TableCell className="text-right">${invoice.total.toFixed(2)}</TableCell>
              <TableCell className="text-right">${(invoice.amountPaid || 0).toFixed(2)}</TableCell>
              <TableCell className="text-right">${(invoice.balanceDue || invoice.total).toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(invoice.status)}
                       className={cn(
                           invoice.status === 'Paid' && 'bg-green-500 hover:bg-green-600 text-white',
                           invoice.status === 'Partially Paid' && 'bg-yellow-500 hover:bg-yellow-600 text-black',
                       )}
                >
                    {invoice.status}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Icon name="MoreHorizontal" className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <InvoiceDialog
                      invoice={invoice}
                      triggerButton={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                      }
                      onSave={onSave}
                      customers={customers}
                      products={products}
                    />
                    <DropdownMenuItem onClick={() => onGenerateEmail(invoice)}>
                      <Icon name="Mail" className="mr-2 h-4 w-4" /> Email Invoice
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPrint(invoice)}>
                      <Icon name="Printer" className="mr-2 h-4 w-4" /> Print Invoice
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onSelect={() => setInvoiceToDelete(invoice)}
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

      {invoiceToDelete && (
        <AlertDialog open={!!invoiceToDelete} onOpenChange={(isOpen) => !isOpen && setInvoiceToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete invoice "{invoiceToDelete.invoiceNumber}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setInvoiceToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { onDelete(invoiceToDelete.id); setInvoiceToDelete(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
