
"use client";

import React from 'react';
import type { CustomerStatementReportData, CompanySettings } from '@/types';
import { format, isValid } from 'date-fns';

interface PrintableCustomerStatementProps {
  reportData: CustomerStatementReportData;
  companySettings: CompanySettings;
  logoUrl?: string;
}

export const PrintableCustomerStatement = React.forwardRef<HTMLDivElement, PrintableCustomerStatementProps>(
  ({ reportData, companySettings, logoUrl }, ref) => {
    
    const formatDate = (date: Date | string) => {
        if (!date) return 'N/A';
        const d = typeof date === 'string' ? new Date(date) : date;
        return isValid(d) ? format(d, "MM/dd/yyyy") : 'Invalid Date';
    };
    
    const { customer, startDate, endDate, openingBalance, transactions, closingBalance } = reportData;

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
              <h2 className="text-2xl font-bold text-gray-700">Customer Statement</h2>
              <p className="font-semibold">For Period:</p>
              <p>{formatDate(startDate)} - {formatDate(endDate)}</p>
              <p className="mt-1">Generated: {format(new Date(), "MM/dd/yyyy HH:mm")}</p>
            </div>
          </header>

          <section className="mb-6 p-3 border border-gray-300 rounded">
            <h3 className="text-lg font-semibold text-gray-700">Statement For:</h3>
            <p className="font-bold">{customer.companyName || `${customer.firstName} ${customer.lastName}`}</p>
            {customer.address && <p>{customer.address.line1}</p>}
            {customer.address && <p>{customer.address.city}, {customer.address.state} {customer.address.zip}</p>}
            <p>{customer.phone}</p>
          </section>

          <section>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">Date</th>
                  <th className="text-left p-1.5 border border-gray-300 font-semibold">Transaction</th>
                  <th className="text-right p-1.5 border border-gray-300 font-semibold">Charges</th>
                  <th className="text-right p-1.5 border border-gray-300 font-semibold">Payments</th>
                  <th className="text-right p-1.5 border border-gray-300 font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="font-semibold">
                    <td className="p-1.5 border border-gray-300">{formatDate(startDate)}</td>
                    <td colSpan={3} className="p-1.5 border border-gray-300">Opening Balance</td>
                    <td className="text-right p-1.5 border border-gray-300">${openingBalance.toFixed(2)}</td>
                </tr>
                {transactions.map((tx, index) => (
                  <tr key={index}>
                    <td className="p-1.5 border border-gray-300">{formatDate(tx.date)}</td>
                    <td className="p-1.5 border border-gray-300">{tx.transactionType}: {tx.documentNumber}</td>
                    <td className="text-right p-1.5 border border-gray-300">{tx.debit > 0 ? `$${tx.debit.toFixed(2)}` : ''}</td>
                    <td className="text-right p-1.5 border border-gray-300">{tx.credit > 0 ? `$${tx.credit.toFixed(2)}` : ''}</td>
                    <td className="text-right p-1.5 border border-gray-300">${tx.balance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={4} className="text-right p-1.5 border border-gray-300">Closing Balance:</td>
                  <td className="text-right p-1.5 border border-gray-300">${closingBalance.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
            {transactions.length === 0 && (
              <p className="text-center text-gray-500 py-4">No transactions found for this period.</p>
            )}
          </section>

          <footer className="text-center text-gray-500 pt-6 mt-6 border-t border-gray-300">
            <p>Please review your statement and contact us with any questions.</p>
          </footer>
        </div>
      </div>
    );
  }
);

PrintableCustomerStatement.displayName = "PrintableCustomerStatement";
