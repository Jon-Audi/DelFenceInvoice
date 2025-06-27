
"use client";

import React from 'react';
import type { WeeklySummaryReportItem, CompanySettings } from '@/types';
import { format, isValid } from 'date-fns';

interface PrintableWeeklySummaryReportProps {
  reportItems: WeeklySummaryReportItem[];
  companySettings: CompanySettings;
  startDate: Date;
  endDate: Date;
  logoUrl?: string;
}

export const PrintableWeeklySummaryReport = React.forwardRef<HTMLDivElement, PrintableWeeklySummaryReportProps>(
  ({ reportItems, companySettings, startDate, endDate, logoUrl }, ref) => {
    
    const grandTotalPayments = reportItems.reduce((sum, item) => sum + item.totalPayments, 0);
    const grandTotalOrders = reportItems.reduce((sum, item) => sum + item.totalOrders, 0);
    const grandTotalInvoices = reportItems.reduce((sum, item) => sum + item.totalInvoices, 0);

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
              <h2 className="text-2xl font-bold text-gray-700">Weekly Summary Report</h2>
              <p className="font-semibold">Date Range:</p>
              <p>{isValid(startDate) ? format(startDate, "MM/dd/yyyy") : "N/A"} - {isValid(endDate) ? format(endDate, "MM/dd/yyyy") : "N/A"}</p>
              <p className="mt-1">Generated: {format(new Date(), "MM/dd/yyyy HH:mm")}</p>
            </div>
          </header>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Weekly Breakdown</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">Week Range</th>
                  <th className="text-right p-1.5 border border-gray-300 font-semibold">Payments Collected</th>
                  <th className="text-right p-1.5 border border-gray-300 font-semibold">Total Orders Value</th>
                  <th className="text-right p-1.5 border border-gray-300 font-semibold">Total Invoices Value</th>
                </tr>
              </thead>
              <tbody>
                {reportItems.map((item) => (
                  <tr key={item.weekIdentifier}>
                    <td className="p-1.5 border border-gray-300">{format(new Date(item.weekStartDate), "MMM d")} - {format(new Date(item.weekEndDate), "MMM d, yyyy")}</td>
                    <td className="text-right p-1.5 border border-gray-300">${item.totalPayments.toFixed(2)}</td>
                    <td className="text-right p-1.5 border border-gray-300">${item.totalOrders.toFixed(2)}</td>
                    <td className="text-right p-1.5 border border-gray-300">${item.totalInvoices.toFixed(2)}</td>
                  </tr>
                ))}
                {reportItems.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-1.5 border border-gray-300 text-center text-gray-500">No data found for this period.</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                    <td className="text-right p-1.5 border border-gray-300">Grand Totals:</td>
                    <td className="text-right p-1.5 border border-gray-300">${grandTotalPayments.toFixed(2)}</td>
                    <td className="text-right p-1.5 border border-gray-300">${grandTotalOrders.toFixed(2)}</td>
                    <td className="text-right p-1.5 border border-gray-300">${grandTotalInvoices.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <footer className="text-center text-gray-500 pt-6 mt-6 border-t border-gray-300">
            <p>End of Report</p>
          </footer>
        </div>
      </div>
    );
  }
);

PrintableWeeklySummaryReport.displayName = "PrintableWeeklySummaryReport";
