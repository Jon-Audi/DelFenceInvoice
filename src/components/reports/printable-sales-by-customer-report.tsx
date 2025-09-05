
"use client";

import React from 'react';
import type { SalesByCustomerReportItem, CompanySettings } from '@/types';
import { format, isValid } from 'date-fns';

interface PrintableSalesByCustomerReportProps {
  reportItems: SalesByCustomerReportItem[];
  companySettings: CompanySettings;
  startDate: Date;
  endDate: Date;
  logoUrl?: string;
}

export const PrintableSalesByCustomerReport = React.forwardRef<HTMLDivElement, PrintableSalesByCustomerReportProps>(
  ({ reportItems, companySettings, startDate, endDate, logoUrl }, ref) => {
    
    const grandTotalSales = reportItems.reduce((sum, item) => sum + item.totalSales, 0);

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
              <h2 className="text-2xl font-bold text-gray-700">Sales by Customer Report</h2>
              <p className="font-semibold">Date Range:</p>
              <p>{isValid(startDate) ? format(startDate, "MM/dd/yyyy") : "N/A"} - {isValid(endDate) ? format(endDate, "MM/dd/yyyy") : "N/A"}</p>
              <p className="mt-1">Generated: {format(new Date(), "MM/dd/yyyy HH:mm")}</p>
            </div>
          </header>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Sales Summary by Customer</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">Customer Name</th>
                  <th className="text-right p-1.5 border border-gray-300 font-semibold"># of Invoices</th>
                  <th className="text-right p-1.5 border border-gray-300 font-semibold">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {reportItems.map((item) => (
                  <tr key={item.customerId}>
                    <td className="p-1.5 border border-gray-300">{item.customerName}</td>
                    <td className="text-right p-1.5 border border-gray-300">{item.invoiceCount}</td>
                    <td className="text-right p-1.5 border border-gray-300">${item.totalSales.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={2} className="text-right p-1.5 border border-gray-300">Grand Total:</td>
                  <td className="text-right p-1.5 border border-gray-300">${grandTotalSales.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            {reportItems.length === 0 && (
                <p className="text-center text-gray-500 py-4">No sales found for this period.</p>
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

PrintableSalesByCustomerReport.displayName = "PrintableSalesByCustomerReport";
