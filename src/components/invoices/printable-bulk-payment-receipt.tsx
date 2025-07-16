
"use client";

import React from 'react';
import type { BulkPaymentReceiptData } from '@/types';
import { format } from 'date-fns';

interface PrintableBulkPaymentReceiptProps {
  receiptData: BulkPaymentReceiptData | null;
}

export const PrintableBulkPaymentReceipt = React.forwardRef<HTMLDivElement, PrintableBulkPaymentReceiptProps>(
  ({ receiptData }, ref) => {
    if (!receiptData || !receiptData.companySettings) {
      return null;
    }

    const { paymentDetails, customerName, affectedInvoices, companySettings, logoUrl } = receiptData;

    const formatDate = (dateString: string | undefined) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString();
    };
    
    return (
      <div ref={ref} className="print-only-container">
        <div className="print-only p-8 bg-white text-black font-sans">
          {/* Receipt Header */}
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
              <p className="font-bold text-lg">{companySettings.companyName || 'Your Company'}</p>
              <p className="text-sm">{companySettings.addressLine1 || ''}</p>
              <p className="text-sm">{companySettings.addressLine2 || ''}</p>
              <p className="text-sm">
                {companySettings.city || ''}, {companySettings.state || ''} {companySettings.zipCode || ''}
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-bold text-gray-700 mb-2">PAYMENT RECEIPT</h2>
              <p className="text-md"><span className="font-semibold">Payment Date:</span> {formatDate(paymentDetails.date)}</p>
              <p className="text-md"><span className="font-semibold">Payment ID:</span> {paymentDetails.id.substring(0, 8)}</p>
            </div>
          </div>

          {/* Customer & Payment Details */}
          <div className="grid grid-cols-2 gap-8 mb-8 p-4 border border-gray-300 rounded-md">
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Paid By:</h3>
              <p className="font-medium text-gray-800">{customerName}</p>
            </div>
            <div className="text-right">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Payment Details:</h3>
                <p><span className="font-semibold">Amount:</span> <span className="font-bold text-xl">${paymentDetails.amount.toFixed(2)}</span></p>
                <p><span className="font-semibold">Method:</span> {paymentDetails.method}</p>
                {paymentDetails.notes && <p><span className="font-semibold">Notes:</span> {paymentDetails.notes}</p>}
            </div>
          </div>

          {/* Applied Invoices Table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Payment Applied To:</h3>
            <table className="w-full mb-8 border-collapse text-sm">
                <thead>
                <tr className="bg-gray-100">
                    <th className="text-left p-2 border border-gray-300 font-semibold text-gray-700">Invoice Number</th>
                    <th className="text-right p-2 border border-gray-300 font-semibold text-gray-700">Amount Applied</th>
                </tr>
                </thead>
                <tbody>
                {affectedInvoices.map((inv, index) => (
                    <tr key={index}>
                    <td className="p-2 border border-gray-300">{inv.invoiceNumber}</td>
                    <td className="text-right p-2 border border-gray-300">${inv.amountApplied.toFixed(2)}</td>
                    </tr>
                ))}
                </tbody>
                <tfoot>
                    <tr className="bg-gray-100 font-bold">
                        <td className="text-right p-2 border border-gray-300">Total Applied:</td>
                        <td className="text-right p-2 border border-gray-300">${paymentDetails.amount.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
          </div>


          <div className="text-center text-xs text-gray-500 pt-8 border-t border-gray-300">
            <p>Thank you for your payment!</p>
          </div>
        </div>
      </div>
    );
  }
);

PrintableBulkPaymentReceipt.displayName = "PrintableBulkPaymentReceipt";
