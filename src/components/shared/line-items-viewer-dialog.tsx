
"use client";

import React from 'react';
import type { LineItem } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LineItemsViewerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  lineItems: LineItem[];
  documentType: 'Estimate' | 'Order' | 'Invoice';
  documentNumber: string;
}

export function LineItemsViewerDialog({
  isOpen,
  onOpenChange,
  lineItems,
  documentType,
  documentNumber,
}: LineItemsViewerDialogProps) {
  if (!lineItems || lineItems.length === 0) {
    // This case should ideally be handled by the calling component (i.e., not opening the dialog)
    // But as a fallback, we can render nothing or a message.
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Line Items for {documentType} #{documentNumber}</DialogTitle>
          <DialogDescription>
            A detailed list of items included in this {documentType.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.productName}
                    {item.isReturn && <span className="text-xs text-destructive"> (Return)</span>}
                    {item.isNonStock && <span className="text-xs text-muted-foreground"> (Non-Stock)</span>}
                  </TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${item.total.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <DialogClose asChild className="mt-4">
          <Button type="button" variant="outline">Close</Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
