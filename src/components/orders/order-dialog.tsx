
"use client";

import React from 'react';
import type { Order, Customer, Product, LineItem, Payment } from '@/types';
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
  triggerButton?: React.ReactElement; 
  onSave: (order: Order) => void;
  customers: Customer[];
  products: Product[]; 
  productCategories: string[];
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialData?: Partial<OrderFormData> & { lineItems: NonNullable<OrderFormData['lineItems']> } | null;
}

export function OrderDialog({ 
  order, 
  triggerButton, 
  onSave, 
  customers, 
  products,
  productCategories,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
  initialData
}: OrderDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  React.useEffect(() => {
    if (initialData && controlledIsOpen === undefined) { 
        setInternalOpen(true);
    }
  }, [initialData, controlledIsOpen]);


  const handleSubmit = (formData: OrderFormData) => {
    const selectedCustomer = customers.find(c => c.id === formData.customerId);
    const customerName = selectedCustomer ? (selectedCustomer.companyName || `${selectedCustomer.firstName} ${selectedCustomer.lastName}`) : 'Unknown Customer';

    const lineItems: LineItem[] = formData.lineItems.map((item) => {
      const product = !item.isNonStock && item.productId ? products.find(p => p.id === item.productId) : undefined;
      const finalUnitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : 0;
      const quantity = item.quantity;
      const isReturn = item.isReturn || false;
      const itemBaseTotal = quantity * finalUnitPrice;
      
      const itemName = item.isNonStock 
                       ? (item.productName || 'Non-Stock Item') 
                       : (product?.name || 'Unknown Product');

      const lineItemForDb: Partial<LineItem> & Pick<LineItem, 'id'|'productName'|'quantity'|'unitPrice'|'total'|'isReturn'|'isNonStock'> = {
          id: item.id || crypto.randomUUID(),
          productName: itemName,
          quantity: quantity,
          unitPrice: finalUnitPrice,
          isReturn: isReturn,
          total: isReturn ? -itemBaseTotal : itemBaseTotal,
          isNonStock: item.isNonStock || false,
      };

      if (item.isNonStock) {
        lineItemForDb.cost = item.cost || 0; // Default to 0 if undefined
        lineItemForDb.markupPercentage = item.markupPercentage || 0; // Default to 0 if undefined
      }
      
      if (!item.isNonStock && item.productId) {
          lineItemForDb.productId = item.productId;
      }
      return lineItemForDb as LineItem;
    });

    const subtotal = lineItems.reduce((acc, item) => acc + item.total, 0);
    const taxAmount = 0; 
    const total = subtotal + taxAmount;

    const finalPayments: Payment[] = formData.payments || [];
    const totalAmountPaid = finalPayments.reduce((acc, p) => acc + p.amount, 0);
    const balanceDue = total - totalAmountPaid;


    const orderToSave: Order = {
      id: order?.id || initialData?.id || crypto.randomUUID(),
      orderNumber: formData.orderNumber,
      customerId: formData.customerId,
      customerName: customerName,
      date: formData.date.toISOString(),
      status: formData.status,
      orderState: formData.orderState,
      poNumber: formData.poNumber,
      expectedDeliveryDate: formData.expectedDeliveryDate?.toISOString(),
      readyForPickUpDate: formData.readyForPickUpDate?.toISOString(),
      pickedUpDate: formData.pickedUpDate?.toISOString(),
      lineItems: lineItems,
      subtotal: subtotal,
      taxAmount: taxAmount,
      total: total,
      notes: formData.notes,
      payments: finalPayments,
      amountPaid: totalAmountPaid,
      balanceDue: balanceDue,
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
          key={order?.id || initialData?.id || 'new-order-form'}
          order={order} 
          initialData={initialData}
          onSubmit={handleSubmit} 
          onClose={() => setOpen(false)}
          customers={customers}
          products={products}
          productCategories={productCategories}
        />
      </DialogContent>
    </Dialog>
  );
}
