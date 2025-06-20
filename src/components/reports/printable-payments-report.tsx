
"use client";

import React from 'react';
import type { PaymentReportItem, CompanySettings, Payment } from '@/types';
import { format } from 'date-fns';

interface PrintablePaymentsReportProps {
  reportItems: PaymentReportItem[];
  companySettings: CompanySettings;
  startDate: Date;
  endDate: Date;
  logoUrl?: string;
}

export const PrintablePaymentsReport = React.forwardRef<HTMLDivElement, PrintablePaymentsReportProps>(
  ({ reportItems, companySettings, startDate, endDate, logoUrl }, ref) => {
    
    const formatDateDisplay = (dateString: string | undefined, includeTime = false) => {
      if (!dateString) return 'N/A';
      const date = new Date(dateString);
      if (!isValid(date)) return 'Invalid Date';
      return includeTime ? format(date, "MM/dd/yyyy HH:mm") : format(date, "MM/dd/yyyy");
    };

    const totalPaymentsCollected = reportItems.reduce((sum, item) => sum + item.totalPaidForDocument, 0);
    const numberOfDocumentsWithPayments = reportItems.length;

    return (
      <div ref={ref} className="print-only-container">
        <div className="print-only p-8 bg-white text-black font-sans text-xs">
          <header className="grid grid-cols-2 gap-8 mb-6">
            <div>
              {logoUrl && (
                 <div style={{ textAlign: 'left', marginBottom: '1rem', width: '128px' }}>
                  <img
                    src={logoUrl}
                    alt={`${companySettings.companyName || 'Company'} Logo`}
                    style={{ display: 'block', maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                    data-ai-hint="company logo"
                  />
                </div>
              )}
              <h1 className="text-xl font-bold text-gray-800">{companySettings.companyName || 'Your Company'}</h1>
              <p>{companySettings.addressLine1 || ''}</p>
              {companySettings.addressLine2 && <p>{companySettings.addressLine2}</p>}
              <p>
                {companySettings.city || ''}{companySettings.city && (companySettings.state || companySettings.zipCode) ? ', ' : ''}
                {companySettings.state || ''} {companySettings.zipCode || ''}
              </p>
              {companySettings.phone && <p>Phone: {companySettings.phone}</p>}
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-gray-700">Payments Report</h2>
              <p className="font-semibold">Date Range (Document Dates):</p>
              <p>{format(startDate, "MM/dd/yyyy")} - {format(endDate, "MM/dd/yyyy")}</p>
              <p className="mt-1">Generated: {format(new Date(), "MM/dd/yyyy HH:mm")}</p>
            </div>
          </header>

          <section className="mb-6 p-3 border border-gray-300 rounded">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Summary</h3>
            <div className="grid grid-cols-2 gap-4">
              <p>Total Payments Collected: <span className="font-bold">${totalPaymentsCollected.toFixed(2)}</span></p>
              <p>Documents with Payments: <span className="font-bold">{numberOfDocumentsWithPayments}</span></p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Payment Details</h3>
            {reportItems.map((item) => (
              <div key={item.documentId} className="mb-4 p-2 border border-gray-200 rounded">
                <div className="grid grid-cols-3 gap-2 mb-1 pb-1 border-b">
                  <div><strong>Type:</strong> {item.documentType}</div>
                  <div><strong>Doc #:</strong> {item.documentNumber}</div>
                  <div><strong>Date:</strong> {formatDateDisplay(item.documentDate)}</div>
                  <div className="col-span-2"><strong>Customer:</strong> {item.customerName}</div>
                  <div><strong>Doc Total:</strong> ${item.documentTotal.toFixed(2)}</div>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-1 border border-gray-300 font-semibold">Payment Date</th>
                      <th className="text-left p-1 border border-gray-300 font-semibold">Method</th>
                      <th className="text-right p-1 border border-gray-300 font-semibold">Amount</th>
                      <th className="text-left p-1 border border-gray-300 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="p-1 border border-gray-300">{formatDateDisplay(payment.date, true)}</td>
                        <td className="p-1 border border-gray-300">{payment.method}</td>
                        <td className="text-right p-1 border border-gray-300">${payment.amount.toFixed(2)}</td>
                        <td className="p-1 border border-gray-300">{payment.notes || ''}</td>
                      </tr>
                    ))}
                    <tr className="font-semibold bg-gray-50">
                        <td colSpan={2} className="text-right p-1 border border-gray-300">Total Paid for Document:</td>
                        <td className="text-right p-1 border border-gray-300">${item.totalPaidForDocument.toFixed(2)}</td>
                        <td className="p-1 border border-gray-300"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ))}
            {reportItems.length === 0 && (
                <p className="text-center text-gray-500 py-4">No payments found for this period.</p>
            )}
          </section>

          <footer className="text-center text-gray-500 pt-6 mt-6 border-t border-gray-300">
            <p>End of Report</p>
          </footer>
        </div>
      </div>
    );
  }
);

PrintablePaymentsReport.displayName = "PrintablePaymentsReport";
