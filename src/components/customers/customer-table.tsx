
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
import { Badge } from '@/components/ui/badge';
import { CustomerDialog } from './customer-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CustomerTableProps {
  customers: Customer[];
  onSave: (customer: Customer) => void; // Added onSave prop
}

export function CustomerTable({ customers, onSave }: CustomerTableProps) {
  // In a real app, delete would call an API. For now, it's a placeholder.
  const handleDeleteCustomer = (customerId: string) => {
    console.log("Deleting customer (simulation):", customerId);
    // To actually remove from the list, you'd need to lift state or use a global state manager.
    // For now, this action won't update the UI directly.
    alert(`Simulating delete for customer ID: ${customerId}. Implement actual deletion logic.`);
  };

  return (
    <div className="rounded-lg border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Company</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Primary Email</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell className="font-medium">{customer.firstName} {customer.lastName}</TableCell>
              <TableCell>{customer.companyName || 'N/A'}</TableCell>
              <TableCell><Badge variant="outline">{customer.customerType}</Badge></TableCell>
              <TableCell>{customer.phone}</TableCell>
              <TableCell>{customer.emailContacts.find(ec => ec.type === 'Main Contact')?.email || customer.emailContacts[0]?.email || 'N/A'}</TableCell>
              <TableCell>
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
                      onSave={onSave} // Pass the onSave prop here
                    />
                    <DropdownMenuItem 
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onClick={() => handleDeleteCustomer(customer.id)}
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
  );
}

    