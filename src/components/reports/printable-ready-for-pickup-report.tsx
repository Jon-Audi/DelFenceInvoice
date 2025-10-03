
"use client";

import React from 'react';
import type { ReadyForPickupReportItem, CompanySettings } from '@/types';
import { format, isValid } from 'date-fns';

interface PrintableReadyForPickupReportProps {
  reportItems: ReadyForPickupReportItem[];
  companySettings: CompanySettings;
  logoUrl?: string;
}

export const PrintableReadyForPickupReport = React.forwardRef<HTMLDivElement, PrintableReadyForPickupReportProps>(
  ({ reportItems, companySettings, logoUrl }, ref) => {
    
    const grandTotal = reportItems.reduce((sum, item) => sum + item.total, 0);

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
              <h2 className="text-2xl font-bold text-gray-700">Ready for Pickup Report</h2>
              <p className="mt-1">Generated: {format(new Date(), "MM/dd/yyyy HH:mm")}</p>
            </div>
          </header>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Items Ready for Pickup</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">Type</th>
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">Document #</th>
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">Customer</th>
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">Ready Date</th>
                  <th className="text-right p-1.5 border border-gray-300 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {reportItems.map((item) => (
                  <tr key={item.documentId}>
                    <td className="p-1.5 border border-gray-300">{item.documentType}</td>
                    <td className="p-1.5 border border-gray-300">{item.documentNumber}</td>
                    <td className="p-1.5 border border-gray-300">{item.customerName}</td>
                    <td className="p-1.5 border border-gray-300">{item.readyForPickUpDate ? format(new Date(item.readyForPickUpDate), 'P') : 'N/A'}</td>
                    <td className="text-right p-1.5 border border-gray-300">${item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={4} className="text-right p-1.5 border border-gray-300">Total Value:</td>
                  <td className="text-right p-1.5 border border-gray-300">${grandTotal.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            {reportItems.length === 0 && (
                <p className="text-center text-gray-500 py-4">No items are currently marked as "Ready for pick up".</p>
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

PrintableReadyForPickupReport.displayName = "PrintableReadyForPickupReport";
