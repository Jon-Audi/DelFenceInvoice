
"use client";

import React from 'react';

// Define the props for PrintableEstimate
interface PrintableEstimateProps {
  logoUrl?: string;
  estimateNumber?: string;
  date?: string;
  poNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal?: number;
  total?: number;
  disclaimer?: string;
}

const PrintableEstimate = React.forwardRef<HTMLDivElement, PrintableEstimateProps>(
  ({ logoUrl, estimateNumber, date, poNumber, customerName, customerPhone, customerEmail, items = [], subtotal = 0, total = 0, disclaimer }, ref) => {
  return (
    <div ref={ref} className="print-only-container">
      <div className="print-only p-8">
        {logoUrl && (
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <img
              src={logoUrl}
              alt="Company Logo"
              style={{ display: 'inline-block', height: '5rem', width: 'auto', objectFit: 'contain' }}
              data-ai-hint="company logo"
            />
          </div>
        )}

        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold"></h1>
          <p>1111 Greenbank Road, Wilmington, DE 19808</p>
          <p>Phone: 302-610-8901 | Email: Info@DelawareFenceSolutions.com</p>
          <p>
            Website:
            <a href="https://www.DelawareFenceSolutions.com" className="underline">
              www.DelawareFenceSolutions.com
            </a>
          </p>
        </div>

        <div className="mb-4">
          <p><strong>Estimate #:</strong> {estimateNumber}</p>
          <p><strong>Date:</strong> {date}</p>
          {poNumber && <p><strong>P.O. #:</strong> {poNumber}</p>}
          <p><strong>Estimate For:</strong> {customerName}</p>
          {customerPhone && <p><strong>Phone:</strong> {customerPhone}</p>}
          {customerEmail && <p><strong>Email:</strong> {customerEmail}</p>}
        </div>

        <table className="table-auto border-collapse w-full text-sm mb-4">
          <thead>
            <tr>
              <th className="border bg-gray-200 px-2 py-1 text-left">Item Description</th>
              <th className="border bg-gray-200 px-2 py-1 text-right">Quantity</th>
              <th className="border bg-gray-200 px-2 py-1 text-right">Unit Price</th>
              <th className="border bg-gray-200 px-2 py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index}>
                <td className="border px-2 py-1">{item.description}</td>
                <td className="border px-2 py-1 text-right">{item.quantity}</td>
                <td className="border px-2 py-1 text-right">${item.unitPrice.toFixed(2)}</td>
                <td className="border px-2 py-1 text-right">${item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="border px-2 py-1 text-right font-bold" colSpan={3}>Subtotal:</td>
              <td className="border px-2 py-1 text-right font-bold">${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="border px-2 py-1 text-right font-bold" colSpan={3}>Total:</td>
              <td className="border px-2 py-1 text-right font-bold">${total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="text-center">
          {disclaimer ? (
            <p className="whitespace-pre-line text-xs">{disclaimer}</p>
          ) : (
            <>
              <p>All prices are current at the time of inquiry and may change without prior notice. We appreciate your consideration</p>
              <p className="italic">Delaware Fence Solutions</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

PrintableEstimate.displayName = "PrintableEstimate";

export default PrintableEstimate;
