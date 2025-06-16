
"use client";

import React from 'react';
import type { CompanySettings, CustomerInvoiceDetail } from '@/types';
import { format } from 'date-fns';

interface PrintableOutstandingInvoicesReportProps {
  reportData: CustomerInvoiceDetail[];
  companySettings: CompanySettings;
  reportTitle: string;
  logoUrl?: string;
}

export const PrintableOutstandingInvoicesReport = React.forwardRef<HTMLDivElement, PrintableOutstandingInvoicesReportProps>(
  ({ reportData, companySettings, reportTitle, logoUrl }, ref) => {
    const reportGeneratedDate = format(new Date(), "MM/dd/yyyy HH:mm");

    const groupedInvoices = reportData.reduce((acc, invoice) => {
      const customerKey = invoice.customerId || 'unknown_customer';
      if (!acc[customerKey]) {
        acc[customerKey] = {
          customerName: invoice.customerName || 'Unknown Customer',
          invoices: [],
          totalCustomerBalance: 0,
        };
      }
      acc[customerKey].invoices.push(invoice);
      acc[customerKey].totalCustomerBalance += invoice.balanceDue;
      return acc;
    }, {} as Record<string, { customerName: string; invoices: CustomerInvoiceDetail[]; totalCustomerBalance: number }>);

    const grandTotalOutstanding = reportData.reduce((sum, item) => sum + item.balanceDue, 0);

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
              <h2 className="text-2xl font-bold text-gray-700">{reportTitle}</h2>
              <p className="mt-1">Report Generated: {reportGeneratedDate}</p>
            </div>
          </header>

          {Object.keys(groupedInvoices).map(customerId => {
            const group = groupedInvoices[customerId];
            return (
              <section key={customerId} className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-2 bg-gray-100 p-1.5 border border-gray-300 rounded-t-md">
                  Customer: {group.customerName}
                </h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-1.5 border border-gray-300 font-semibold">Invoice #</th>
                      <th className="text-left p-1.5 border border-gray-300 font-semibold">PO #</th>
                      <th className="text-left p-1.5 border border-gray-300 font-semibold">Inv. Date</th>
                      <th className="text-left p-1.5 border border-gray-300 font-semibold">Due Date</th>
                      <th className="text-right p-1.5 border border-gray-300 font-semibold">Inv. Total</th>
                      <th className="text-right p-1.5 border border-gray-300 font-semibold">Paid</th>
                      <th className="text-right p-1.5 border border-gray-300 font-semibold">Balance Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.invoices.map((invoice) => (
                      <tr key={invoice.invoiceId}>
                        <td className="p-1.5 border border-gray-300">{invoice.invoiceNumber}</td>
                        <td className="p-1.5 border border-gray-300">{invoice.poNumber || 'N/A'}</td>
                        <td className="p-1.5 border border-gray-300">{format(new Date(invoice.invoiceDate), "MM/dd/yy")}</td>
                        <td className="p-1.5 border border-gray-300">{invoice.dueDate ? format(new Date(invoice.dueDate), "MM/dd/yy") : 'N/A'}</td>
                        <td className="text-right p-1.5 border border-gray-300">${invoice.invoiceTotal.toFixed(2)}</td>
                        <td className="text-right p-1.5 border border-gray-300">${invoice.amountPaid.toFixed(2)}</td>
                        <td className="text-right p-1.5 border border-gray-300 font-semibold">${invoice.balanceDue.toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr key={`${customerId}-summary`} className="bg-gray-50">
                      <td colSpan={6} className="text-right p-1.5 border border-gray-300 font-bold">Customer Total Outstanding:</td>
                      <td className="text-right p-1.5 border border-gray-300 font-bold">${group.totalCustomerBalance.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </section>
            );
          })}

          {reportData.length === 0 && (
             <p className="text-center text-gray-500 py-4">No outstanding invoices found for the selected criteria.</p>
          )}

          {Object.keys(groupedInvoices).length > 1 && (
            <section className="mt-6 pt-3 border-t-2 border-gray-500">
              <div className="text-right">
                <p className="text-lg font-bold">Grand Total Outstanding (All Displayed Customers): ${grandTotalOutstanding.toFixed(2)}</p>
              </div>
            </section>
          )}


          <footer className="text-center text-gray-500 pt-6 mt-6 border-t border-gray-300">
            <p>End of Report</p>
          </footer>
        </div>
      </div>
    );
  }
);
PrintableOutstandingInvoicesReport.displayName = "PrintableOutstandingInvoicesReport";
export { PrintableOutstandingInvoicesReport };

    