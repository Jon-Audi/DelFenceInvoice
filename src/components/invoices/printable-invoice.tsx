
"use client";

import React from 'react';
import type { Invoice, CompanySettings } from '@/types';

interface PrintableInvoiceProps {
  invoice: Invoice | null;
  companySettings: CompanySettings | null;
  onPrinted: () => void; // Callback to notify when printing is initiated
}

export const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({ invoice, companySettings, onPrinted }) => {
  const printRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (invoice && companySettings && printRef.current) {
      // Delay slightly to ensure content is rendered before printing
      const timer = setTimeout(() => {
        window.print();
        onPrinted(); // Notify parent that print was triggered
      }, 250); // Adjust delay as needed
      return () => clearTimeout(timer);
    }
  }, [invoice, companySettings, onPrinted]);

  if (!invoice || !companySettings) {
    return null;
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div ref={printRef} className="print-only p-8 bg-white text-black font-sans">
      {/* Invoice Header */}
      <div className="grid grid-cols-2 gap-8 mb-10">
        <div>
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
          <h2 className="text-4xl font-bold text-gray-700 mb-2">INVOICE</h2>
          <p className="text-md"><span className="font-semibold">Invoice #:</span> {invoice.invoiceNumber}</p>
          <p className="text-md"><span className="font-semibold">Date:</span> {formatDate(invoice.date)}</p>
          {invoice.dueDate && <p className="text-md"><span className="font-semibold">Due Date:</span> {formatDate(invoice.dueDate)}</p>}
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-8 p-4 border border-gray-300 rounded-md">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Bill To:</h3>
        <p className="font-medium text-gray-800">{invoice.customerName || 'N/A Customer'}</p>
        {/* Add more customer address details here if available and needed */}
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
          {invoice.lineItems.map((item) => (
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
            <span className="text-gray-800">${invoice.subtotal.toFixed(2)}</span>
          </div>
          {invoice.taxAmount && invoice.taxAmount > 0 && (
            <div className="flex justify-between">
              <span className="font-semibold text-gray-700">Tax:</span>
              <span className="text-gray-800">${invoice.taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-xl font-bold border-t border-gray-400 pt-2 mt-2">
            <span className="text-gray-800">Total:</span>
            <span className="text-gray-800">${invoice.total.toFixed(2)}</span>
          </div>
          {invoice.amountPaid && invoice.amountPaid > 0 && (
            <div className="flex justify-between text-md">
              <span className="font-semibold text-green-600">Amount Paid:</span>
              <span className="text-green-600">-${invoice.amountPaid.toFixed(2)}</span>
            </div>
          )}
          {invoice.balanceDue !== undefined && (
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-gray-800">Balance Due:</span>
              <span className="text-gray-800">${invoice.balanceDue.toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes and Payment Terms */}
      {(invoice.notes || invoice.paymentTerms) && (
        <div className="mb-8 p-4 border border-gray-200 rounded-md bg-gray-50 text-sm">
          {invoice.paymentTerms && (
            <div className="mb-2">
              <h4 className="font-semibold text-gray-700">Payment Terms:</h4>
              <p className="text-gray-600">{invoice.paymentTerms}</p>
            </div>
          )}
          {invoice.notes && (
            <div>
              <h4 className="font-semibold text-gray-700">Notes:</h4>
              <p className="text-gray-600 whitespace-pre-line">{invoice.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer (Optional) */}
      <div className="text-center text-xs text-gray-500 pt-8 border-t border-gray-300">
        <p>Thank you for your business!</p>
        <p>{companySettings.companyName}</p>
      </div>
    </div>
  );
};
