
"use client";

import React from 'react';
import type { CompanySettings } from '@/types';
import Image from 'next/image';
import { format } from 'date-fns';

interface CustomerBalanceData {
  customerId: string;
  customerName: string;
  totalOutstandingBalance: number;
}

interface PrintableCustomerBalanceReportProps {
  customerBalances: CustomerBalanceData[];
  companySettings: CompanySettings;
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

export const PrintableCustomerBalanceReport: React.FC<PrintableCustomerBalanceReportProps> = ({ customerBalances, companySettings }) => {
  const logoHttpUrl = transformGsUrlToHttps(companySettings.logoUrl);
  const reportGeneratedDate = format(new Date(), "MM/dd/yyyy HH:mm");
  const grandTotalOutstanding = customerBalances.reduce((sum, item) => sum + item.totalOutstandingBalance, 0);

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
          <h2 className="text-2xl font-bold text-gray-700">Customer Outstanding Balances</h2>
          <p className="mt-1">Report Generated: {reportGeneratedDate}</p>
        </div>
      </header>

      <section className="mb-6 p-3 border border-gray-300 rounded">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Summary</h3>
        <p>Total Outstanding Balance (All Customers): <span className="font-bold">${grandTotalOutstanding.toFixed(2)}</span></p>
        <p>Number of Customers with Balances: <span className="font-bold">{customerBalances.length}</span></p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Details</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-1.5 border border-gray-300 font-semibold">Customer Name</th>
              <th className="text-right p-1.5 border border-gray-300 font-semibold">Total Outstanding Balance</th>
            </tr>
          </thead>
          <tbody>
            {customerBalances.map((balance) => (
              <tr key={balance.customerId}>
                <td className="p-1.5 border border-gray-300">{balance.customerName}</td>
                <td className="text-right p-1.5 border border-gray-300">${balance.totalOutstandingBalance.toFixed(2)}</td>
              </tr>
            ))}
            {customerBalances.length === 0 && (
              <tr>
                <td colSpan={2} className="p-1.5 border border-gray-300 text-center text-gray-500">No customers with outstanding balances found.</td>
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

    