
"use client";

import type { Customer } from '@/types';
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
import { CustomerDialog } from './customer-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import React from 'react';
import { format } from 'date-fns';

type CustomerWithLastInteraction = Customer & {
  lastEstimateDate?: string;
  lastOrderDate?: string;
};

interface CustomerTableProps {
  customers: CustomerWithLastInteraction[];
  onSave: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onDelete: (customerId: string) => void;
  onRowClick: (customerId: string) => void;
  sortConfig: { key: keyof CustomerWithLastInteraction; direction: 'asc' | 'desc' };
  requestSort: (key: keyof CustomerWithLastInteraction) => void;
}

const displayName = (c: Partial<Customer>) => {
  const byCompany = (c.companyName ?? "").trim();
  const byContact = (c.contactName ?? "").trim();
  return byCompany || byContact || "N/A";
};


export function CustomerTable({ customers, onSave, onDelete, onRowClick, sortConfig, requestSort }: CustomerTableProps) {
  const [customerToDelete, setCustomerToDelete] = React.useState<Customer | null>(null);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PP');
    } catch (error) {
      return 'Invalid Date';
    }
  };
  
  const renderSortArrow = (columnKey: keyof CustomerWithLastInteraction) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === 'asc' ? <Icon name="ChevronUp" className="inline ml-1 h-4 w-4" /> : <Icon name="ChevronDown" className="inline ml-1 h-4 w-4" />;
    }
    return null;
  };

  return (
    <>
      <div className="rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => requestSort('companyName')} className="cursor-pointer hover:bg-muted/50">
                Company Name {renderSortArrow('companyName')}
              </TableHead>
              <TableHead>Phone</TableHead>
              <TableHead onClick={() => requestSort('lastEstimateDate')} className="cursor-pointer hover:bg-muted/50">
                Last Estimate {renderSortArrow('lastEstimateDate')}
              </TableHead>
              <TableHead onClick={() => requestSort('lastOrderDate')} className="cursor-pointer hover:bg-muted/50">
                Last Order {renderSortArrow('lastOrderDate')}
              </TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id} onClick={() => onRowClick(customer.id)} className="cursor-pointer">
                <TableCell className="font-medium">{displayName(customer)}</TableCell>
                <TableCell>{customer.phone || 'N/A'}</TableCell>
                <TableCell>{formatDate(customer.lastEstimateDate)}</TableCell>
                <TableCell>{formatDate(customer.lastOrderDate)}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Icon name="MoreHorizontal" className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <CustomerDialog
                        customer={customer}
                        triggerButton={
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                        }
                        onSave={onSave}
                      />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive focus:bg-destructive/10"
                        onSelect={(e) => { e.preventDefault(); setCustomerToDelete(customer); }}
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
      </div>
      {customerToDelete && (
        <AlertDialog open={!!customerToDelete} onOpenChange={(isOpen) => !isOpen && setCustomerToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the customer 
                "{displayName(customerToDelete)}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCustomerToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onDelete(customerToDelete.id);
                  setCustomerToDelete(null);
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

    