
"use client";

import React from 'react';
import type { Order, Customer, Product } from '@/types';
import { OrderForm, type OrderFormData } from './order-form';
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
  customers: Customer[];
  // products: Product[]; // Uncomment when line item editor is added
}

export function OrderDialog({ order, triggerButton, onSave, customers /*, products */ }: OrderDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (formData: OrderFormData) => {
    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const customerName = selectedCustomer ? (selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`) : 'Unknown Customer';

    // For now, lineItems come from description. This will change with full line item editor.
    const lineItems = formData.lineItemsDescription ? [{ 
        id: crypto.randomUUID(), 
        productId: 'desc_prod_ord', 
        productName: formData.lineItemsDescription.substring(0,100), // Truncate for safety
        quantity: 1, 
        unitPrice: formData.total, // Approximate
        total: formData.total 
      }] : (order?.lineItems || []);

    const orderToSave: Order = {
      id: order?.id || crypto.randomUUID(),
      orderNumber: formData.orderNumber,
      customerId: formData.customerId,
      customerName: customerName,
      date: formData.date.toISOString(),
      total: formData.total,
      status: formData.status,
      orderState: formData.orderState,
      expectedDeliveryDate: formData.expectedDeliveryDate?.toISOString(),
      readyForPickUpDate: formData.readyForPickUpDate?.toISOString(),
      pickedUpDate: formData.pickedUpDate?.toISOString(),
      lineItems: lineItems,
      subtotal: formData.total, // Approximation until proper line items
      notes: formData.notes,
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
        <OrderForm 
          order={order} 
          onSubmit={handleSubmit} 
          onClose={() => setOpen(false)}
          customers={customers}
          // products={products} // Uncomment for line item editor
        />
      </DialogContent>
    </Dialog>
  );
}
