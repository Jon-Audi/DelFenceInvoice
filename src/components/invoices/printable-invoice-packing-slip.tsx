
"use client";

import React from 'react';
import type { Invoice, CompanySettings } from '@/types';

interface PrintableInvoicePackingSlipProps {
  invoice: Invoice | null;
  companySettings: CompanySettings | null;
  logoUrl?: string;
}

const PrintableInvoicePackingSlip = React.forwardRef<HTMLDivElement, PrintableInvoicePackingSlipProps>(
  ({ invoice, companySettings, logoUrl }, ref) => {
    if (!invoice || !companySettings) {
      return null;
    }

    const formatDate = (dateString: string | undefined) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString();
    };

    return (
      <div ref={ref} className="print-only-container">
        <div className="print-only p-8 bg-white text-black font-sans">
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              {logoUrl && (
                <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                  <img
                    src={logoUrl}
                    alt={`${companySettings.companyName || 'Company'} Logo`}
                    style={{ display: 'inline-block', height: '5rem', width: 'auto', objectFit: 'contain' }}
                    data-ai-hint="company logo"
                  />
                </div>
              )}
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

          <div className="mb-8 p-4 border border-gray-300 rounded-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Ship To / Customer:</h3>
            <p className="font-medium text-gray-800">{invoice.customerName || 'N/A Customer'}</p>
          </div>

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
      </div>
    );
  }
);

PrintableInvoicePackingSlip.displayName = "PrintableInvoicePackingSlip";
export { PrintableInvoicePackingSlip }; // Ensure it's exported
