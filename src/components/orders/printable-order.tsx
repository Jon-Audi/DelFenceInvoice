
"use client";

import React from 'react';
import type { Order, CompanySettings } from '@/types';
import Image from 'next/image'; // Import next/image

interface PrintableOrderProps {
  order: Order | null;
  companySettings: CompanySettings | null;
}

const transformGsUrlToHttps = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }
  if (url.startsWith('gs://')) {
    try {
      const noPrefix = url.substring(5); // Remove "gs://"
      const parts = noPrefix.split('/');
      const bucket = parts.shift(); // Get the first part as bucket
      if (!bucket) {
          console.error("Invalid gs:// URL structure, missing bucket:", url);
          return undefined;
      }
      const objectPath = parts.join('/');
      if (!objectPath) {
          console.error("Invalid gs:// URL structure, missing object path:", url);
          return undefined;
      }
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
    } catch (error) {
      console.error("Error transforming gs:// URL:", url, error);
      return undefined;
    }
  }
  console.warn("Logo URL is not a gs:// URI and not HTTP(S). Returning as is, may not work:", url);
  return url; // Fallback for unrecognized formats
};

export const PrintableOrder: React.FC<PrintableOrderProps> = ({ order, companySettings }) => {
  if (!order || !companySettings) {
    return null;
  }

  const formatDate = (dateString: string | undefined, includeTime = false) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return includeTime ? date.toLocaleString() : date.toLocaleDateString();
  };

  const logoHttpUrl = transformGsUrlToHttps(companySettings.logoUrl);

  return (
    <div className="print-only p-8 bg-white text-black font-sans">
      {/* Order Header */}
      <div className="grid grid-cols-2 gap-8 mb-10">
        <div>
          {logoHttpUrl && (
            <div className="mb-4 w-32 h-auto relative"> {/* Adjust width as needed */}
               <Image 
                src={logoHttpUrl} 
                alt={`${companySettings.companyName || 'Company'} Logo`}
                width={128} 
                height={64} 
                style={{ objectFit: 'contain' }}
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
              <td className="p-2 border border-gray-300">{item.productName}{item.isReturn ? " (Return)" : ""}</td>
              <td className="text-right p-2 border border-gray-300">{item.isReturn ? `-${item.quantity}` : item.quantity}</td>
              <td className="text-right p-2 border border-gray-300">${item.unitPrice.toFixed(2)}</td>
              <td className="text-right p-2 border border-gray-300">{item.isReturn ? `-$${(item.quantity * item.unitPrice).toFixed(2)}` : `$${item.total.toFixed(2)}`}</td>
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
          {order.taxAmount && order.taxAmount !== 0 && (
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Tax:</span>
              <span className="text-gray-800">${order.taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold border-t border-gray-400 pt-2 mt-2">
            <span className="text-gray-800">Total:</span>
            <span className="text-gray-800">${order.total.toFixed(2)}</span>
          </div>
          {order.amountPaid && order.amountPaid > 0 && (
            <div className="flex justify-between text-md">
              <span className="font-semibold text-green-600">Amount Paid:</span>
              <span className="text-green-600">(${order.amountPaid.toFixed(2)})</span>
            </div>
          )}
          {order.balanceDue !== undefined && (
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-gray-800">Balance Due:</span>
              <span className="text-gray-800">${order.balanceDue.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Payments Section */}
      {order.payments && order.payments.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Payments Received:</h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 border border-gray-300 font-semibold text-gray-700">Date</th>
                <th className="text-left p-2 border border-gray-300 font-semibold text-gray-700">Method</th>
                <th className="text-right p-2 border border-gray-300 font-semibold text-gray-700">Amount</th>
                <th className="text-left p-2 border border-gray-300 font-semibold text-gray-700">Notes</th>
              </tr>
            </thead>
            <tbody>
              {order.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="p-2 border border-gray-300">{formatDate(payment.date)}</td>
                  <td className="p-2 border border-gray-300">{payment.method}</td>
                  <td className="text-right p-2 border border-gray-300">${payment.amount.toFixed(2)}</td>
                  <td className="p-2 border border-gray-300">{payment.notes || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}


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
