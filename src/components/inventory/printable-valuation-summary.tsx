"use client";

import React from 'react';
import type { Product } from '@/types';

interface PrintableValuationSummaryProps {
  products: Product[];
}

export const PrintableValuationSummary = React.forwardRef<HTMLDivElement, PrintableValuationSummaryProps>(
  ({ products }, ref) => {
    
    const groupedProducts = products.reduce((acc, product) => {
        const category = product.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(product);
        return acc;
    }, {} as Record<string, Product[]>);

    const categoryTotals = Object.entries(groupedProducts).map(([category, productsInCategory]) => {
        const totalCost = productsInCategory.reduce((sum, p) => sum + (p.cost || 0) * (p.quantityInStock || 0), 0);
        const totalPrice = productsInCategory.reduce((sum, p) => sum + (p.price || 0) * (p.quantityInStock || 0), 0);
        return { category, totalCost, totalPrice };
    });

    const grandTotalCost = categoryTotals.reduce((sum, cat) => sum + cat.totalCost, 0);
    const grandTotalPrice = categoryTotals.reduce((sum, cat) => sum + cat.totalPrice, 0);

    return (
      <div ref={ref}>
        <h1>Stock Valuation Summary</h1>
        <p>Date: {new Date().toLocaleDateString()}</p>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>Category</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Total Cost Value</th>
              <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Total Price Value</th>
            </tr>
          </thead>
          <tbody>
            {categoryTotals.map(({ category, totalCost, totalPrice }) => (
              <tr key={category}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{category}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${totalCost.toFixed(2)}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${totalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ fontWeight: 'bold', backgroundColor: '#f2f2f2' }}>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Grand Totals:</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${grandTotalCost.toFixed(2)}</td>
              <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${grandTotalPrice.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }
);

PrintableValuationSummary.displayName = "PrintableValuationSummary";
