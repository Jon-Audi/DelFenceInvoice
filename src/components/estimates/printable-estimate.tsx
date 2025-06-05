
"use client";

import React from 'react';
import type { Estimate, CompanySettings } from '@/types';
import Image from 'next/image'; // Import next/image

interface PrintableEstimateProps {
  estimate: Estimate | null;
  companySettings: CompanySettings | null;
}

export const PrintableEstimate: React.FC<PrintableEstimateProps> = ({ estimate, companySettings }) => {
  if (!estimate || !companySettings) {
    return null;
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="print-only p-8 bg-white text-black font-sans">
      {/* Estimate Header */}
      <div className="grid grid-cols-2 gap-8 mb-10">
        <div>
          {companySettings.logoUrl && (
            <div className="mb-4 w-32 h-auto relative"> {/* Adjust width as needed */}
              <Image 
                src={companySettings.logoUrl} 
                alt={`${companySettings.companyName} Logo`} 
                width={128} // Provide explicit width
                height={64} // Provide explicit height, adjust aspect ratio as needed
                style={{ objectFit: 'contain' }}
                priority // Consider priority if logo is critical for LCP
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
          <h2 className="text-4xl font-bold text-gray-700 mb-2">ESTIMATE</h2>
          <p className="text-md"><span className="font-semibold">Estimate #:</span> {estimate.estimateNumber}</p>
          <p className="text-md"><span className="font-semibold">Date:</span> {formatDate(estimate.date)}</p>
          {estimate.validUntil && <p className="text-md"><span className="font-semibold">Valid Until:</span> {formatDate(estimate.validUntil)}</p>}
          {estimate.poNumber && <p className="text-md"><span className="font-semibold">P.O. #:</span> {estimate.poNumber}</p>}
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-8 p-4 border border-gray-300 rounded-md">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Estimate For:</h3>
        <p className="font-medium text-gray-800">{estimate.customerName || 'N/A Customer'}</p>
        {/* You might want to fetch and display customer's full address here if available */}
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
          {estimate.lineItems.map((item) => (
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
            <span className="text-gray-800">${estimate.subtotal.toFixed(2)}</span>
          </div>
          {estimate.taxAmount && estimate.taxAmount > 0 && (
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Tax:</span>
              <span className="text-gray-800">${estimate.taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold border-t border-gray-400 pt-2 mt-2">
            <span className="text-gray-800">Total:</span>
            <span className="text-gray-800">${estimate.total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      {estimate.notes && (
        <div className="mb-8 p-4 border border-gray-200 rounded-md bg-gray-50 text-sm">
          <h4 className="font-semibold text-gray-700">Notes:</h4>
          <p className="text-gray-600 whitespace-pre-line">{estimate.notes}</p>
        </div>
      )}

      {/* Footer (Optional) */}
      <div className="text-center text-xs text-gray-500 pt-8 border-t border-gray-300">
        <p>Thank you for your consideration!</p>
        <p>{companySettings.companyName}</p>
      </div>
    </div>
  );
};
