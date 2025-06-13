
"use client";

import React from 'react';
import type { Order, CompanySettings } from '@/types';

interface PrintableOrderPackingSlipProps {
  order: Order | null;
  companySettings: CompanySettings | null;
}

export const PrintableOrderPackingSlip: React.FC<PrintableOrderPackingSlipProps> = ({ order, companySettings }) => {
  if (!order || !companySettings) {
    return null;
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Using local /public/logo.png
  const logoUrl = "/logo.png";

  return (
    <div className="print-only p-8 bg-white text-black font-sans">
      <div className="grid grid-cols-2 gap-8 mb-10">
        <div>
          {logoUrl && (
             <div className="mb-4" style={{ width: '128px' }}>
               <img
                src={logoUrl}
                alt={`${companySettings.companyName || 'Company'} Logo`}
                style={{ display: 'block', maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                data-ai-hint="company logo"
              />
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{companySettings.companyName || 'Your Company'}</h1>
          <p className="text-sm">{companySettings.addressLine1 || ''}</p>
          <p className="text-sm">{companySettings.addressLine2 || ''}</p>
          <p className="text-sm">
            {companySettings.city || ''}, {companySettings.state || ''} {companySettings.zipCode || ''}
          </p>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-bold text-gray-700 mb-2">PACKING SLIP</h2>
          <p className="text-md"><span className="font-semibold">Order #:</span> {order.orderNumber}</p>
          <p className="text-md"><span className="font-semibold">Date:</span> {formatDate(order.date)}</p>
          {order.poNumber && <p className="text-md"><span className="font-semibold">P.O. #:</span> {order.poNumber}</p>}
        </div>
      </div>

      <div className="mb-8 p-4 border border-gray-300 rounded-md">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Ship To / Customer:</h3>
        <p className="font-medium text-gray-800">{order.customerName || 'N/A Customer'}</p>
      </div>

      <table className="w-full mb-8 border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2 border border-gray-300 font-semibold text-gray-700">Item Description</th>
            <th className="text-right p-2 border border-gray-300 font-semibold text-gray-700">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {order.lineItems.map((item) => (
            <tr key={item.id}>
              <td className="p-2 border border-gray-300">{item.productName}</td>
              <td className="text-right p-2 border border-gray-300">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {order.notes && (
        <div className="mb-8 p-4 border border-gray-200 rounded-md bg-gray-50 text-sm">
          <h4 className="font-semibold text-gray-700">Notes:</h4>
          <p className="text-gray-600 whitespace-pre-line">{order.notes}</p>
        </div>
      )}

      <div className="text-center text-xs text-gray-500 pt-8 border-t border-gray-300">
        <p>Please verify contents upon receipt.</p>
      </div>
    </div>
  );
};
