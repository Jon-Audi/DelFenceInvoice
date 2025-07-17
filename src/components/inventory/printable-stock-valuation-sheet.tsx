
"use client";

import React from 'react';
import type { Product } from '@/types';

interface PrintableStockValuationSheetProps {
  products: Product[];
}

export const PrintableStockValuationSheet = React.forwardRef<HTMLDivElement, PrintableStockValuationSheetProps>(
  ({ products }, ref) => {
    
    // Group products by category
    const groupedProducts = products.reduce((acc, product) => {
        const category = product.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(product);
        return acc;
    }, {} as Record<string, Product[]>);

    let grandTotalCost = 0;
    let grandTotalPrice = 0;

    return (
      <div ref={ref}>
        <h1>Stock Valuation Report</h1>
        <p>Date: {new Date().toLocaleDateString()}</p>
        
        {Object.entries(groupedProducts).map(([category, productsInCategory]) => {
            const categoryTotalCost = productsInCategory.reduce((sum, p) => sum + (p.cost || 0) * (p.quantityInStock || 0), 0);
            const categoryTotalPrice = productsInCategory.reduce((sum, p) => sum + (p.price || 0) * (p.quantityInStock || 0), 0);
            
            grandTotalCost += categoryTotalCost;
            grandTotalPrice += categoryTotalPrice;

            return (
                <section key={category}>
                    <h2>{category}</h2>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', width: '40%' }}>Product Name</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Qty in Stock</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Unit Cost</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Unit Price</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Total Cost</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Total Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productsInCategory.map((product) => {
                            const totalCost = (product.cost || 0) * (product.quantityInStock || 0);
                            const totalPrice = (product.price || 0) * (product.quantityInStock || 0);
                            return (
                                <tr key={product.id}>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{product.name}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>{product.quantityInStock || 0}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${(product.cost || 0).toFixed(2)}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${(product.price || 0).toFixed(2)}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${totalCost.toFixed(2)}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${totalPrice.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr style={{ fontWeight: 'bold' }}>
                            <td colSpan={4} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>Category Totals:</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${categoryTotalCost.toFixed(2)}</td>
                            <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'right' }}>${categoryTotalPrice.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                    </table>
                </section>
            );
        })}
        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '2px solid black', textAlign: 'right' }}>
            <h2>Grand Totals</h2>
            <p style={{ fontSize: '1.1em' }}><strong>Total Stock Cost Value:</strong> ${grandTotalCost.toFixed(2)}</p>
            <p style={{ fontSize: '1.1em' }}><strong>Total Stock Price Value:</strong> ${grandTotalPrice.toFixed(2)}</p>
        </div>
      </div>
    );
  }
);

PrintableStockValuationSheet.displayName = "PrintableStockValuationSheet";
