
"use client";

import React from 'react';
import type { Order, Customer, Product, LineItem } from '@/types';
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
  products: Product[]; 
}

export function OrderDialog({ order, triggerButton, onSave, customers, products }: OrderDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleSubmit = (formData: OrderFormData) => {
    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const customerName = selectedCustomer ? (selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`) : 'Unknown Customer';

    const lineItems: LineItem[] = formData.lineItems.map((item) => {
      const product = products.find(p => p.id === item.productId);
      const unitPrice = product ? product.price : 0;
      return {
        id: item.id || crypto.randomUUID(),
        productId: item.productId,
        productName: product?.name || 'Unknown Product',
        quantity: item.quantity,
        unitPrice: unitPrice,
        total: item.quantity * unitPrice,
      };
    });

    const subtotal = lineItems.reduce((acc, item) => acc + item.total, 0);
    const taxAmount = 0; // Simplified for now
    const total = subtotal + taxAmount;

    const orderToSave: Order = {
      id: order?.id || crypto.randomUUID(),
      orderNumber: formData.orderNumber,
      customerId: formData.customerId,
      customerName: customerName,
      date: formData.date.toISOString(),
      status: formData.status,
      orderState: formData.orderState,
      expectedDeliveryDate: formData.expectedDeliveryDate?.toISOString(),
      readyForPickUpDate: formData.readyForPickUpDate?.toISOString(),
      pickedUpDate: formData.pickedUpDate?.toISOString(),
      lineItems: lineItems,
      subtotal: subtotal,
      taxAmount: taxAmount,
      total: total,
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
          products={products}
        />
      </DialogContent>
    </Dialog>
  );
}

    