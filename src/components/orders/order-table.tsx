
"use client";

import React from 'react';
import type { Order, Customer, Product, DocumentStatus } from '@/types';
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
import { OrderDialog } from './order-dialog';
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

export type SortableOrderKeys =
  'orderNumber' | 'customerName' | 'poNumber' | 'date' |
  'total' | 'amountPaid' | 'balanceDue' | 'status' | 'orderState' |
  'expectedDeliveryDate' | 'readyForPickUpDate' | 'pickedUpDate';

interface OrderTableProps {
  orders: Order[];
  onSave: (order: Order) => void;
  onSaveProduct: (product: Omit<Product, 'id'>) => Promise<string | void>;
  onSaveCustomer: (customer: Customer) => Promise<string | void>;
  onDelete: (orderId: string) => void;
  onGenerateEmail: (order: Order) => void;
  onPrint: (order: Order) => void;
  onPrintPackingSlip: (order: Order) => void;
  formatDate: (dateString: string | undefined, options?: Intl.DateTimeFormatOptions) => string;
  customers: Customer[];
  products: Product[];
  productCategories: string[];
  onViewItems: (order: Order) => void;
  onConvertToInvoice: (order: Order) => void;
  sortConfig: { key: SortableOrderKeys; direction: 'asc' | 'desc' };
  requestSort: (key: SortableOrderKeys) => void;
  renderSortArrow: (columnKey: SortableOrderKeys) => JSX.Element | null;
}

export function OrderTable({
  orders,
  onSave,
  onSaveProduct,
  onSaveCustomer,
  onDelete,
  onGenerateEmail,
  onPrint,
  onPrintPackingSlip,
  formatDate,
  customers,
  products,
  productCategories,
  onViewItems,
  onConvertToInvoice,
  sortConfig,
  requestSort,
  renderSortArrow
}: OrderTableProps) {
  const [orderToDelete, setOrderToDelete] = React.useState<Order | null>(null);

  const getStatusVariant = (status: Order['status']): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case 'Picked up':
      case 'Invoiced':
        return 'default';
      case 'Ready for pick up':
        return 'secondary';
      case 'Ordered':
      case 'Draft':
        return 'outline';
      case 'Voided':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getOrderStateVariant = (state: Order['orderState']): "default" | "outline" => {
    return state === 'Closed' ? 'default' : 'outline';
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead onClick={() => requestSort('orderNumber')} className="cursor-pointer hover:bg-muted/50">
              Number {renderSortArrow('orderNumber')}
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
            <TableHead onClick={() => requestSort('amountPaid')} className="text-right cursor-pointer hover:bg-muted/50">
              Paid {renderSortArrow('amountPaid')}
            </TableHead>
            <TableHead onClick={() => requestSort('balanceDue')} className="text-right cursor-pointer hover:bg-muted/50">
              Balance {renderSortArrow('balanceDue')}
            </TableHead>
            <TableHead onClick={() => requestSort('status')} className="cursor-pointer hover:bg-muted/50">
              Status {renderSortArrow('status')}
            </TableHead>
            <TableHead onClick={() => requestSort('orderState')} className="cursor-pointer hover:bg-muted/50">
              Order State {renderSortArrow('orderState')}
            </TableHead>
            <TableHead className="w-[80px] text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{order.orderNumber}</TableCell>
              <TableCell>{order.customerName}</TableCell>
              <TableCell>{order.poNumber || 'N/A'}</TableCell>
              <TableCell>{formatDate(order.date)}</TableCell>
              <TableCell className="text-right">${order.total.toFixed(2)}</TableCell>
              <TableCell className="text-right text-green-600">${(order.amountPaid || 0).toFixed(2)}</TableCell>
              <TableCell className={cn("text-right", (order.balanceDue !== undefined && order.balanceDue > 0) ? "text-destructive" : "text-green-600")}>
                ${(order.balanceDue || 0).toFixed(2)}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(order.status)}
                  className={cn(
                    order.status === 'Picked up' && 'bg-green-500 hover:bg-green-600 text-white',
                    order.status === 'Invoiced' && 'bg-blue-500 hover:bg-blue-600 text-white',
                    order.status === 'Ready for pick up' && 'bg-yellow-500 hover:bg-yellow-600 text-black',
                  )}
                >
                  {order.status}
                  {order.status === 'Ready for pick up' && order.readyForPickUpDate && ` (${formatDate(order.readyForPickUpDate, { month: '2-digit', day: '2-digit' })})`}
                  {order.status === 'Picked up' && order.pickedUpDate && ` (${formatDate(order.pickedUpDate, { month: '2-digit', day: '2-digit' })})`}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant={getOrderStateVariant(order.orderState)}>
                  {order.orderState}
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
                    <DropdownMenuItem onClick={() => onViewItems(order)}>
                      <Icon name="Layers" className="mr-2 h-4 w-4" /> View Items
                    </DropdownMenuItem>
                    <OrderDialog
                      order={order}
                      triggerButton={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                          <Icon name="Edit" className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                      }
                      onSave={onSave}
                      onSaveProduct={onSaveProduct}
                      onSaveCustomer={onSaveCustomer}
                      customers={customers}
                      products={products}
                      productCategories={productCategories}
                    />
                    <DropdownMenuItem onClick={() => onGenerateEmail(order)}>
                      <Icon name="Mail" className="mr-2 h-4 w-4" /> Email Draft
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPrint(order)}>
                      <Icon name="Printer" className="mr-2 h-4 w-4" /> Print Order
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPrintPackingSlip(order)}>
                      <Icon name="PackageCheck" className="mr-2 h-4 w-4" /> Print Packing Slip
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onConvertToInvoice(order)}>
                      <Icon name="FileDigit" className="mr-2 h-4 w-4" /> Convert to Invoice
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                      onSelect={() => setOrderToDelete(order)}
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

      {orderToDelete && (
        <AlertDialog open={!!orderToDelete} onOpenChange={(isOpen) => !isOpen && setOrderToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete order "{orderToDelete.orderNumber}".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (orderToDelete) onDelete(orderToDelete.id); setOrderToDelete(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
