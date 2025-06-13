
"use client";

import React from 'react';
import type { Invoice, CompanySettings } from '@/types';
// import Image from 'next/image'; // No longer using next/image

interface PrintableInvoicePackingSlipProps {
  invoice: Invoice | null;
  companySettings: CompanySettings | null;
}

const transformGsUrlToHttps = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }
  if (url.startsWith('gs://')) {
    try {
      const noPrefix = url.substring(5);
      const parts = noPrefix.split('/');
      const bucket = parts.shift();
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
  return url;
};

export const PrintableInvoicePackingSlip: React.FC<PrintableInvoicePackingSlipProps> = ({ invoice, companySettings }) => {
  if (!invoice || !companySettings) {
    return null;
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const logoHttpUrl = transformGsUrlToHttps(companySettings.logoUrl);

  return (
    <div className="print-only p-8 bg-white text-black font-sans">
      {/* Packing Slip Header */}
      <div className="grid grid-cols-2 gap-8 mb-10">
        <div>
          {logoHttpUrl && (
            <div className="mb-4" style={{ width: '128px' }}>
               <img
                src={logoHttpUrl}
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
          <p className="text-md"><span className="font-semibold">Ref Invoice #:</span> {invoice.invoiceNumber}</p>
          <p className="text-md"><span className="font-semibold">Date:</span> {formatDate(invoice.date)}</p>
          {invoice.poNumber && <p className="text-md"><span className="font-semibold">P.O. #:</span> {invoice.poNumber}</p>}
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-8 p-4 border border-gray-300 rounded-md">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Ship To / Customer:</h3>
        <p className="font-medium text-gray-800">{invoice.customerName || 'N/A Customer'}</p>
      </div>

      {/* Line Items Table */}
      <table className="w-full mb-8 border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left p-2 border border-gray-300 font-semibold text-gray-700">Item Description</th>
            <th className="text-right p-2 border border-gray-300 font-semibold text-gray-700">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((item) => (
            <tr key={item.id}>
              <td className="p-2 border border-gray-300">{item.productName}</td>
              <td className="text-right p-2 border border-gray-300">{item.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-center text-xs text-gray-500 pt-8 border-t border-gray-300">
        <p>Please verify contents upon receipt.</p>
      </div>
    </div>
  );
};
