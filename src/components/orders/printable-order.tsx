
"use client";

import React from 'react';
import type { Order, CompanySettings } from '@/types';
import Image from 'next/image'; // Import next/image

interface PrintableOrderProps {
  order: Order | null;
  companySettings: CompanySettings | null;
}

export const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, companySettings }) => {
  if (!order || !companySettings) {
    return null;
  }

  const formatDate = (dateString: string | undefined, includeTime = false) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return includeTime ? date.toLocaleString() : date.toLocaleDateString();
  };

  return (
    <div className="print-only p-8 bg-white text-black font-sans">
      {/* Order Header */}
      <div className="grid grid-cols-2 gap-8 mb-10">
        <div>
          {companySettings.logoUrl && (
            <div className="mb-4 w-32 h-auto relative"> {/* Adjust width as needed */}
               <Image 
                src={companySettings.logoUrl} 
                alt={`${companySettings.companyName} Logo`} 
                width={128} 
                height={64} 
                style={{ objectFit: 'contain' }}
                priority
              />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{companySettings.companyName || 'Your Company'}</h1>
          <p className="text-sm">{companySettings.addressLine1 || ''}</p>
          <p className="text-sm">{companySettings.addressLine2 || ''}</p>
          <p className="text-sm">
            {companySettings.city || ''}, {companySettings.state || ''} {companySettings.zipCode || ''}
          </p>
          <p className="text-sm">Phone: {companySettings.phone || ''}</p>
          <p className="text-sm">Email: {companySettings.email || ''}</p>
          {companySettings.website && <p className="text-sm">Website: {companySettings.website}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-bold text-gray-700 mb-2">ORDER CONFIRMATION</h2>
          <p className="text-md"><span className="font-semibold">Order #:</span> {order.orderNumber}</p>
          <p className="text-md"><span className="font-semibold">Date:</span> {formatDate(order.date, true)}</p>
          {order.poNumber && <p className="text-md"><span className="font-semibold">P.O. #:</span> {order.poNumber}</p>}
          <p className="text-md"><span className="font-semibold">Status:</span> {order.status}</p>
          {order.expectedDeliveryDate && <p className="text-md"><span className="font-semibold">Expected Delivery:</span> {formatDate(order.expectedDeliveryDate)}</p>}
          {order.readyForPickUpDate && <p className="text-md"><span className="font-semibold">Ready for Pickup:</span> {formatDate(order.readyForPickUpDate)}</p>}
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-8 p-4 border border-gray-300 rounded-md">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Customer:</h3>
        <p className="font-medium text-gray-800">{order.customerName || 'N/A Customer'}</p>
      </div>

      {/* Line Items Table */}
      <table className="w-full mb-8 border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2 border border-gray-300 font-semibold text-gray-700">Item Description</th>
            <th className="text-right p-2 border border-gray-300 font-semibold text-gray-700">Quantity</th>
            <th className="text-right p-2 border border-gray-300 font-semibold text-gray-700">Unit Price</th>
            <th className="text-right p-2 border border-gray-300 font-semibold text-gray-700">Total</th>
          </tr>
        </thead>
        <tbody>
          {order.lineItems.map((item) => (
            <tr key={item.id}>
              <td className="p-2 border border-gray-300">{item.productName}</td>
              <td className="text-right p-2 border border-gray-300">{item.quantity}</td>
              <td className="text-right p-2 border border-gray-300">${item.unitPrice.toFixed(2)}</td>
              <td className="text-right p-2 border border-gray-300">${item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="col-span-2"></div>
        <div className="col-span-1 space-y-2">
          <div className="flex justify-between">
            <span className="font-semibold text-gray-700">Subtotal:</span>
            <span className="text-gray-800">${order.subtotal.toFixed(2)}</span>
          </div>
          {order.taxAmount && order.taxAmount > 0 && (
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Tax:</span>
              <span className="text-gray-800">${order.taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold border-t border-gray-400 pt-2 mt-2">
            <span className="text-gray-800">Total:</span>
            <span className="text-gray-800">${order.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {order.notes && (
        <div className="mb-8 p-4 border border-gray-200 rounded-md bg-gray-50 text-sm">
          <h4 className="font-semibold text-gray-700">Notes:</h4>
          <p className="text-gray-600 whitespace-pre-line">{order.notes}</p>
        </div>
      )}

      {/* Footer (Optional) */}
      <div className="text-center text-xs text-gray-500 pt-8 border-t border-gray-300">
        <p>Thank you for your order!</p>
        <p>{companySettings.companyName}</p>
      </div>
    </div>
  );
};
