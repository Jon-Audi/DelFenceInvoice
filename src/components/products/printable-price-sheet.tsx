
"use client";

import React from 'react';
import type { Product, CompanySettings } from '@/types';

interface PrintablePriceSheetProps {
  groupedProducts: Map<string, Product[]>;
  companySettings: CompanySettings | null;
  logoUrl?: string; 
  customerName?: string;
}

export const PrintablePriceSheet = React.forwardRef<HTMLDivElement, PrintablePriceSheetProps>(
  ({ groupedProducts, companySettings, logoUrl, customerName }, ref) => {
    if (!groupedProducts || groupedProducts.size === 0 || !companySettings) {
      return (
        <div ref={ref} className="print-only-container">
          <div className="print-only p-8 bg-white text-black font-sans text-xs">
            <p>No products to display or company settings missing.</p>
          </div>
        </div>
      );
    }

    const currentDate = new Date().toLocaleDateString();
    const reportTitle = customerName ? `Price Sheet for ${customerName}` : 'Price Sheet';

    return (
      <div ref={ref} className="print-only-container">
        <div className="print-only p-8 bg-white text-black font-sans text-xs">
          <div className="grid grid-cols-2 gap-8 mb-10">
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
              <h1 className="text-xl font-bold text-gray-800 mb-1">{companySettings.companyName || 'Your Company'}</h1>
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
              <h2 className="text-2xl font-bold text-gray-700">{reportTitle}</h2>
              <p className="text-sm"><span className="font-semibold">Date:</span> {currentDate}</p>
            </div>
          </div>

          {Array.from(groupedProducts.entries()).map(([category, productsInCategory]) => (
            <div key={category} className="mb-6 last:mb-0" style={{ pageBreakInside: 'avoid' }}>
              <h3 className="text-lg font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-300">{category}</h3>
              {productsInCategory.length > 0 ? (
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-1.5 border border-gray-300 font-semibold text-gray-600 w-3/5">Product Name</th>
                      <th className="text-left p-1.5 border border-gray-300 font-semibold text-gray-600 w-1/5">Unit</th>
                      <th className="text-right p-1.5 border border-gray-300 font-semibold text-gray-600 w-1/5">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsInCategory.map((product) => (
                      <tr key={product.id} style={{ pageBreakInside: 'avoid' }}>
                        <td className="p-1.5 border border-gray-300">{product.name}</td>
                        <td className="p-1.5 border border-gray-300">{product.unit}</td>
                        <td className="text-right p-1.5 border border-gray-300">${product.price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-gray-500">No products in this category.</p>
              )}
            </div>
          ))}

          <footer className="text-center text-gray-500 pt-6 mt-6 border-t border-gray-300">
            <p>Prices subject to change without notice.</p>
            <p>{companySettings.companyName}</p>
          </footer>
        </div>
      </div>
    );
  }
);

PrintablePriceSheet.displayName = "PrintablePriceSheet";
