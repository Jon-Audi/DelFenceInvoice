
"use client";

import React from 'react';
import type { Invoice, CompanySettings, Customer } from '@/types';

interface PrintableInvoiceProps {
  invoice: Invoice | null;
  companySettings: CompanySettings | null;
  customer: Customer | null;
  logoUrl?: string;
  disclaimer?: string;
}

const PrintableInvoice = React.forwardRef<HTMLDivElement, PrintableInvoiceProps>(
  ({ invoice, companySettings, customer, logoUrl, disclaimer }, ref) => {
    if (!invoice || !companySettings) {
      return null;
    }

    const formatDate = (dateString: string | undefined) => {
      if (!dateString) return 'N/A';
      return new Date(dateString).toLocaleDateString();
    };

    const customerEmail = customer?.emailContacts?.find(e => e.type === 'Main Contact')?.email || customer?.emailContacts?.[0]?.email;

    return (
      <div ref={ref} className="print-only-container">
        <div className="print-only p-8 bg-white text-black font-sans">
          {/* Invoice Header */}
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
              <p className="text-sm">Phone: {companySettings.phone || ''}</p>
              <p className="text-sm">Email: {companySettings.email || ''}</p>
              {companySettings.website && <p className="text-sm">Website: {companySettings.website}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-4xl font-bold text-gray-700 mb-2">INVOICE</h2>
              <p className="text-md"><span className="font-semibold">Invoice #:</span> {invoice.invoiceNumber}</p>
              <p className="text-md"><span className="font-semibold">Date:</span> {formatDate(invoice.date)}</p>
              {invoice.dueDate && <p className="text-md"><span className="font-semibold">Due Date:</span> {formatDate(invoice.dueDate)}</p>}
              {invoice.poNumber && <p className="text-md"><span className="font-semibold">P.O. #:</span> {invoice.poNumber}</p>}
            </div>
          </div>

          {/* Customer Information */}
          <div className="mb-8 p-4 border border-gray-300 rounded-md">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Bill To:</h3>
            <p className="font-medium text-gray-800">{invoice.customerName || 'N/A Customer'}</p>
            {customer?.phone && <p className="text-sm text-gray-600">Phone: {customer.phone}</p>}
            {customerEmail && <p className="text-sm text-gray-600">Email: {customerEmail}</p>}
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
                <span className="text-gray-800">${invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.taxAmount && invoice.taxAmount !== 0 && (
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
                  <span className="text-green-600">(${invoice.amountPaid.toFixed(2)})</span>
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

          {/* Payments Section */}
          {invoice.payments && invoice.payments.length > 0 && (
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
                  {invoice.payments.map((payment) => (
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

          <div className="text-center text-xs text-gray-500 pt-8 border-t border-gray-300">
            {disclaimer && <p className="whitespace-pre-line">{disclaimer}</p>}
            <p>Thank you for your business!</p>
            <p>{companySettings.companyName}</p>
          </div>
        </div>
      </div>
    );
  }
);

PrintableInvoice.displayName = "PrintableInvoice";
export { PrintableInvoice };
