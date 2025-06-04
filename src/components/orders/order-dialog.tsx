
"use client";

import React from 'react';
import type { Order } from '@/types';
import { OrderForm } from './order-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface OrderDialogProps {
  order?: Order;
  triggerButton: React.ReactElement;
  onSave: (order: Order) => void;
}

export function OrderDialog({ order, triggerButton, onSave }: OrderDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (data: Omit<Order, 'id' | 'lineItems'> & { lineItemsDescription?: string }) => {
    const orderToSave: Order = {
      ...data,
      id: order?.id || crypto.randomUUID(),
      lineItems: data.lineItemsDescription ? [{ 
        id: crypto.randomUUID(), 
        productId: 'desc_prod_ord', 
        productName: data.lineItemsDescription.substring(0,50),
        quantity: 1, 
        unitPrice: data.total,
        total: data.total 
      }] : (order?.lineItems || []),
      subtotal: data.total, 
    };
    onSave(orderToSave);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{order ? 'Edit Order' : 'New Order'}</DialogTitle>
          <DialogDescription>
            {order ? 'Update the details of this order.' : 'Fill in the details for the new order.'}
          </DialogDescription>
        </DialogHeader>
        <OrderForm order={order} onSubmit={handleSubmit} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
