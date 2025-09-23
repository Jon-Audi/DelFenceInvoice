
"use client";

import React from 'react';
import type { ProductionHistoryItem, CompanySettings } from '@/types';
import { format, isValid } from 'date-fns';

interface PrintableProductionReportProps {
  reportItems: ProductionHistoryItem[];
  companySettings: CompanySettings;
  startDate: Date;
  endDate: Date;
  logoUrl?: string;
}

const formatElapsedTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const PrintableProductionReport = React.forwardRef<HTMLDivElement, PrintableProductionReportProps>(
  ({ reportItems, companySettings, startDate, endDate, logoUrl }, ref) => {
    
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
              <h2 className="text-2xl font-bold text-gray-700">Production History Report</h2>
              <p className="font-semibold">Date Range:</p>
              <p>{isValid(startDate) ? format(startDate, "MM/dd/yyyy") : "N/A"} - {isValid(endDate) ? format(endDate, "MM/dd/yyyy") : "N/A"}</p>
              <p className="mt-1">Generated: {format(new Date(), "MM/dd/yyyy HH:mm")}</p>
            </div>
          </header>

          <section className="mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Completed Production Tasks</h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">Task Name</th>
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">PO # / Job</th>
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">Completed At</th>
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">Time Elapsed</th>
                  <th className="text-right p-1.5 border border-gray-300 font-semibold">Cost</th>
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">Material Amt.</th>
                </tr>
              </thead>
              <tbody>
                {reportItems.map((item) => (
                  <tr key={item.id}>
                    <td className="p-1.5 border border-gray-300">{item.taskName}</td>
                    <td className="p-1.5 border border-gray-300">{item.poNumber || 'N/A'}</td>
                    <td className="p-1.5 border border-gray-300">{format(new Date(item.completedAt), 'P p')}</td>
                    <td className="p-1.5 border border-gray-300">{formatElapsedTime(item.elapsedSeconds)}</td>
                    <td className="text-right p-1.5 border border-gray-300">{item.cost ? `$${item.cost.toFixed(2)}` : 'N/A'}</td>
                    <td className="p-1.5 border border-gray-300">{item.materialAmount || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reportItems.length === 0 && (
                <p className="text-center text-gray-500 py-4">No production history found for this period.</p>
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

PrintableProductionReport.displayName = "PrintableProductionReport";
