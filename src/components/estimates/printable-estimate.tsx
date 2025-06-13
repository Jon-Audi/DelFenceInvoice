
"use client";

import React from 'react';

// Define the props for PrintableEstimate
interface PrintableEstimateProps {
  logoUrl?: string; // Expecting an absolute URL
  estimateNumber?: string;
  date?: string;
  poNumber?: string;
  customerName?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal?: number;
  total?: number;
}

const PrintableEstimate = React.forwardRef<HTMLDivElement, PrintableEstimateProps>(
  ({ logoUrl, estimateNumber, date, poNumber, customerName, items = [], subtotal = 0, total = 0 }, ref) => {
  return (
    // This div is what will have its innerHTML taken
    <div ref={ref} className="print-only-container">
      <div className="print-only p-8"> {/* Added p-8 here for padding */}
        {/* Logo */}
        {logoUrl && (
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}> {/* Wrapper div with inline style for centering */}
            <img
              src={logoUrl} // Using the absolute logoUrl
              alt="Delaware Fence Solutions Logo"
              style={{ display: 'inline-block', height: '5rem', width: 'auto', objectFit: 'contain' }} // Inline styles for size and display
              data-ai-hint="company logo"
            />
          </div>
        )}

        {/* Heading */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold">Delaware Fence Solutions</h1>
          <p>1111 Greenbank Road, Wilmington, DE 19808</p>
          <p>Phone: 302-610-8901 | Email: Info@DelawareFenceSolutions.com</p>
          <p>
            Website:
            <a href="https://www.DelawareFenceSolutions.com" className="underline">
              www.DelawareFenceSolutions.com
            </a>
          </p>
        </div>

        {/* Estimate Info */}
        <div className="mb-4">
          <p><strong>Estimate #:</strong> {estimateNumber}</p>
          <p><strong>Date:</strong> {date}</p>
          {poNumber && <p><strong>P.O. #:</strong> {poNumber}</p>}
          <p><strong>Estimate For:</strong> {customerName}</p>
        </div>

        {/* Table */}
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

        {/* Footer */}
        <div className="text-center">
          <p>Thank you for your consideration!</p>
          <p className="italic">Delaware Fence Solutions</p>
        </div>
      </div>
    </div>
  );
});

PrintableEstimate.displayName = "PrintableEstimate";

export default PrintableEstimate;
