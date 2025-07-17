
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

type SortableInvoiceKeys = 
  'invoiceNumber' | 'customerName' | 'poNumber' | 'date' | 'dueDate' | 
  'total' | 'amountPaid' | 'balanceDue' | 'status';

interface InvoiceTableProps {
  invoices: Invoice[];
  onSave: (invoice: Invoice) => void;
  onDelete: (invoiceId: string) => void;
  onGenerateEmail: (invoice: Invoice) => void;
  onPrint: (invoice: Invoice) => void;
  onPrintPackingSlip: (invoice: Invoice) => void;
  formatDate: (dateString: string | undefined, options?: Intl.DateTimeFormatOptions) => string;
  customers: Customer[];
  products: Product[];
  productCategories: string[];
  onViewItems: (invoice: Invoice) => void;
  sortConfig: { key: SortableInvoiceKeys; direction: 'asc' | 'desc' };
  requestSort: (key: SortableInvoiceKeys) => void;
  renderSortArrow: (columnKey: SortableInvoiceKeys) => JSX.Element | null;
}

export function InvoiceTable({ 
  invoices, 
  onSave, 
  onDelete, 
  onGenerateEmail, 
  onPrint, 
  onPrintPackingSlip, 
  formatDate, 
  customers, 
  products, 
  productCategories, 
  onViewItems,
  sortConfig,
  requestSort,
  renderSortArrow
}: InvoiceTableProps) {
  const [invoiceToDelete, setInvoiceToDelete] = React.useState<Invoice | null>(null);

  const getStatusVariant = (status: Invoice['status']): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'Paid':
        return 'default'; 
      case 'Partially Paid':
        return 'secondary'; 
      case 'Ready for pick up':
         return 'secondary';
      case 'Picked up':
         return 'default';
      case 'Sent':
      case 'Ordered':
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
            <TableHead onClick={() => requestSort('invoiceNumber')} className="cursor-pointer hover:bg-muted/50">
              Number {renderSortArrow('invoiceNumber')}
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
            <TableHead onClick={() => requestSort('dueDate')} className="cursor-pointer hover:bg-muted/50">
              Due Date {renderSortArrow('dueDate')}
            </TableHead>
            <TableHead onClick={() => requestSort('total')} className="text-right cursor-pointer hover:bg-muted/50">
              Total {renderSortArrow('total')}
            </TableHead>
            <TableHead onClick={() => requestSort('amountPaid')} className="text-right cursor-pointer hover:bg-muted/50">
              Paid {renderSortArrow('amountPaid')}
            </TableHead>
            <TableHead onClick={() => requestSort('balanceDue')} className="text-right cursor-pointer hover:bg-muted/50">
              Balance {renderSortArrow('balanceDue')}
            </TableHead>
            <TableHead onClick={() => requestSort('status')} className="cursor-pointer hover:bg-muted/50">
              Status {renderSortArrow('status')}
            </TableHead>
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
              <TableCell className="text-right text-green-600">${(invoice.amountPaid || 0).toFixed(2)}</TableCell>
              <TableCell className={cn("text-right", (invoice.balanceDue !== undefined && invoice.balanceDue > 0) ? "text-destructive" : "text-green-600")}>
                  ${(invoice.balanceDue || 0).toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(invoice.status)}
                       className={cn(
                           invoice.status === 'Paid' && 'bg-green-500 hover:bg-green-600 text-white',
                           invoice.status === 'Partially Paid' && 'bg-yellow-500 hover:bg-yellow-600 text-black',
                           invoice.status === 'Ready for pick up' && 'bg-yellow-500 hover:bg-yellow-600 text-black',
                           invoice.status === 'Picked up' && 'bg-green-500 hover:bg-green-600 text-white',
                       )}
                >
                    {invoice.status}
                     {invoice.status === 'Ready for pick up' && invoice.readyForPickUpDate && ` (${formatDate(invoice.readyForPickUpDate, { month: '2-digit', day: '2-digit' })})`}
                     {invoice.status === 'Picked up' && invoice.pickedUpDate && ` (${formatDate(invoice.pickedUpDate, { month: '2-digit', day: '2-digit' })})`}
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
                    <DropdownMenuItem onClick={() => onViewItems(invoice)}>
                      <Icon name="Layers" className="mr-2 h-4 w-4" /> View Items
                    </DropdownMenuItem>
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
                      productCategories={productCategories}
                    />
                    <DropdownMenuItem onClick={() => onGenerateEmail(invoice)}>
                      <Icon name="Mail" className="mr-2 h-4 w-4" /> Email Invoice
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPrint(invoice)}>
                      <Icon name="Printer" className="mr-2 h-4 w-4" /> Print Invoice
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPrintPackingSlip(invoice)}>
                      <Icon name="PackageCheck" className="mr-2 h-4 w-4" /> Print Packing Slip
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
