
"use client";

import React from 'react';
import type { Invoice, CompanySettings } from '@/types';
import Image from 'next/image';
import { format } from 'date-fns';

interface PrintableSalesReportProps {
  invoices: Invoice[];
  companySettings: CompanySettings;
  startDate: Date;
  endDate: Date;
}

const transformGsUrlToHttps = (url: string | undefined): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith('https://') || url.startsWith('http://')) return url;
  if (url.startsWith('gs://')) {
    try {
      const noPrefix = url.substring(5);
      const parts = noPrefix.split('/');
      const bucket = parts.shift();
      if (!bucket) return undefined;
      const objectPath = parts.join('/');
      if (!objectPath) return undefined;
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
    } catch (error) {
      console.error("Error transforming gs:// URL:", url, error);
      return undefined;
    }
  }
  return url;
};

export const PrintableSalesReport: React.FC<PrintableSalesReportProps> = ({ invoices, companySettings, startDate, endDate }) => {
  const formatDateDisplay = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "MM/dd/yyyy");
  };

  const logoHttpUrl = transformGsUrlToHttps(companySettings.logoUrl);
  const totalSalesAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const numberOfInvoices = invoices.length;

  return (
    <div className="print-only p-8 bg-white text-black font-sans text-xs">
      <header className="grid grid-cols-2 gap-8 mb-6">
        <div>
          {logoHttpUrl && (
            <div className="mb-2 w-24 h-auto relative">
              <Image 
                src={logoHttpUrl} 
                alt={`${companySettings.companyName || 'Company'} Logo`}
                width={96} 
                height={48} 
                style={{ objectFit: 'contain' }}
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
          <h2 className="text-2xl font-bold text-gray-700">Sales Report</h2>
          <p className="font-semibold">Date Range:</p>
          <p>{format(startDate, "MM/dd/yyyy")} - {format(endDate, "MM/dd/yyyy")}</p>
          <p className="mt-1">Generated: {format(new Date(), "MM/dd/yyyy HH:mm")}</p>
        </div>
      </header>

      <section className="mb-6 p-3 border border-gray-300 rounded">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <p>Total Sales Amount: <span className="font-bold">${totalSalesAmount.toFixed(2)}</span></p>
          <p>Number of Invoices: <span className="font-bold">{numberOfInvoices}</span></p>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Invoice Details</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-1.5 border border-gray-300 font-semibold">Invoice #</th>
              <th className="text-left p-1.5 border border-gray-300 font-semibold">Date</th>
              <th className="text-left p-1.5 border border-gray-300 font-semibold">Customer</th>
              <th className="text-right p-1.5 border border-gray-300 font-semibold">Amount</th>
              <th className="text-left p-1.5 border border-gray-300 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="p-1.5 border border-gray-300">{invoice.invoiceNumber}</td>
                <td className="p-1.5 border border-gray-300">{formatDateDisplay(invoice.date)}</td>
                <td className="p-1.5 border border-gray-300">{invoice.customerName || 'N/A'}</td>
                <td className="text-right p-1.5 border border-gray-300">${invoice.total.toFixed(2)}</td>
                <td className="p-1.5 border border-gray-300">{invoice.status}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="p-1.5 border border-gray-300 text-center text-gray-500">No invoices found for this period.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <footer className="text-center text-gray-500 pt-6 mt-6 border-t border-gray-300">
        <p>End of Report</p>
      </footer>
    </div>
  );
};
