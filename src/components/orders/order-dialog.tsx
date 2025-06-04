
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
  triggerButton?: React.ReactElement; // Make trigger optional for programmatic opening
  onSave: (order: Order) => void;
  customers: Customer[];
  products: Product[]; 
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialData?: OrderFormData | null; 
}

export function OrderDialog({ 
  order, 
  triggerButton, 
  onSave, 
  customers, 
  products,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
  initialData
}: OrderDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  // Open dialog if initialData is provided and it's a new conversion
  React.useEffect(() => {
    if (initialData && controlledIsOpen === undefined) { // Only if not controlled externally for this specific case
        setInternalOpen(true);
    }
  }, [initialData, controlledIsOpen]);


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
      id: order?.id || initialData?.id || crypto.randomUUID(), // Use initialData id if present
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
  
  const dialogTitle = order ? 'Edit Order' : (initialData ? 'Create New Order from Estimate' : 'New Order');
  const dialogDescription = order ? 'Update the details of this order.' : (initialData ? 'Review and confirm the details for this new order based on the estimate.' : 'Fill in the details for the new order.');


  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {triggerButton && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <OrderForm 
          order={order} 
          initialData={initialData}
          onSubmit={handleSubmit} 
          onClose={() => setOpen(false)}
          customers={customers}
          products={products}
        />
      </DialogContent>
    </Dialog>
  );
}

    
