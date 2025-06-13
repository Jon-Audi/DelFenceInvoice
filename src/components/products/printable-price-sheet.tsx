
"use client";

import React from 'react';
import type { Product, CompanySettings } from '@/types';

interface PrintablePriceSheetProps {
  groupedProducts: Map<string, Product[]>;
  companySettings: CompanySettings | null;
}

export const PrintablePriceSheet: React.FC<PrintablePriceSheetProps> = ({ groupedProducts, companySettings }) => {
  if (!groupedProducts || groupedProducts.size === 0 || !companySettings) {
    return (
      <div className="print-only p-8 bg-white text-black font-sans">
        <p>No products to display or company settings missing.</p>
      </div>
    );
  }

  const logoUrl = "/Logo.png";
  const currentDate = new Date().toLocaleDateString();

  return (
    <div className="print-only p-8 bg-white text-black font-sans">
      <div className="grid grid-cols-2 gap-8 mb-10">
        <div>
          {logoUrl && (
             <div className="mb-4" style={{ width: '128px' }}>
              <img
                src={logoUrl}
                alt={`${companySettings.companyName || 'Company'} Logo`}
                style={{ display: 'block', maxWidth: '100%', height: 'auto', objectFit: 'contain' }}
                data-ai-hint="company logo"
              />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{companySettings.companyName || 'Your Company'}</h1>
          <p className="text-xs">{companySettings.addressLine1 || ''}</p>
          {companySettings.addressLine2 && <p className="text-xs">{companySettings.addressLine2}</p>}
          <p className="text-xs">
            {companySettings.city || ''}{companySettings.city && (companySettings.state || companySettings.zipCode) ? ', ' : ''}
            {companySettings.state || ''} {companySettings.zipCode || ''}
          </p>
          {companySettings.phone && <p className="text-xs">Phone: {companySettings.phone}</p>}
          {companySettings.email && <p className="text-xs">Email: {companySettings.email}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-3xl font-bold text-gray-700 mb-2">PRICE SHEET</h2>
          <p className="text-sm"><span className="font-semibold">Date:</span> {currentDate}</p>
        </div>
      </div>

      {Array.from(groupedProducts.entries()).map(([category, productsInCategory]) => (
        <div key={category} className="mb-6 last:mb-0">
          <h3 className="text-xl font-semibold text-gray-700 mb-3 pb-1 border-b border-gray-400">{category}</h3>
          {productsInCategory.length > 0 ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 border border-gray-300 font-semibold text-gray-600 w-3/5">Product Name</th>
                  <th className="text-left p-2 border border-gray-300 font-semibold text-gray-600 w-1/5">Unit</th>
                  <th className="text-right p-2 border border-gray-300 font-semibold text-gray-600 w-1/5">Price</th>
                </tr>
              </thead>
              <tbody>
                {productsInCategory.map((product) => (
                  <tr key={product.id}>
                    <td className="p-2 border border-gray-300">{product.name}</td>
                    <td className="p-2 border border-gray-300">{product.unit}</td>
                    <td className="text-right p-2 border border-gray-300">${product.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-500">No products in this category.</p>
          )}
        </div>
      ))}

      <div className="text-center text-xs text-gray-500 pt-8 mt-8 border-t border-gray-300">
        <p>Prices subject to change without notice.</p>
        <p>{companySettings.companyName}</p>
      </div>
    </div>
  );
};
