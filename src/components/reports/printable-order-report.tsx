
"use client";

import React from 'react';
import type { Order, CompanySettings } from '@/types';
import { format } from 'date-fns';

interface PrintableOrderReportProps {
  orders: Order[];
  companySettings: CompanySettings;
  startDate: Date;
  endDate: Date;
}

export const PrintableOrderReport: React.FC<PrintableOrderReportProps> = ({ orders, companySettings, startDate, endDate }) => {
  const formatDateDisplay = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "MM/dd/yyyy");
  };

  // Using local /public/logo.png
  const logoUrl = "/logo.png";
  const totalOrderAmount = orders.reduce((sum, ord) => sum + ord.total, 0);
  const numberOfOrders = orders.length;

  return (
    <div className="print-only p-8 bg-white text-black font-sans text-xs">
      <header className="grid grid-cols-2 gap-8 mb-6">
        <div>
          {logoUrl && (
            <div className="mb-2" style={{ width: '96px' }}>
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
          <h2 className="text-2xl font-bold text-gray-700">Order Report</h2>
          <p className="font-semibold">Date Range:</p>
          <p>{format(startDate, "MM/dd/yyyy")} - {format(endDate, "MM/dd/yyyy")}</p>
          <p className="mt-1">Generated: {format(new Date(), "MM/dd/yyyy HH:mm")}</p>
        </div>
      </header>

      <section className="mb-6 p-3 border border-gray-300 rounded">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <p>Total Order Amount: <span className="font-bold">${totalOrderAmount.toFixed(2)}</span></p>
          <p>Number of Orders: <span className="font-bold">{numberOfOrders}</span></p>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Order Details</h3>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-1.5 border border-gray-300 font-semibold">Order #</th>
              <th className="text-left p-1.5 border border-gray-300 font-semibold">Date</th>
              <th className="text-left p-1.5 border border-gray-300 font-semibold">Customer</th>
              <th className="text-right p-1.5 border border-gray-300 font-semibold">Amount</th>
              <th className="text-left p-1.5 border border-gray-300 font-semibold">Status</th>
              <th className="text-left p-1.5 border border-gray-300 font-semibold">Order State</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="p-1.5 border border-gray-300">{order.orderNumber}</td>
                <td className="p-1.5 border border-gray-300">{formatDateDisplay(order.date)}</td>
                <td className="p-1.5 border border-gray-300">{order.customerName || 'N/A'}</td>
                <td className="text-right p-1.5 border border-gray-300">${order.total.toFixed(2)}</td>
                <td className="p-1.5 border border-gray-300">{order.status}</td>
                <td className="p-1.5 border border-gray-300">{order.orderState}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr key="no-orders-row">
                <td colSpan={6} className="p-1.5 border border-gray-300 text-center text-gray-500">No orders found for this period.</td>
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
