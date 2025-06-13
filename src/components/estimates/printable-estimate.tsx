
"use client";

import React, { useRef } from 'react';

// Define the props for PrintableEstimate based on your usage
interface PrintableEstimateProps {
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
  ({ estimateNumber, date, poNumber, customerName, items = [], subtotal = 0, total = 0 }, ref) => {
  return (
    <div ref={ref} className="print-only-container">
      <div className="print-only p-8">
        {/* Logo */}
        <img
          src="/logo.png" // Make sure this logo exists in your public folder
          alt="Delaware Fence Solutions Logo"
          className="mx-auto mb-4 h-20 object-contain"
          data-ai-hint="company logo"
        />

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


interface PrintEstimateButtonProps {
  estimateData: PrintableEstimateProps;
  // Tailwind CSS file path relative to the new window's document root
  // This path might need adjustment based on how files are served or if using a CDN for production
  tailwindCssPath?: string; 
}

export const PrintEstimateButton: React.FC<PrintEstimateButtonProps> = ({ estimateData, tailwindCssPath = "/globals.css" }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const win = window.open('', '_blank', 'height=800,width=800'); // Added dimensions for popup

      if (win) {
        win.document.write('<html><head><title>Print Estimate</title>');
        // Attempt to link to the main app's globals.css if served, or use CDN as fallback
        // For development, this might be tricky due to how Next.js serves assets.
        // A CDN link for Tailwind is more reliable for this new window approach.
        // Using a known CDN for Tailwind v2 (as per your previous globals.css comments)
        win.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">');
        // Add a basic print style to ensure visibility, similar to what the main globals.css was doing.
        win.document.write(`
          <style>
            @media print {
              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .print-only-container { margin: 0; padding: 0; }
              .print-only { padding: 0.5in; } /* Or your desired padding */
            }
          </style>
        `);
        win.document.write('</head><body>');
        win.document.write(printContents);
        win.document.write('</body></html>');
        win.document.close();
        
        // Delay print to allow content and styles to load
        setTimeout(() => {
          win.focus(); // Ensure the new window is focused
          win.print();
          win.close();
        }, 750); // Increased delay slightly
      } else {
        alert("Popup blocked. Please allow popups for this site to print.");
      }
    }
  };

  return (
    <>
      <div style={{ display: 'none' }}> {/* Use inline style for absolute hiding */}
        <PrintableEstimate ref={printRef} {...estimateData} />
      </div>
      {/* The button will be rendered by the parent, this component just provides logic */}
      {/* This is a conceptual button placement, the actual button is in the DropdownMenuItem */}
      <button onClick={handlePrint} className="hidden">Print Logic Holder</button>
    </>
  );
};

export default PrintableEstimate;
